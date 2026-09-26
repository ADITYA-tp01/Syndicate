import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { EGO_NETWORK } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const personId = searchParams.get('personId');

  if (!personId) {
    return NextResponse.json({ error: 'personId parameter required' }, { status: 400 });
  }

  try {
    const result = await runQuery(EGO_NETWORK, { person_id: personId });
    
    // Convert to Cytoscape format
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeSet = new Set<string>();
    const nodeLabels = new Map<string, string>();

    for (const row of result.result || []) {
      // row contains: seed, r, n
      const seed = row[0];
      const rel = row[1];
      const neighbor = row[2];

      if (seed && seed.identity !== undefined) {
        const id = String(seed.identity);
        if (!nodeSet.has(id)) {
          nodeSet.add(id);
          nodes.push({
            data: { id, label: seed.properties?.name || id, type: 'Person' },
            classes: 'person',
          });
        }
      }
      if (neighbor && neighbor.identity !== undefined) {
        const id = String(neighbor.identity);
        if (!nodeSet.has(id)) {
          nodeSet.add(id);
          const label = neighbor.properties?.name || 
                       neighbor.properties?.fingerprint || 
                       neighbor.properties?.number || 
                       neighbor.properties?.address || id;
          const type = neighbor.labels?.[0] || 'Unknown';
          nodes.push({
            data: { id, label, type },
            classes: type.toLowerCase(),
          });
        }
      }
      if (rel && rel.start !== undefined && rel.end !== undefined) {
        const srcId = String(rel.start);
        const tgtId = String(rel.end);
        edges.push({
          data: { id: `e-${srcId}-${tgtId}`, source: srcId, target: tgtId, type: rel.type },
          classes: rel.type.toLowerCase().replace('_', '-'),
        });
      }
    }

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error('Ego network error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}