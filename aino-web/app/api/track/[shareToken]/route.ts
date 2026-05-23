import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  const { shareToken } = await params;
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001/api';

  try {
    await fetch(`${apiUrl}/leads/track/${shareToken}`, { method: 'POST' });
  } catch {
    // Tracking is best-effort — never fail the page load
  }

  return NextResponse.json({ ok: true });
}
