import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { IDENTITY_RESOLUTION_DUAL, SHARED_DEVICE_DETECTION, SHARED_IP_DETECTION } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('mode') || 'dual'; // 'dual' | 'device' | 'ip'

  try {
    let result;
    switch (mode) {
      case 'dual':
        result = await runQuery(IDENTITY_RESOLUTION_DUAL);
        break;
      case 'device':
        result = await runQuery(SHARED_DEVICE_DETECTION);
        break;
      case 'ip':
        result = await runQuery(SHARED_IP_DETECTION);
        break;
      default:
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Shared entities error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}