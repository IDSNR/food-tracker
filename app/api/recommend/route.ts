import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';
import { defaultFoodCatalog } from '@/lib/foodCatalog';

const nutrientKeys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'vitamin_a', 'vitamin_c', 'vitamin_d', 'vitamin_e', 'vitamin_k', 'calcium', 'iron', 'magnesium', 'zinc', 'potassium', 'vitamin_b12', 'folate'];

function sumNutrients(entries: Array<Record<string, number>>) {
  const totals: Record<string, number> = {};
  for (const entry of entries) {
    for (const key of nutrientKeys) {
      totals[key] = (totals[key] ?? 0) + Number(entry?.[key] ?? 0);
    }
  }
  return totals;
}

function getModelCost(model: string, inputTokens: number, outputTokens: number) {
  const normalized = model.toLowerCase();
  if (normalized.includes('gpt-4o-mini') || normalized.includes('gpt-4o')) {
    return ((inputTokens / 1_000_000) * 0.15) + ((outputTokens / 1_000_000) * 0.6);
  }
  if (normalized.includes('claude')) {
    return ((inputTokens / 1_000_000) * 0.8) + ((outputTokens / 1_000_000) * 2.4);
  }
  return ((inputTokens / 1_000_000) * 0.4) + ((outputTokens / 1_000_000) * 1.2);
}

async function logOpenRouterRequest(userId: number, requestId: string, inputTokens: number, outputTokens: number, model: string, realCostUsd?: number) {
  const reportedCostUsd = Number(realCostUsd ?? 0);
  const costUsd = Number.isFinite(reportedCostUsd) && reportedCostUsd > 0 ? reportedCostUsd : getModelCost(model, inputTokens, outputTokens);
  await pool.query(
    `INSERT INTO openrouter_requests (user_id, request_id, input_tokens, output_tokens, cost_usd)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, requestId, inputTokens, outputTokens, costUsd],
  );
  return costUsd;
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const userId = Number(url.searchParams.get('userId') ?? '1') || 1;
    const selectedDate = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
    const askAi = url.searchParams.get('askAi') === 'true';

    const feed = await pool.query(
      'SELECT nutrients FROM food_logs WHERE user_id = $1 AND created_at::date = $2::date ORDER BY created_at DESC',
      [userId, selectedDate],
    );

    const todayTotals = sumNutrients(feed.rows.map((row) => row.nutrients ?? {}));
    const goals = await pool.query(
      'SELECT nutrient_key, target_amount FROM goals WHERE user_id = $1',
      [userId],
    );

    const targetMap = Object.fromEntries(goals.rows.map((row) => [row.nutrient_key, Number(row.target_amount ?? 0)]));
    const deficits = Object.fromEntries(
      nutrientKeys.map((key) => {
        const goal = targetMap[key] ?? 0;
        const actual = todayTotals[key] ?? 0;
        return [key, goal > 0 ? Math.max(goal - actual, 0) : 0];
      }),
    );

    const catalogRows = await pool.query('SELECT * FROM food_catalog ORDER BY name ASC');
    const catalog = catalogRows.rows.length
      ? catalogRows.rows.map((row) => ({ name: row.name, portion: row.portion, category: row.category, nutrients: row.nutrients ?? {} }))
      : defaultFoodCatalog;

    const scored = catalog
      .map((item) => {
        let score = 0;
        for (const key of nutrientKeys) {
          const value = Number(item.nutrients?.[key] ?? 0);
          const deficit = deficits[key] ?? 0;
          if (deficit > 0 && value > 0) {
            score += Math.min(value / Math.max(deficit, 1), 5) * 2;
          }
          if (key === 'protein' && value > 0) score += value * 0.2;
          if (key === 'iron' && value > 0) score += value * 0.7;
        }
        return { item, score };
      })
      .sort((left, right) => right.score - left.score)
      .filter((entry) => entry.score > 0);

    const fallbackChoice = catalog[0] ?? { name: 'Banana', portion: '1 medium', category: 'Fruit', nutrients: { calories: 105 } };
    const chosen = scored[0] ?? { item: fallbackChoice, score: 1 };

    if (askAi) {
      const model = process.env.OPENROUTER_TEXT_MODEL ?? 'openai/gpt-4o-mini';
      const promptItems = catalog.slice(0, 12).map((item) => `${item.name} (${item.portion}) - ${JSON.stringify(item.nutrients)}`).join('\n');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [{
            role: 'system',
            content: 'Return JSON only with {name, portion, category, reason, nutrients}. Choose the single best food for the user based on the remaining nutrient gaps and the catalog list. Use the exact nutrition values present in the catalog items.',
          }, {
            role: 'user',
            content: `User goals are still missing: ${JSON.stringify(deficits)}. Available food items:\n${promptItems}`,
          }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = typeof data.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content : '{}';
        const parsed = JSON.parse(content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
        const aiChoice = {
          name: String(parsed.name ?? chosen.item.name),
          portion: String(parsed.portion ?? chosen.item.portion),
          category: String(parsed.category ?? chosen.item.category),
          nutrients: typeof parsed.nutrients === 'object' ? parsed.nutrients : chosen.item.nutrients,
          reason: String(parsed.reason ?? 'AI selected this based on your nutrient gaps.'),
        };

        const inputTokens = Number(data.usage?.prompt_tokens ?? 0) || Math.max(1, Math.ceil((promptItems.length + JSON.stringify(deficits).length) / 4));
        const outputTokens = Number(data.usage?.completion_tokens ?? 0) || Math.max(1, Math.ceil((String(data.choices?.[0]?.message?.content ?? '').length + JSON.stringify(parsed).length) / 4));
        const requestId = String(data.id ?? `or-rec-${Date.now()}`);
        const reportedCostUsd = Number(data.usage?.cost ?? 0);
        const costUsd = await logOpenRouterRequest(userId, requestId, inputTokens, outputTokens, model, reportedCostUsd);

        return NextResponse.json({
          ok: true,
          askAi: true,
          costUsd,
          recommendations: scored.slice(0, 4).map(({ item, score }) => ({ name: item.name, portion: item.portion, category: item.category, score, nutrients: item.nutrients })),
          chosen: aiChoice,
        });
      }
    }

    const reason = `This option best matches your remaining nutrient balance for ${selectedDate}.`;

    return NextResponse.json({
      ok: true,
      askAi: false,
      recommendations: scored.slice(0, 4).map(({ item, score }) => ({
        name: item.name,
        portion: item.portion,
        category: item.category,
        score,
        nutrients: item.nutrients,
      })),
      chosen: {
        name: chosen.item.name,
        portion: chosen.item.portion,
        category: chosen.item.category,
        nutrients: chosen.item.nutrients,
        reason,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to generate recommendations.' }, { status: 500 });
  }
}
