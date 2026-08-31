import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';
import { defaultFoodCatalog } from '@/lib/foodCatalog';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim() ?? '';
    const query = search
      ? `SELECT * FROM food_catalog WHERE LOWER(name) LIKE LOWER($1) ORDER BY name ASC LIMIT 20`
      : `SELECT * FROM food_catalog ORDER BY name ASC LIMIT 50`;

    const params = search ? [`%${search}%`] : [];
    const result = await pool.query(query, params);
    const categories = await pool.query('SELECT DISTINCT category FROM food_catalog WHERE category IS NOT NULL AND category <> \'\' ORDER BY category ASC');

    return NextResponse.json({
      ok: true,
      categories: categories.rows.map((row) => row.category),
      items: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        portion: row.portion,
        category: row.category,
        nutrients: row.nutrients ?? {},
      })),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to load food catalog.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const item = body?.item ?? body;
    const name = String(item?.name ?? '').trim();
    const portion = String(item?.portion ?? '1 serving').trim() || '1 serving';
    const category = String(item?.category ?? 'Custom').trim() || 'Custom';
    const nutrients = typeof item?.nutrients === 'object' ? item.nutrients : {};

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Food name is required.' }, { status: 400 });
    }

    const insert = await pool.query(
      `INSERT INTO food_catalog (name, portion, category, nutrients)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET portion = EXCLUDED.portion, category = EXCLUDED.category, nutrients = EXCLUDED.nutrients
       RETURNING *`,
      [name, portion, category, nutrients],
    );

    return NextResponse.json({ ok: true, item: { ...insert.rows[0], nutrients: insert.rows[0].nutrients ?? {} } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to save food item.' }, { status: 500 });
  }
}

export async function seedCatalog() {
  await ensureSchema();
  await Promise.all(defaultFoodCatalog.map(async (item) => {
    await pool.query(
      `INSERT INTO food_catalog (name, portion, category, nutrients)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO NOTHING`,
      [item.name, item.portion, item.category, item.nutrients],
    );
  }));
}
