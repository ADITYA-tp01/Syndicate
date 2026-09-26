import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { RING_ISOLATE_FALLBACK } from '@/lib/queries';
import { isolateRings } from '@/lib/graph-algos';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const start = performance.now();
    const rings = await isolateRings(runQuery);
    const ms = Math.round((performance.now() - start) * 100) / 100;
    return NextResponse.json({
      rings,
      result: rings.map((r) => [r.id, r.name, r.size]),
      columns: ['id', 'name', 'size'],
      ms,
      cypher: RING_ISOLATE_FALLBACK,
      params: {},
    });
  } catch (error) {
    console.error('Ring isolation error:', error);
    return NextResponse.json({ error: 'Isolation failed' }, { status: 500 });
  }
}
