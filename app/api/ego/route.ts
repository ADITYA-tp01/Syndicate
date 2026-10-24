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

    // The FalkorDB Node client returns each row as:
    //   { seed: {id, labels, properties}, r: {sourceId, destinationId, properties, relationshipType}, n: {id, labels, properties} }
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeSet = new Set<string>();

    const addNode = (item: any) => {
      if (!item || item.id === undefined) return;
      const id = String(item.id);
      if (nodeSet.has(id)) return;
      nodeSet.add(id);

      const labels = item.labels || [];
      const props = item.properties || {};
      const type = labels[0] || 'Unknown';
      const label = props.name || props.number || props.fingerprint || props.address || id;

      nodes.push({
        data: { id, label, type },
        classes: type.toLowerCase(),
      });
    };

    for (const row of result.result || []) {
      const seed = row[0];
      const rel = row[1];
      const neighbor = row[2];

      addNode(seed);
      addNode(neighbor);

      if (rel && rel.sourceId !== undefined && rel.destinationId !== undefined) {
        // The match is undirected — orient the edge away from the seed
        const srcId = String(rel.sourceId === seed?.id ? rel.sourceId : rel.destinationId);
        const tgtId = String(rel.sourceId === seed?.id ? rel.destinationId : rel.sourceId);
        edges.push({
          data: {
            id: `e-${srcId}-${tgtId}`,
            source: srcId,
            target: tgtId,
            type: rel.relationshipType,
          },
          classes: rel.relationshipType?.toLowerCase().replace('_', '-') || '',
        });
      }
    }

    return NextResponse.json({
      nodes,
      edges,
      ms: result.ms,
      cypher: result.cypher,
      params: result.params,
    });
  } catch (error) {
    console.error('Ego network error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}