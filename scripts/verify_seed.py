#!/usr/bin/env python3
"""
Syndicate Seed Verification — Independent assertions for CI/docker healthcheck.
Run AFTER seed.py to confirm the graph is correctly seeded.
"""

import os
import sys
from falkordb import FalkorDB

FALKORDB_HOST = os.getenv("FALKORDB_HOST", "localhost")
FALKORDB_PORT = int(os.getenv("FALKORDB_PORT", "6379"))
GRAPH_NAME = os.getenv("GRAPH_NAME", "syndicate")

db = FalkorDB(host=FALKORDB_HOST, port=FALKORDB_PORT)
g = db.select_graph(GRAPH_NAME)

def q(query, params=None):
    return g.query(query, params or {})

def assert_count(label, min_val, max_val=None):
    res = q(f"MATCH (n:{label}) RETURN count(n) AS c")
    count = res.result_set[0][0] if res.result_set else 0
    if count < min_val or (max_val and count > max_val):
        print(f"FAIL: {label} count={count} (expected {min_val}..{max_val or 'inf'})")
        return False
    print(f"OK: {label} = {count}")
    return True

def assert_rel(rel, min_val):
    res = q(f"MATCH ()-[r:{rel}]->() RETURN count(r) AS c")
    count = res.result_set[0][0] if res.result_set else 0
    if count < min_val:
        print(f"FAIL: {rel} count={count} (expected >= {min_val})")
        return False
    print(f"OK: {rel} = {count}")
    return True

def assert_ring_alpha():
    # At least 100 alpha persons linked via shared device+IP
    res = q("""
        MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person),
              (a)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b)
        WHERE a.id STARTS WITH 'alpha_' AND b.id STARTS WITH 'alpha_'
        RETURN count(DISTINCT a) AS linked
    """)
    linked = res.result_set[0][0] if res.result_set else 0
    if linked < 100:
        print(f"FAIL: Alpha dual-entity links = {linked} (expected >= 100)")
        return False
    print(f"OK: Alpha dual-entity links = {linked}")
    return True

def assert_ring_beta():
    # All 40 beta persons share the same IP
    res = q("""
        MATCH (p:Person)-[:LOGGED_FROM]->(ip:IP)
        WHERE p.id STARTS WITH 'beta_'
        RETURN count(DISTINCT p) AS persons, count(DISTINCT ip) AS ips
    """)
    persons, ips = res.result_set[0] if res.result_set else (0, 0)
    if persons < 40 or ips != 1:
        print(f"FAIL: Beta persons={persons}, IPs={ips} (expected 40, 1)")
        return False
    print(f"OK: Beta persons={persons}, shared IP={ips}")
    return True

def assert_ring_gamma():
    # Kingpin has degree >= 8 (connected to 8 lieutenants)
    res = q("""
        MATCH (p:Person {id: 'gamma_kingpin_001'})-[r]-()
        RETURN count(r) AS degree
    """)
    degree = res.result_set[0][0] if res.result_set else 0
    if degree < 8:
        print(f"FAIL: Kingpin degree = {degree} (expected >= 8)")
        return False
    print(f"OK: Kingpin degree = {degree}")

    # 8 lieutenants exist with degree >= 15 (15 mules each)
    res = q("""
        MATCH (p:Person)-[r]-() WHERE p.id STARTS WITH 'gamma_lt_'
        RETURN p.id, count(r) AS degree ORDER BY degree
    """)
    lt_degrees = [row[1] for row in res.result_set]
    if len(lt_degrees) != 8 or any(d < 15 for d in lt_degrees):
        print(f"FAIL: Lieutenants = {len(lt_degrees)}, degrees = {lt_degrees}")
        return False
    print(f"OK: {len(lt_degrees)} lieutenants, min degree = {min(lt_degrees)}")
    return True

def assert_money_trails():
    # Alpha: circular transfers (120 edges)
    res = q("""
        MATCH (a:BankAccount)-[:TRANSFERRED_TO]->(b:BankAccount)
        WHERE a.number STARTS WITH 'ACC_ALPHA_' AND b.number STARTS WITH 'ACC_ALPHA_'
        RETURN count(*) AS c
    """)
    alpha_tx = res.result_set[0][0] if res.result_set else 0
    if alpha_tx < 100:
        print(f"FAIL: Alpha transfers = {alpha_tx} (expected ~120)")
        return False
    print(f"OK: Alpha transfers = {alpha_tx}")

    # Beta: fan-out to collector (40 edges)
    res = q("""
        MATCH (a:BankAccount)-[:TRANSFERRED_TO]->(b:BankAccount {number: 'ACC_BETA_COLLECTOR_001'})
        WHERE a.number STARTS WITH 'ACC_BETA_'
        RETURN count(*) AS c
    """)
    beta_tx = res.result_set[0][0] if res.result_set else 0
    if beta_tx < 35:
        print(f"FAIL: Beta transfers = {beta_tx} (expected 40)")
        return False
    print(f"OK: Beta transfers = {beta_tx}")

    # Gamma: mule->lt (120) + lt->kingpin (8)
    res = q("""
        MATCH (a:BankAccount)-[:TRANSFERRED_TO]->(b:BankAccount)
        WHERE a.number STARTS WITH 'ACC_GAMMA_MULE_' AND b.number STARTS WITH 'ACC_GAMMA_LT_'
        RETURN count(*) AS c
    """)
    gamma_m2l = res.result_set[0][0] if res.result_set else 0

    res = q("""
        MATCH (a:BankAccount)-[:TRANSFERRED_TO]->(b:BankAccount {number: 'ACC_GAMMA_KINGPIN_001'})
        WHERE a.number STARTS WITH 'ACC_GAMMA_LT_'
        RETURN count(*) AS c
    """)
    gamma_l2k = res.result_set[0][0] if res.result_set else 0

    if gamma_m2l < 100 or gamma_l2k < 8:
        print(f"FAIL: Gamma mule->lt={gamma_m2l}, lt->kingpin={gamma_l2k}")
        return False
    print(f"OK: Gamma mule->lt={gamma_m2l}, lt->kingpin={gamma_l2k}")
    return True

def main():
    print("=== Syndicate Seed Verification ===\n")
    checks = [
        ("Total nodes", lambda: assert_count("Person", 2000) and assert_count("Device", 1000) and assert_count("IP", 300) and assert_count("BankAccount", 2000)),
        ("Relationships", lambda: assert_rel("USES_DEVICE", 2000) and assert_rel("LOGGED_FROM", 2000) and assert_rel("OWNS", 2000) and assert_rel("TRANSFERRED_TO", 200)),
        ("Ring Alpha", assert_ring_alpha),
        ("Ring Beta", assert_ring_beta),
        ("Ring Gamma", assert_ring_gamma),
        ("Money Trails", assert_money_trails),
    ]

    all_pass = True
    for name, check in checks:
        print(f"\n--- {name} ---")
        if not check():
            all_pass = False

    print("\n" + "="*40)
    if all_pass:
        print("✅ ALL CHECKS PASSED")
        sys.exit(0)
    else:
        print("❌ SOME CHECKS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()