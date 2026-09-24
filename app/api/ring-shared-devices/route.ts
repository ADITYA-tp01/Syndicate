import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { RING_SHARED_ENTITIES } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const memberIds = searchParams.get('memberIds')?.split(',').filter(Boolean) || [];

  if (memberIds.length === 0) {
    return NextResponse.json({ result: [] });
  }

  try {
    const result = await runQuery(RING_SHARED_ENTITIES, { ring_member_ids: memberIds });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ring shared devices error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}