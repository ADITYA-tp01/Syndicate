import { FalkorDB } from 'falkordb';

const FALKORDB_HOST = process.env.FALKORDB_HOST || 'localhost';
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT || '6379', 10);
const GRAPH_NAME = process.env.GRAPH_NAME || 'syndicate';

let client: FalkorDB | null = null;
let graph: any = null;

export function getFalkorDB() {
  if (!client) {
    client = new FalkorDB({ host: FALKORDB_HOST, port: FALKORDB_PORT });
  }
  return client;
}

export function getGraph() {
  if (!graph) {
    const db = getFalkorDB();
    graph = db.selectGraph(GRAPH_NAME);
  }
  return graph;
}

export async function runQuery(cypher: string, params: Record<string, any> = {}) {
  const g = getGraph();
  const start = performance.now();
  const result = await g.query(cypher, params);
  const ms = performance.now() - start;
  return {
    result: result.result_set || [],
    columns: result.columns || [],
    ms: Math.round(ms * 100) / 100, // 2 decimal places
    cypher,
    params,
  };
}

export { GRAPH_NAME };