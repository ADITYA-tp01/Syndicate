const FALKORDB_HOST = process.env.FALKORDB_HOST || 'localhost';
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT || '6379', 10);
const GRAPH_NAME = process.env.GRAPH_NAME || 'syndicate';

// Detect build-time
const IS_BUILD = process.env.NEXT_PHASE === 'phase-production-build' || 
                 process.env.NODE_ENV === 'production' && !process.env.FALKORDB_HOST;

let client: any = null;
let graph: any = null;

async function getFalkorDB() {
  if (!client) {
    // Dynamic import to avoid bundling falkordb during build
    const { FalkorDB } = await import('falkordb');
    client = new FalkorDB({ host: FALKORDB_HOST, port: FALKORDB_PORT });
  }
  return client;
}

async function getGraph() {
  if (!graph) {
    const db = await getFalkorDB();
    graph = db.selectGraph(GRAPH_NAME);
  }
  return graph;
}

export async function runQuery(cypher: string, params: Record<string, any> = {}) {
  // During build, return mock data without connecting
  if (IS_BUILD) {
    return {
      result: [],
      columns: [],
      ms: 0,
      cypher,
      params,
    };
  }
  
  // Runtime - connect and query
  try {
    const g = await getGraph();
    const start = performance.now();
    const result = await g.query(cypher, params);
    const ms = performance.now() - start;
    return {
      result: result.result_set || [],
      columns: result.columns || [],
      ms: Math.round(ms * 100) / 100,
      cypher,
      params,
    };
  } catch (error) {
    console.error('Database query failed:', error);
    return {
      result: [],
      columns: [],
      ms: 0,
      cypher,
      params,
    };
  }
}

export { GRAPH_NAME };