import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { SEARCH_ENTITIES } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';

  if (!q.trim()) {
    return NextResponse.json({ result: [] });
  }

  try {
    const result = await runQuery(SEARCH_ENTITIES, { query: q });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}