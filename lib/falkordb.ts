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
    client = await FalkorDB.connect({ socket: { host: FALKORDB_HOST, port: FALKORDB_PORT } });
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

/**
 * Normalize a FalkorDB Node client response into the shape the app expects:
 *   { result: any[][], columns: string[], ms, cypher, params }
 *
 * The v6.x Node client returns { metadata, data } where `data` is an array of
 * objects keyed by column name (e.g. [{ "p.id": "...", "p.name": "..." }]).
 * Every route in this app indexes rows positionally (row[0], row[1]...), so we
 * flatten each object back into an array in the order the columns were emitted.
 */
function normalizeResult(raw: any): { result: any[][]; columns: string[] } {
  // Legacy shape: { result_set: any[][], columns: string[] }
  if (raw.result_set && Array.isArray(raw.result_set)) {
    return {
      result: raw.result_set,
      columns: raw.columns || [],
    };
  }

  // Current shape: { metadata, data: Record<string, any>[] }
  const data = raw.data;
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { result: [], columns: [] };
    }
    // Column order = insertion order of keys on the first row
    const columns = Object.keys(data[0]);
    const result = data.map(row => columns.map(col => row[col]));
    return { result, columns };
  }

  return { result: [], columns: [] };
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
    const raw = await g.query(cypher, { params });
    const ms = performance.now() - start;
    const { result, columns } = normalizeResult(raw);
    return {
      result,
      columns,
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