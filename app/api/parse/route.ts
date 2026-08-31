import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';

const nutrientKeys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'vitamin_a', 'vitamin_c', 'vitamin_d', 'vitamin_e', 'vitamin_k', 'calcium', 'iron', 'magnesium', 'zinc', 'potassium', 'vitamin_b12', 'folate'];
const nutrientUnits: Record<string, string> = { calories: 'kcal', sodium: 'mg', vitamin_a: 'mcg', vitamin_d: 'mcg', vitamin_k: 'mcg', calcium: 'mg', iron: 'mg', magnesium: 'mg', zinc: 'mg', potassium: 'mg', vitamin_b12: 'mcg', folate: 'mcg' };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = Number(body?.userId ?? '1') || 1;
    const input = String(body?.text ?? '').trim();
    const image = typeof body?.image === 'string' ? body.image : '';
    if (!input && !image) return NextResponse.json({ ok: false, error: 'Describe a meal or choose a food photo first.' }, { status: 400 });
    if (image && (!/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > 10_000_000)) {
      return NextResponse.json({ ok: false, error: 'Use a JPEG, PNG, or WebP image smaller than 6 MB.' }, { status: 400 });
    }
    await ensureSchema();
    const hash = createHash('sha256').update(`${input.toLowerCase().replace(/\s+/g, ' ')}|${image}`).digest('hex');
    const cached = await pool.query('SELECT result FROM nutrient_cache WHERE input_hash = $1', [hash]);
    if (cached.rowCount) return NextResponse.json({ ok: true, result: cached.rows[0].result, cached: true });
    if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ ok: false, error: 'OPENROUTER_API_KEY is not configured.' }, { status: 503 });

    const model = image ? (process.env.OPENROUTER_VISION_MODEL ?? 'deepseek/deepseek-v4') : (process.env.OPENROUTER_TEXT_MODEL ?? 'openai/gpt-4o-mini');
    const userContent = image
      ? [{ type: 'text', text: input || 'Identify this meal and estimate its full nutrition.' }, { type: 'image_url', image_url: { url: image } }]
      : input;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, ...(image ? { provider: { allow_fallbacks: true, data_collection: 'allow' } } : { response_format: { type: 'json_object' } }),
        messages: [{ role: 'system', content: `Return JSON only with {name, portion, confidence, items, nutrients, units}. items is an array of each identified food with {name, portion, confidence, nutrients}. The top-level nutrients object must contain numeric values for every key: ${nutrientKeys.join(', ')}. Use grams for protein, carbs, fat, fiber, and sugar; kcal for calories; mg or mcg as appropriate. The top-level values must equal the whole meal total. Use 0 when unknown. For photos, state uncertainty in confidence and portion.` }, { role: 'user', content: userContent }] }),
    });
    const responseBody = await response.text();
    if (!response.ok) {
      let providerMessage = responseBody;
      try { providerMessage = JSON.parse(responseBody).error?.message ?? providerMessage; } catch { }
      throw new Error(`OpenRouter returned ${response.status}: ${providerMessage}`);
    }
    const data = JSON.parse(responseBody);
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const jsonContent = typeof content === 'string' ? content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '') : content;
    const result = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
    if (!result.name || !result.nutrients || typeof result.nutrients !== 'object') throw new Error('AI returned an invalid nutrition result.');
    result.nutrients = Object.fromEntries(nutrientKeys.map((key) => [key, Number(result.nutrients[key]) || 0]));
    result.units = Object.fromEntries(nutrientKeys.map((key) => [key, nutrientUnits[key] ?? 'g']));
    result.items = Array.isArray(result.items) ? result.items : [{ name: result.name, portion: result.portion ?? '1 serving', confidence: result.confidence ?? 'medium', nutrients: result.nutrients }];

    const inputTokens = Number(data.usage?.prompt_tokens ?? 0) || Math.max(1, Math.ceil((input.length + (image ? image.length : 0) + JSON.stringify(result).length) / 4));
    const outputTokens = Number(data.usage?.completion_tokens ?? 0) || Math.max(1, Math.ceil((String(content).length + JSON.stringify(result).length) / 4));
    const requestId = String(data.id ?? `or-${Date.now()}`);
    const reportedCostUsd = Number(data.usage?.cost ?? 0);
    const modelRate = model.includes('gpt-4o-mini') ? { prompt: 0.15, completion: 0.6 } : { prompt: 0.4, completion: 1.2 };
    const fallbackCostUsd = ((inputTokens / 1_000_000) * modelRate.prompt + (outputTokens / 1_000_000) * modelRate.completion);
    const costUsd = Number.isFinite(reportedCostUsd) && reportedCostUsd > 0 ? reportedCostUsd : fallbackCostUsd;

    await pool.query(
      `INSERT INTO openrouter_requests (user_id, request_id, input_tokens, output_tokens, cost_usd)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, requestId, inputTokens, outputTokens, costUsd],
    );

    await pool.query('INSERT INTO nutrient_cache (input_hash, raw_input, result) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [hash, input || '[photo]', result]);
    return NextResponse.json({ ok: true, result, cached: false, model, requestId, costUsd });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to parse meal.' }, { status: 500 });
  }
}