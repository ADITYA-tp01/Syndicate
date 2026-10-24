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

    // Convert money-trail paths to Cytoscape elements.
    // The FalkorDB Node client returns each path as:
    //   { path: { nodes: [{id, labels, properties}], edges: [{sourceId, destinationId, properties, relationshipType}] } }
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeSet = new Set<string>();

    for (const row of result.result || []) {
      const path = row[0];
      if (!path || !path.nodes) continue;

      for (const node of path.nodes) {
        const id = String(node.id);
        if (nodeSet.has(id)) continue;
        nodeSet.add(id);

        const labels = node.labels || [];
        const props = node.properties || {};
        const type = labels[0] || 'Unknown';
        const label = props.number || props.fingerprint || props.address || props.name || id;

        nodes.push({
          data: { id, label, type },
          classes: type.toLowerCase(),
        });
      }

      for (const edge of path.edges || []) {
        const src = String(edge.sourceId);
        const dst = String(edge.destinationId);
        edges.push({
          data: {
            id: `e-${src}-${dst}`,
            source: src,
            target: dst,
            amount: edge.properties?.amount,
            at: edge.properties?.at,
            type: edge.relationshipType,
          },
          classes: 'transfer',
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
    console.error('Money trail error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}