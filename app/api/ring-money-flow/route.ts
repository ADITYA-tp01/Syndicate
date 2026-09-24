import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { RING_MONEY_FLOW } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accounts = searchParams.get('accounts')?.split(',').filter(Boolean) || [];

  if (accounts.length === 0) {
    return NextResponse.json({ result: [] });
  }

  try {
    const result = await runQuery(RING_MONEY_FLOW, { ring_accounts: accounts });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ring money flow error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}