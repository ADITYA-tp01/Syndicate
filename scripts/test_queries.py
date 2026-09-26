#!/usr/bin/env python3
"""Test all hero queries against live seeded database."""
from falkordb import FalkorDB

db = FalkorDB(host='localhost', port=6379)
g = db.select_graph('syndicate')

def run_query(name, cypher, params=None):
    print(f"\n{'='*60}")
    print(f"QUERY: {name}")
    print(f"{'='*60}")
    try:
        res = g.query(cypher, params or {})
        print(f"Result type: {type(res)}")
        print(f"Result set: {res.result_set}")
        if hasattr(res, 'columns'):
            print(f"Columns: {res.columns}")
        else:
            print(f"Columns: N/A")
        print(f"Row count: {len(res.result_set) if res.result_set else 0}")
        for i, row in enumerate(res.result_set[:5] if res.result_set else []):
            print(f"  Row {i}: {row}")
        if res.result_set and len(res.result_set) > 5:
            print(f"  ... ({len(res.result_set) - 5} more rows)")
        return res.result_set
    except Exception as e:
        print(f"ERROR: {e}")
        return []

# Q1: Identity resolution (dual-entity match)
run_query("Q1 - Dual Entity Match (device + IP)", """
MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person),
      (a)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b)
WHERE id(a) < id(b)
RETURN a.id AS person_a_id, a.name AS person_a,
       b.id AS person_b_id, b.name AS person_b,
       d.fingerprint AS shared_device, ip.address AS shared_ip
ORDER BY shared_device
""")

# Q1b: Shared device detection
run_query("Q1b - Shared Device Detection", """
MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person)
WHERE id(a) < id(b)
RETURN d.fingerprint AS device,
       collect(DISTINCT a.name) + collect(DISTINCT b.name) AS linked_suspects
ORDER BY size(linked_suspects) DESC
LIMIT 20
""")

# Q1c: Shared IP detection
run_query("Q1c - Shared IP Detection", """
MATCH (a:Person)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b:Person)
WHERE id(a) < id(b)
RETURN ip.address AS ip,
       collect(DISTINCT a.name) + collect(DISTINCT b.name) AS linked_suspects
ORDER BY size(linked_suspects) DESC
LIMIT 20
""")

# Q2: Money trail (5-hop)
run_query("Q2 - Money Trail (5-hop from ACC_ALPHA_001)", """
MATCH path = (src:BankAccount {number: 'ACC_ALPHA_001'})-[:TRANSFERRED_TO*1..5]->(dst)
RETURN path, length(path) AS hops
ORDER BY hops DESC
LIMIT 50
""")

# Q2b: Shortest path between accounts (fixed syntax)
run_query("Q2b - Shortest Path (Alpha to Alpha)", """
MATCH path = (src:BankAccount {number: 'ACC_ALPHA_001'})-[:TRANSFERRED_TO*1..5]->(dst:BankAccount {number: 'ACC_ALPHA_060'})
RETURN path, length(path) AS hops
LIMIT 1
""")

# Q3: Ego network
run_query("Q3 - Ego Network (alpha_001)", """
MATCH (seed:Person {id: 'alpha_001'})-[r]-(n)
RETURN seed, r, n
LIMIT 200
""")

# Q4: Ringleader fallback (degree centrality on transfer edges)
run_query("Q4 - Ringleader Fallback (Degree)", """
MATCH (p:Person)-[:OWNS]->(a:BankAccount)-[r:TRANSFERRED_TO]-()
WHERE p.id IN ['gamma_kingpin_001', 'gamma_lt_00', 'gamma_lt_01', 'gamma_lt_02', 'gamma_lt_03', 'gamma_lt_04', 'gamma_lt_05', 'gamma_lt_06', 'gamma_lt_07']
RETURN p.id, p.name, count(r) AS degree
ORDER BY degree DESC
LIMIT 10
""")

# Q5: Ring isolation fallback (person-person links via device, IP, money)
run_query("Q5 - Ring Isolation Fallback (Person links)", """
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
""")

# Native WCC test
run_query("NATIVE - WCC (algo.WCC)", """
CALL algo.WCC()
""")

# Native PageRank test
run_query("NATIVE - PageRank (algo.pageRank)", """
CALL algo.pageRank("Person", "TRANSFERRED_TO")
""")

# Native Label Propagation test
run_query("NATIVE - Label Propagation (algo.labelPropagation)", """
CALL algo.labelPropagation("Person", "TRANSFERRED_TO")
""")

print("\n\n" + "="*60)
print("ALL HERO QUERIES TESTED")
print("="*60)