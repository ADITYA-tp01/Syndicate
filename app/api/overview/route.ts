import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { OVERVIEW_STATS } from '@/lib/queries';

export async function GET() {
  try {
    const result = await runQuery(OVERVIEW_STATS);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Overview error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}