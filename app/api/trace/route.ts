import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { MONEY_TRAIL } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const account = searchParams.get('account');

  if (!account) {
    return NextResponse.json({ error: 'account parameter required' }, { status: 400 });
  }

  try {
    const result = await runQuery(MONEY_TRAIL, { account });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Money trail error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}