import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/db';

export async function GET() {
  try {
    const dbTime = await testDatabaseConnection();
    return NextResponse.json({
      ok: true,
      database: 'connected',
      now: dbTime?.now ?? null,
      openrouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown database error',
        openrouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      },
      { status: 500 },
    );
  }
}
