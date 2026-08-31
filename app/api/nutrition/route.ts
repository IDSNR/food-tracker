import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';

const defaultGoals = {
  calories: [2200, 'kcal'], protein: [150, 'g'], carbs: [250, 'g'], fat: [70, 'g'], fiber: [30, 'g'],
  sugar: [50, 'g'], sodium: [2300, 'mg'], vitamin_a: [900, 'mcg'], vitamin_c: [90, 'mg'], vitamin_d: [15, 'mcg'],
  vitamin_e: [15, 'mg'], vitamin_k: [120, 'mcg'], calcium: [1000, 'mg'], iron: [8, 'mg'], magnesium: [400, 'mg'],
  zinc: [11, 'mg'], potassium: [3400, 'mg'], vitamin_b12: [2.4, 'mcg'], folate: [400, 'mcg'],
} as Record<string, [number, string]>;

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const userId = Number(url.searchParams.get('userId') ?? '1') || 1;
    const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? 1), 1), 31);
    const selectedDate = url.searchParams.get('date');
    const [logs, goalRows, water] = await Promise.all([
      selectedDate
        ? pool.query('SELECT * FROM food_logs WHERE user_id = $1 AND created_at::date = $2::date ORDER BY created_at DESC', [userId, selectedDate])
        : pool.query(`SELECT * FROM food_logs WHERE user_id = $1 AND created_at >= CURRENT_DATE - ($2::int - 1) ORDER BY created_at DESC`, [userId, days]),
      pool.query('SELECT nutrient_key, target_amount, unit FROM goals WHERE user_id = $1', [userId]),
      selectedDate
        ? pool.query('SELECT COALESCE(SUM(amount_ml), 0)::int AS amount_ml FROM water_logs WHERE user_id = $1 AND logged_at::date = $2::date', [userId, selectedDate])
        : pool.query(`SELECT COALESCE(SUM(amount_ml), 0)::int AS amount_ml FROM water_logs WHERE user_id = $1 AND logged_at >= CURRENT_DATE`, [userId]),
    ]);
    const goals = Object.fromEntries(Object.entries(defaultGoals).map(([key, [amount, unit]]) => [key, { amount, unit }]));
    for (const row of goalRows.rows) goals[row.nutrient_key] = { amount: Number(row.target_amount), unit: row.unit };

    return NextResponse.json({ ok: true, entries: logs.rows, goals, waterMl: water.rows[0].amount_ml });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const userId = Number(body?.userId ?? '1') || 1;
    const { meal, nutrients, goals, waterMl } = body ?? {};

    if (waterMl) {
      const result = await pool.query('INSERT INTO water_logs (user_id, amount_ml, logged_at) VALUES ($1, $2, COALESCE($3::timestamptz, NOW())) RETURNING *', [userId, Number(waterMl), body.loggedAt ?? null]);
      return NextResponse.json({ ok: true, water: result.rows[0] });
    }

    if (goals && typeof goals === 'object') {
      for (const [key, value] of Object.entries(goals)) {
        const goal = value as { amount?: number; unit?: string };
        if (Number.isFinite(goal.amount) && goal.unit) {
          await pool.query(`INSERT INTO goals (user_id, nutrient_key, target_amount, unit) VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, nutrient_key) DO UPDATE SET target_amount = EXCLUDED.target_amount, unit = EXCLUDED.unit, updated_at = NOW()`,
          [userId, key, goal.amount, goal.unit]);
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (!meal?.name || !nutrients || typeof nutrients !== 'object') {
      return NextResponse.json({ ok: false, error: 'Meal and nutrients are required.' }, { status: 400 });
    }

    const insert = await pool.query(
      `INSERT INTO food_logs (user_id, meal_name, meal_type, raw_input, image_url, ai_model_used, nutrients, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, NOW())) RETURNING *`,
      [userId, meal.name, meal.mealType ?? 'Meal', meal.rawInput ?? '', meal.imageUrl ?? null, meal.aiModelUsed ?? null, nutrients, meal.loggedAt ?? null],
    );

    return NextResponse.json({ ok: true, entry: insert.rows[0] });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const userId = Number(url.searchParams.get('userId') ?? '1') || 1;
    if (!id) return NextResponse.json({ ok: false, error: 'An entry id is required.' }, { status: 400 });
    await pool.query('DELETE FROM food_logs WHERE id = $1 AND user_id = $2', [id, userId]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
