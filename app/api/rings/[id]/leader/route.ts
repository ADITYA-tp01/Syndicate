import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { detectRingleader, isolateRings } from '@/lib/graph-algos';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const rings = await isolateRings(runQuery);
    const ring = rings.find((r) => r.id === id);
    if (!ring) {
      return NextResponse.json({ error: 'Ring not found' }, { status: 404 });
    }

    const leader = await detectRingleader(runQuery, ring.memberIds);

    return NextResponse.json({
      ringId: id,
      ringName: ring.name,
      leader,
      method: leader.method,
    });
  } catch (error) {
    console.error('Ringleader detection error:', error);
    return NextResponse.json({ error: 'Detection failed' }, { status: 500 });
  }
}
