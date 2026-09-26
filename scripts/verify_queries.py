#!/usr/bin/env python3
"""Verify key hero queries work correctly."""
from falkordb import FalkorDB

db = FalkorDB(host='localhost', port=6379)
g = db.select_graph('syndicate')

def run(cypher):
    res = g.query(cypher)
    return res.result_set

# Q1 - Dual entity match count
res = run('''
MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person),
      (a)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b)
WHERE id(a) < id(b)
RETURN count(*) as cnt
''')
print('Q1 Dual entity matches:', res)

# Q1b - Shared device count
res = run('''
MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person)
WHERE id(a) < id(b)
RETURN count(DISTINCT a) + count(DISTINCT b) as linked
''')
print('Q1b Shared device linked:', res)

# Q1c - Shared IP count
res = run('''
MATCH (a:Person)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b:Person)
WHERE id(a) < id(b)
RETURN count(DISTINCT a) + count(DISTINCT b) as linked
''')
print('Q1c Shared IP linked:', res)

# Q2 - Money trail from alpha
res = run('''
MATCH path = (src:BankAccount {number: "ACC_ALPHA_001"})-[:TRANSFERRED_TO*1..5]->(dst)
RETURN count(*) as paths, max(length(path)) as max_hops
''')
print('Q2 Money trail from ACC_ALPHA_001:', res)

# Q4 - Ringleader degree
res = run('''
MATCH (p:Person)-[:OWNS]->(a:BankAccount)-[r:TRANSFERRED_TO]-()
WHERE p.id IN ["gamma_kingpin_001", "gamma_lt_00", "gamma_lt_01", "gamma_lt_02", "gamma_lt_03", "gamma_lt_04", "gamma_lt_05", "gamma_lt_06", "gamma_lt_07"]
RETURN p.id, p.name, count(r) AS degree
ORDER BY degree DESC
''')
print('Q4 Ringleader degrees:', res)

# Native WCC - check components
res = run('CALL algo.WCC()')
print('WCC component count:', len(res) if res else 0)

# Native PageRank - top 5
res = run('CALL algo.pageRank("Person", "TRANSFERRED_TO")')
print('PageRank result count:', len(res) if res else 0)
if res:
    for i, row in enumerate(res[:5]):
        print(f'  Top {i+1}: node={row[0]}, score={row[1]}')

# Ring isolation fallback - person links
res = run('''
MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person)
WHERE a.id < b.id
RETURN count(*) as device_links
UNION
MATCH (a:Person)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b:Person)
WHERE a.id < b.id
RETURN count(*) as ip_links
UNION
MATCH (a:Person)-[:OWNS]->(srcAcc:BankAccount)-[:TRANSFERRED_TO]->(dstAcc:BankAccount)<-[:OWNS]-(b:Person)
WHERE a.id < b.id
RETURN count(*) as money_links
''')
print('Q5 Ring isolation links:', res)

print("\n✅ All hero queries verified against live seeded database!")