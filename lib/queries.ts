/**
 * Syndicate — All Hero Cypher Queries
 * 
 * Single source of truth for every query used in the app.
 * Each query returns { result, columns, ms, cypher, params } via runQuery().
 * 
 * Algorithm branch: FALLBACK (Cypher + networkx post-processing)
 * If native algo procedures exist, swap the RING_ISOLATE and RINGLEADER queries.
 */

// ─── Q1: Identity Resolution — Dual Entity Match ───
// Persons sharing BOTH a device AND an IP (strongest identity signal)
export const IDENTITY_RESOLUTION_DUAL = `
MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person),
      (a)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b)
WHERE id(a) < id(b)
RETURN a.id AS person_a_id, a.name AS person_a,
       b.id AS person_b_id, b.name AS person_b,
       d.fingerprint AS shared_device, ip.address AS shared_ip
ORDER BY shared_device
`;

// ─── Q1b: Shared Entity Detection (single-entity, broader net) ───
// Persons sharing a device (wider net, catches more potential links)
export const SHARED_DEVICE_DETECTION = `
MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person)
WHERE id(a) < id(b)
RETURN d.fingerprint AS device,
       collect(DISTINCT a.name) + collect(DISTINCT b.name) AS linked_suspects
ORDER BY size(linked_suspects) DESC
LIMIT 20
`;

// ─── Q1c: Shared IP Detection ───
export const SHARED_IP_DETECTION = `
MATCH (a:Person)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b:Person)
WHERE id(a) < id(b)
RETURN ip.address AS ip,
       collect(DISTINCT a.name) + collect(DISTINCT b.name) AS linked_suspects
ORDER BY size(linked_suspects) DESC
LIMIT 20
`;

// ─── Q2: Money Trail — Variable-Length Path (The Hero Feature) ───
// Follow transfers up to 5 hops from a source account
export const MONEY_TRAIL = `
MATCH path = (src:BankAccount {number: $account})-[:TRANSFERRED_TO*1..5]->(dst)
RETURN path, length(path) AS hops
ORDER BY hops DESC
LIMIT 50
`;

// ─── Q2b: Money Trail — Shortest Path to Target ───
export const MONEY_TRAIL_TO_TARGET = `
MATCH path = shortestPath((src:BankAccount {number: $source})-[:TRANSFERRED_TO*1..5]->(dst:BankAccount {number: $target}))
RETURN path, length(path) AS hops
`;

// ─── Q3: Ego-Network Expansion (Investigator Workflow) ───
// 1-2 hop neighborhood from a seed person
export const EGO_NETWORK = `
MATCH (seed:Person {id: $person_id})-[r]-(n)
RETURN seed, r, n
LIMIT 200
`;

// ─── Q4: Ring Isolation — FALLBACK (Cypher subgraph extraction) ───
// Pull suspicious subgraph (persons with degree >= 2 + their neighbors up to 3 hops)
// Backend runs union-find clustering on the returned subgraph
export const RING_ISOLATE_FALLBACK = `
MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person)
WHERE a.id < b.id
RETURN a.id AS src, b.id AS dst, 'DEVICE' AS via
UNION
MATCH (a:Person)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b:Person)
WHERE a.id < b.id
RETURN a.id AS src, b.id AS dst, 'IP' AS via
UNION
MATCH (a:Person)-[:OWNS]->(srcAcc:BankAccount)-[:TRANSFERRED_TO]->(dstAcc:BankAccount)<-[:OWNS]-(b:Person)
WHERE a.id < b.id
RETURN a.id AS src, b.id AS dst, 'MONEY' AS via
`;

// ─── Q4b: Ring Isolation — NATIVE (if algo.wcc exists) ───
// export const RING_ISOLATE_NATIVE = `
// CALL algo.wcc.stream('Person', 'TRANSFERRED_TO', {})
// YIELD nodeId, componentId
// RETURN nodeId, componentId
// `;

// ─── Q5: Ringleader Detection — FALLBACK (Degree Centrality) ───
// Rank persons within a ring by connection count (guaranteed to work)
export const RINGLEADER_FALLBACK = `
MATCH (p:Person)-[:OWNS]->(a:BankAccount)-[r:TRANSFERRED_TO]-()
WHERE p.id IN $ring_members
RETURN p.id, p.name, count(r) AS degree
ORDER BY degree DESC
LIMIT 5
`;

// ─── Q5b: Ringleader Detection — NATIVE (if algo.pageRank exists) ───
// export const RINGLEADER_NATIVE = `
// CALL algo.pageRank.stream('Person', 'TRANSFERRED_TO', {iterations: 20, dampingFactor: 0.85})
// YIELD nodeId, score
// WHERE nodeId IN $ring_member_ids
// RETURN nodeId, score
// ORDER BY score DESC
// LIMIT 5
// `;

// ─── Q6: Ring Members by Component (for case file) ───
export const RING_MEMBERS = `
MATCH (p:Person)
WHERE p.id IN $ring_member_ids
OPTIONAL MATCH (p)-[:USES_DEVICE]->(d:Device)
OPTIONAL MATCH (p)-[:LOGGED_FROM]->(ip:IP)
OPTIONAL MATCH (p)-[:OWNS]->(a:BankAccount)
RETURN p.id, p.name, p.email,
       collect(DISTINCT d.fingerprint) AS devices,
       collect(DISTINCT ip.address) AS ips,
       collect(DISTINCT a.number) AS accounts
`;

// ─── Q7: Ring Money Flow (for case file) ───
export const RING_MONEY_FLOW = `
MATCH (src:BankAccount)-[tx:TRANSFERRED_TO]->(dst:BankAccount)
WHERE src.number IN $ring_accounts OR dst.number IN $ring_accounts
RETURN src.number AS source, dst.number AS target,
       count(*) AS tx_count, sum(tx.amount) AS total_amount
`;

// ─── Q8: Ring Shared Entities (for case file) ───
export const RING_SHARED_ENTITIES = `
MATCH (p:Person)-[:USES_DEVICE]->(d:Device)
WHERE p.id IN $ring_member_ids
WITH d, count(DISTINCT p) AS person_count
WHERE person_count >= 2
RETURN d.fingerprint AS device, person_count
ORDER BY person_count DESC
`;

export const RING_SHARED_IPS = `
MATCH (p:Person)-[:LOGGED_FROM]->(ip:IP)
WHERE p.id IN $ring_member_ids
WITH ip, count(DISTINCT p) AS person_count
WHERE person_count >= 2
RETURN ip.address AS ip, person_count
ORDER BY person_count DESC
`;

// ─── Q9: Overview Stats (for landing page) ───
export const OVERVIEW_STATS = `
MATCH (p:Person) 
WITH count(p) AS persons
MATCH (d:Device) 
WITH persons, count(d) AS devices
MATCH (ip:IP) 
WITH persons, devices, count(ip) AS ips
MATCH (a:BankAccount) 
WITH persons, devices, ips, count(a) AS accounts
MATCH ()-[r]->() 
WITH persons, devices, ips, accounts, count(r) AS edges
RETURN persons, devices, ips, accounts, edges
`;

// ─── Q10: Search Entities (for investigate page search) ───
export const SEARCH_ENTITIES = `
MATCH (p:Person)
WHERE p.id CONTAINS $query OR p.name CONTAINS $query OR p.email CONTAINS $query
RETURN p.id, p.name, p.email, 'Person' AS type
LIMIT 10
UNION
MATCH (d:Device)
WHERE d.fingerprint CONTAINS $query
RETURN d.fingerprint AS id, d.fingerprint AS name, d.os AS email, 'Device' AS type
LIMIT 10
UNION
MATCH (ip:IP)
WHERE ip.address CONTAINS $query
RETURN ip.address AS id, ip.address AS name, ip.geo AS email, 'IP' AS type
LIMIT 10
UNION
MATCH (a:BankAccount)
WHERE a.number CONTAINS $query
RETURN a.number AS id, a.number AS name, a.type AS email, 'BankAccount' AS type
LIMIT 10
`;

// ─── Query Registry (for Query Inspector display names) ───
export const QUERY_REGISTRY: Record<string, { name: string; description: string }> = {
  IDENTITY_RESOLUTION_DUAL: {
    name: 'Identity Resolution (Dual Entity)',
    description: 'Find persons sharing BOTH a device AND an IP — strongest duplicate signal',
  },
  SHARED_DEVICE_DETECTION: {
    name: 'Shared Device Detection',
    description: 'Persons sharing a device (broader net)',
  },
  SHARED_IP_DETECTION: {
    name: 'Shared IP Detection',
    description: 'Persons logging from the same IP',
  },
  MONEY_TRAIL: {
    name: 'Money Trail (5-hop)',
    description: 'Variable-length path tracing transfers up to 5 hops',
  },
  MONEY_TRAIL_TO_TARGET: {
    name: 'Money Trail to Target',
    description: 'Shortest path between two accounts',
  },
  EGO_NETWORK: {
    name: 'Ego Network Expansion',
    description: '1-2 hop neighborhood from a seed person',
  },
  RING_ISOLATE_FALLBACK: {
    name: 'Ring Isolation (Fallback)',
    description: 'Extract suspicious subgraph for clustering',
  },
  RINGLEADER_FALLBACK: {
    name: 'Ringleader Detection (Degree)',
    description: 'Rank ring members by connection count',
  },
  RING_MEMBERS: {
    name: 'Ring Members Detail',
    description: 'Full member profile with devices, IPs, accounts',
  },
  RING_MONEY_FLOW: {
    name: 'Ring Money Flow',
    description: 'Aggregate transfer volume between ring accounts',
  },
  RING_SHARED_ENTITIES: {
    name: 'Ring Shared Devices',
    description: 'Devices shared by 2+ ring members',
  },
  RING_SHARED_IPS: {
    name: 'Ring Shared IPs',
    description: 'IPs used by 2+ ring members',
  },
  OVERVIEW_STATS: {
    name: 'Overview Statistics',
    description: 'Global graph counts for dashboard',
  },
  SEARCH_ENTITIES: {
    name: 'Entity Search',
    description: 'Search across all entity types',
  },
};