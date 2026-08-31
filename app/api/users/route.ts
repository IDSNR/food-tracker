import { NextResponse } from 'next/server';
import { ensureSchema, pool } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const result = await pool.query(`
      SELECT u.id, u.email, u.display_name,
             COUNT(o.id) AS request_count,
             COALESCE(SUM(o.input_tokens), 0)::bigint AS input_tokens_total,
             COALESCE(SUM(o.output_tokens), 0)::bigint AS output_tokens_total,
             COALESCE(SUM(o.cost_usd), 0)::numeric(12,6) AS spend_usd
      FROM users u
      LEFT JOIN openrouter_requests o ON o.user_id = u.id
      GROUP BY u.id, u.email, u.display_name, u.created_at
      ORDER BY u.created_at ASC
    `);
    return NextResponse.json({ ok: true, users: result.rows.map((row) => ({
      id: Number(row.id),
      email: row.email,
      display_name: row.display_name,
      request_count: Number(row.request_count ?? 0),
      input_tokens_total: Number(row.input_tokens_total ?? 0),
      output_tokens_total: Number(row.output_tokens_total ?? 0),
      spend_usd: Number(row.spend_usd ?? 0),
    })) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to load profiles.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const displayName = String(body?.displayName ?? '').trim() || email.split('@')[0] || 'User';

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Email is required.' }, { status: 400 });
    }

    const existing = await pool.query('SELECT id, email, display_name FROM users WHERE email = $1', [email]);
    if (existing.rowCount) {
      return NextResponse.json({ ok: true, user: existing.rows[0] });
    }

    const insert = await pool.query(
      'INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id, email, display_name',
      [email, displayName],
    );

    return NextResponse.json({ ok: true, user: insert.rows[0] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to create profile.' }, { status: 500 });
  }
}
