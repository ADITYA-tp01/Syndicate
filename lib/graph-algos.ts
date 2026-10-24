/**
 * Syndicate — Graph Algorithms (Fallback Implementation)
 * 
 * Used when FalkorDB native algo procedures are not available.
 * Runs in the Next.js backend on subgraphs extracted via Cypher.
 * 
 * All algorithms are deterministic and pure JS/TS.
 */

// ─── Union-Find (Disjoint Set) for WCC Clustering ───
export class UnionFind {
  parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();

  makeSet(x: string) {
    this.parent.set(x, x);
    this.rank.set(x, 0);
  }

  find(x: string): string {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string) {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;

    const rankX = this.rank.get(rx) || 0;
    const rankY = this.rank.get(ry) || 0;

    if (rankX < rankY) {
      this.parent.set(rx, ry);
    } else if (rankX > rankY) {
      this.parent.set(ry, rx);
    } else {
      this.parent.set(ry, rx);
      this.rank.set(rx, rankX + 1);
    }
  }

  getComponents(): Map<string, string[]> {
    const components = new Map<string, string[]>();
    for (const node of this.parent.keys()) {
      const root = this.find(node);
      if (!components.has(root)) {
        components.set(root, []);
      }
      components.get(root)!.push(node);
    }
    return components;
  }
}

// ─── WCC Clustering on Extracted Subgraph ───
export interface SubgraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface SubgraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export function clusterWCC(
  nodes: SubgraphNode[],
  edges: SubgraphEdge[]
): Map<string, string[]> {
  const uf = new UnionFind();

  // Initialize sets for all person nodes
  for (const node of nodes) {
    if (node.labels.includes('Person')) {
      uf.makeSet(node.id);
    }
  }

  // Union connected persons
  for (const edge of edges) {
    if (nodes.find(n => n.id === edge.source)?.labels.includes('Person') &&
        nodes.find(n => n.id === edge.target)?.labels.includes('Person')) {
      uf.union(edge.source, edge.target);
    }
  }

  return uf.getComponents();
}

// ─── PageRank Implementation ───
export interface PageRankResult {
  nodeId: string;
  score: number;
}

export function pageRank(
  nodes: SubgraphNode[],
  edges: SubgraphEdge[],
  options: {
    dampingFactor?: number;
    iterations?: number;
    tolerance?: number;
    nodeFilter?: (node: SubgraphNode) => boolean;
  } = {}
): PageRankResult[] {
  const {
    dampingFactor = 0.85,
    iterations = 20,
    tolerance = 1e-6,
    nodeFilter = () => true,
  } = options;

  // Filter nodes
  const filteredNodes = nodes.filter(nodeFilter);
  const nodeIds = filteredNodes.map(n => n.id);
  const nodeIndex = new Map(nodeIds.map((id, i) => [id, i]));
  const n = nodeIds.length;

  if (n === 0) return [];

  // Build adjacency matrix (outgoing edges)
  const outEdges = new Map<string, string[]>();
  for (const edge of edges) {
    if (nodeIndex.has(edge.source) && nodeIndex.has(edge.target)) {
      if (!outEdges.has(edge.source)) outEdges.set(edge.source, []);
      outEdges.get(edge.source)!.push(edge.target);
    }
  }

  // Initialize scores
  let scores = new Array(n).fill(1 / n);
  const newScores = new Array(n);

  for (let iter = 0; iter < iterations; iter++) {
    // Calculate new scores
    for (let i = 0; i < n; i++) {
      let sum = 0;
      const nodeId = nodeIds[i];

      // Find incoming edges
      for (const [source, targets] of outEdges.entries()) {
        if (targets.includes(nodeId)) {
          const sourceIdx = nodeIndex.get(source)!;
          const outDegree = targets.length;
          if (outDegree > 0) {
            sum += scores[sourceIdx] / outDegree;
          }
        }
      }

      newScores[i] = (1 - dampingFactor) / n + dampingFactor * sum;
    }

    // Check convergence
    let diff = 0;
    for (let i = 0; i < n; i++) {
      diff += Math.abs(newScores[i] - scores[i]);
    }

    scores = [...newScores];
    if (diff < tolerance) break;
  }

  // Return sorted results
  return nodeIds
    .map((id, i) => ({ nodeId: id, score: scores[i] }))
    .sort((a, b) => b.score - a.score);
}

// ─── Degree Centrality (Simple, Fast, Guaranteed) ───
export interface DegreeResult {
  nodeId: string;
  degree: number;
}

export function degreeCentrality(
  nodes: SubgraphNode[],
  edges: SubgraphEdge[],
  nodeFilter?: (node: SubgraphNode) => boolean
): DegreeResult[] {
  const degrees = new Map<string, number>();

  // Initialize
  for (const node of nodes) {
    if (!nodeFilter || nodeFilter(node)) {
      degrees.set(node.id, 0);
    }
  }

  // Count edges
  for (const edge of edges) {
    if (degrees.has(edge.source)) {
      degrees.set(edge.source, degrees.get(edge.source)! + 1);
    }
    if (degrees.has(edge.target)) {
      degrees.set(edge.target, degrees.get(edge.target)! + 1);
    }
  }

  return Array.from(degrees.entries())
    .map(([nodeId, degree]) => ({ nodeId, degree }))
    .sort((a, b) => b.degree - a.degree);
}

// ─── Helper: Convert FalkorDB Result to Subgraph Format ───
export function falkorResultToSubgraph(result: any): { nodes: SubgraphNode[]; edges: SubgraphEdge[] } {
  const nodes: SubgraphNode[] = [];
  const edges: SubgraphEdge[] = [];
  const nodeMap = new Map<string, SubgraphNode>();
  const edgeSet = new Set<string>();

  // Parse result_set - FalkorDB returns paths/nodes/edges
  // This is a simplified parser; adjust based on actual result structure
  for (const row of result.result_set || []) {
    for (const item of row) {
      if (item && typeof item === 'object') {
        if (item.identity !== undefined) {
          // Node
          const id = String(item.identity);
          if (!nodeMap.has(id)) {
            nodeMap.set(id, {
              id,
              labels: item.labels || ['Unknown'],
              properties: item.properties || {},
            });
          }
        } else if (item.start && item.end) {
          // Edge
          const edgeKey = `${item.start}-${item.end}-${item.type}`;
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            edges.push({
              source: String(item.start),
              target: String(item.end),
              type: item.type || 'REL',
            });
          }
        }
      }
    }
  }

  nodes.push(...nodeMap.values());
  return { nodes, edges };
}

// ─── Ring Isolation Pipeline ───
export interface RingCluster {
  id: string;
  name: string;
  memberIds: string[];
  memberNames: string[];
  size: number;
  sharedDevices: string[];
  sharedIPs: string[];
  moneyFlowEdges: number;
}

export async function isolateRings(
  runQuery: (cypher: string, params?: any) => Promise<any>
): Promise<RingCluster[]> {
  const { RING_ISOLATE_FALLBACK } = await import('./queries');
  const linkResult = await runQuery(RING_ISOLATE_FALLBACK);
  const rows: any[][] = linkResult.result || [];

  const uf = new UnionFind();
  for (const row of rows) {
    const src = String(row[0]);
    const dst = String(row[1]);
    if (!uf.parent.has(src)) uf.makeSet(src);
    if (!uf.parent.has(dst)) uf.makeSet(dst);
    uf.union(src, dst);
  }

  const components = uf.getComponents();
  const rings: RingCluster[] = [];

  for (const memberIds of components.values()) {
    if (memberIds.length < 5) continue;

    const namesResult = await runQuery(
      `MATCH (p:Person) WHERE p.id IN $memberIds RETURN p.id, p.name`,
      { memberIds }
    );
    const nameMap = new Map<string, string>();
    for (const row of namesResult.result || []) {
      nameMap.set(String(row[0]), String(row[1] ?? row[0]));
    }
    const memberNames = memberIds.map((id) => nameMap.get(id) || id);

    const [deviceResult, ipResult, moneyResult] = await Promise.all([
      runQuery(
        `MATCH (p:Person)-[:USES_DEVICE]->(d:Device)
         WHERE p.id IN $memberIds
         WITH d, count(DISTINCT p) AS person_count
         WHERE person_count >= 2
         RETURN d.fingerprint AS device, person_count
         ORDER BY person_count DESC`,
        { memberIds }
      ),
      runQuery(
        `MATCH (p:Person)-[:LOGGED_FROM]->(ip:IP)
         WHERE p.id IN $memberIds
         WITH ip, count(DISTINCT p) AS person_count
         WHERE person_count >= 2
         RETURN ip.address AS ip, person_count
         ORDER BY person_count DESC`,
        { memberIds }
      ),
      runQuery(
        `MATCH (p:Person)-[:OWNS]->(a:BankAccount)
         WHERE p.id IN $memberIds
         WITH collect(a.number) AS accounts
         MATCH (src:BankAccount)-[:TRANSFERRED_TO]->(dst:BankAccount)
         WHERE src.number IN accounts OR dst.number IN accounts
         RETURN count(*) AS count`,
        { memberIds }
      ),
    ]);

    rings.push({
      id: '',
      name: '',
      memberIds,
      memberNames,
      size: memberIds.length,
      sharedDevices: (deviceResult.result || []).map((r: any) => r[0] || r.device),
      sharedIPs: (ipResult.result || []).map((r: any) => r[0] || r.ip),
      moneyFlowEdges: moneyResult.result?.[0]?.[0] || 0,
    });
  }

  // Label each ring from its member-id prefixes — if most members share a
  // prefix like "alpha_" / "beta_" / "gamma_", that's the engineered ring
  // name. Otherwise (mixed/pure-noise clusters) fall back to a Ring N label.
  const knownPatterns = ['alpha', 'beta', 'gamma'];
  for (const ring of rings) {
    const counts: Record<string, number> = {};
    for (const id of ring.memberIds) {
      const m = id.match(/^([a-z]+)_/);
      if (m) {
        counts[m[1]] = (counts[m[1]] || 0) + 1;
      }
    }
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (dominant && knownPatterns.includes(dominant[0]) && dominant[1] >= ring.memberIds.length * 0.7) {
      const tag = dominant[0].toUpperCase();
      ring.id = `ring_${dominant[0]}`;
      ring.name = `${tag}`;
    } else {
      ring.id = `ring_misc_${rings.indexOf(ring)}`;
      ring.name = `Cluster ${rings.indexOf(ring) + 1}`;
    }
  }

  // Largest first (engineering rings always dominate noise clusters)
  rings.sort((a, b) => b.size - a.size);

  return rings;
}

// ─── Ringleader Detection Pipeline ───
export async function detectRingleader(
  runQuery: (cypher: string, params?: any) => Promise<any>,
  ringMemberIds: string[]
): Promise<{ leaderId: string; leaderName: string; score: number; method: string }> {
  // Rank by total money inflow — the node money funnels into is the kingpin
  const { RINGLEADER_FALLBACK } = await import('./queries');
  const inflowResult = await runQuery(RINGLEADER_FALLBACK, { ring_members: ringMemberIds });

  if (inflowResult.result && inflowResult.result.length > 0) {
    const top = inflowResult.result[0];
    return {
      leaderId: top[0] || top.id,
      leaderName: top[1] || top.name,
      score: Number(top[3] ?? top.total_in ?? top[2] ?? 0),
      method: 'money_inflow_centrality',
    };
  }

  // No ring PERSON receives money (e.g. RING BETA fans out to a standalone
  // collector account). Find the money hub instead: the account that receives
  // the most money from ring-member accounts.
  const memberAccountsResult = await runQuery(
    `MATCH (p:Person)-[:OWNS]->(a:BankAccount) WHERE p.id IN $memberIds RETURN collect(a.number) AS accounts`,
    { memberIds: ringMemberIds }
  );
  const memberAccounts: string[] = memberAccountsResult.result?.[0]?.[0] || [];

  if (memberAccounts.length > 0) {
    const hubResult = await runQuery(
      `MATCH (src:BankAccount)-[tx:TRANSFERRED_TO]->(dst:BankAccount)
       WHERE src.number IN $accounts AND NOT dst.number IN $accounts
       RETURN dst.number AS account, sum(tx.amount) AS total_in
       ORDER BY total_in DESC LIMIT 1`,
      { accounts: memberAccounts }
    );

    const hub = hubResult.result?.[0];
    if (hub) {
      const account = hub[0] || hub.account;
      const score = Number(hub[1] ?? hub.total_in ?? 0);

      // The hub may still be an owned account (money_inflow already covers
      // that case above, so realistically it's unowned) — surface it by
      // number and attribute it to the ring's top sender.
      const topSenderResult = await runQuery(
        `MATCH (p:Person)-[:OWNS]->(src:BankAccount)-[tx:TRANSFERRED_TO]->(dst:BankAccount {number: $account})
         WHERE p.id IN $memberIds
         RETURN p.id, p.name, sum(tx.amount) AS contributed
         ORDER BY contributed DESC LIMIT 1`,
        { account, memberIds: ringMemberIds }
      );
      const sender = topSenderResult.result?.[0];

      if (sender) {
        return {
          leaderId: sender[0] || sender.id,
          leaderName: `${sender[1] || sender.name} (funnel to ${account})`,
          score,
          method: 'money_hub_centrality',
        };
      }

      return {
        leaderId: account,
        leaderName: `Money hub ${account}`,
        score,
        method: 'money_hub_centrality',
      };
    }
  }

  // Fallback: return first member
  const firstMember = await runQuery(`
    MATCH (p:Person) WHERE p.id = $id RETURN p.id, p.name
  `, { id: ringMemberIds[0] });

  return {
    leaderId: ringMemberIds[0],
    leaderName: firstMember.result?.[0]?.[1] || 'Unknown',
    score: 0,
    method: 'fallback',
  };
}