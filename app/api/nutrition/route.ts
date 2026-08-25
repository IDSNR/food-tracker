import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    return NextResponse.json({ ok: true, tables: result.rows.map((row) => row.table_name) });
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
    const body = await request.json();
    const { meal, nutrients } = body ?? {};

    if (!meal || !nutrients) {
      return NextResponse.json({ ok: false, error: 'Meal and nutrients are required.' }, { status: 400 });
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_logs (
        id SERIAL PRIMARY KEY,
        meal_name TEXT NOT NULL,
        raw_input TEXT,
        nutrients JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const insert = await pool.query(
      `INSERT INTO food_logs (meal_name, raw_input, nutrients) VALUES ($1, $2, $3) RETURNING *;`,
      [meal.name ?? 'Untitled meal', meal.rawInput ?? '', nutrients],
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
