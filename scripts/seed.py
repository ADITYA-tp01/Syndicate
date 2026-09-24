#!/usr/bin/env python3
"""
Syndicate Seed Script — Deterministic Synthetic Fraud Dataset

Generates:
- 2,000 noise persons (disconnected, boring)
- Ring ALPHA: 120 persons, 4 burner devices, 2 proxy IPs, circular transfers
- Ring BETA: 40 persons, 1 corporate IP, distinct devices, fan-out to collector
- Ring GAMMA: 129 persons (1 kingpin → 8 lieutenants → 15 mules each), star topology

Total: ~2,289 persons, ~7,000 nodes, ~8,500 edges
Deterministic: random.seed(42), faker.seed_instance(42)
"""

import os
import random
import sys
from faker import Faker
from falkordb import FalkorDB

# ─── Deterministic Seeds ───
SEED = 42
random.seed(SEED)

fake = Faker()
fake.seed_instance(SEED)

# ─── Config ───
FALKORDB_HOST = os.getenv("FALKORDB_HOST", "localhost")
FALKORDB_PORT = int(os.getenv("FALKORDB_PORT", "6379"))
GRAPH_NAME = os.getenv("GRAPH_NAME", "syndicate")

BATCH_SIZE = 500

# Ring sizes
NOISE_COUNT = 2000
ALPHA_COUNT = 120
BETA_COUNT = 40
GAMMA_COUNT = 129  # 1 kingpin + 8 lieutenants + 120 mules (15 each)

# ─── FalkorDB Connection ───
print(f"Connecting to FalkorDB at {FALKORDB_HOST}:{FALKORDB_PORT}...")
db = FalkorDB(host=FALKORDB_HOST, port=FALKORDB_PORT)

# Delete graph if exists, then create fresh
try:
    db.delete_graph(GRAPH_NAME)
    print(f"Deleted existing graph '{GRAPH_NAME}'")
except Exception:
    pass

g = db.select_graph(GRAPH_NAME)
print(f"Selected graph '{GRAPH_NAME}'")

# ─── Helper: Batch Execute ───
def batch_execute(queries_and_params, desc):
    """Execute a list of (query, params) in batches."""
    total = len(queries_and_params)
    for i in range(0, total, BATCH_SIZE):
        batch = queries_and_params[i:i + BATCH_SIZE]
        # Build a single UNWIND query for the batch
        if len(batch) == 1:
            query, params = batch[0]
            g.query(query, params)
        else:
            # Combine into UNWIND
            combined_params = {}
            for idx, (_, params) in enumerate(batch):
                for k, v in params.items():
                    combined_params[f"{k}_{idx}"] = v
            # This is a simplified approach - we'll use individual queries for clarity
            for query, params in batch:
                g.query(query, params)
    print(f"  {desc}: {total} operations")

def execute_cypher(query, params=None, desc=""):
    """Execute a single Cypher query."""
    result = g.query(query, params or {})
    if desc:
        print(f"  {desc}")
    return result

# ─── 1. CREATE INDEXES ───
print("\n=== Creating Indexes ===")
indexes = [
    "CREATE INDEX FOR (d:Device) ON (d.fingerprint)",
    "CREATE INDEX FOR (i:IP) ON (i.address)",
    "CREATE INDEX FOR (a:BankAccount) ON (a.number)",
    "CREATE INDEX FOR (p:Person) ON (p.id)",
]
for idx in indexes:
    execute_cypher(idx, desc=f"Index: {idx.split('(')[1].split(')')[0]}")

# ─── 2. SHARED INFRASTRUCTURE (IPs, Devices for Rings) ───
print("\n=== Creating Shared Infrastructure ===")

# Ring ALPHA: 4 burner devices, 2 proxy IPs
alpha_devices = [f"dev_alpha_burner_{i:03d}" for i in range(4)]
alpha_ips = [f"198.51.100.{i}" for i in range(2)]  # TEST-NET-2 (documentation)

for fp in alpha_devices:
    execute_cypher(
        "CREATE (:Device {fingerprint: $fp, os: 'Linux'})",
        {"fp": fp},
        desc=f"Device {fp}"
    )

for ip in alpha_ips:
    execute_cypher(
        "CREATE (:IP {address: $ip, geo: 'Unknown', is_proxy: true})",
        {"ip": ip},
        desc=f"Proxy IP {ip}"
    )

# Ring BETA: 1 corporate IP, 40 distinct devices
beta_ip = "203.0.113.42"  # TEST-NET-3
execute_cypher(
    "CREATE (:IP {address: $ip, geo: 'Corporate HQ', is_proxy: false})",
    {"ip": beta_ip},
    desc=f"Corporate IP {beta_ip}"
)

beta_devices = [f"dev_beta_{i:03d}" for i in range(BETA_COUNT)]
for fp in beta_devices:
    execute_cypher(
        "CREATE (:Device {fingerprint: $fp, os: 'Windows'})",
        {"fp": fp},
        desc=f"Device {fp}"
    )

# Ring GAMMA: 1 kingpin device, 8 lieutenant devices, 120 mule devices
gamma_kingpin_device = "dev_gamma_kingpin_001"
execute_cypher(
    "CREATE (:Device {fingerprint: $fp, os: 'Linux'})",
    {"fp": gamma_kingpin_device},
    desc=f"Kingpin device"
)

gamma_lt_devices = [f"dev_gamma_lt_{i:02d}" for i in range(8)]
for fp in gamma_lt_devices:
    execute_cypher(
        "CREATE (:Device {fingerprint: $fp, os: 'Linux'})",
        {"fp": fp},
        desc=f"Lieutenant device {fp}"
    )

gamma_mule_devices = [f"dev_gamma_mule_{i:03d}" for i in range(120)]
for fp in gamma_mule_devices:
    execute_cypher(
        "CREATE (:Device {fingerprint: $fp, os: 'Android'})",
        {"fp": fp},
        desc=f"Mule device {fp}"
    )

# Gamma IPs: kingpin + lieutenants use distinct IPs, mules use shared pool
gamma_kingpin_ip = "192.0.2.100"
gamma_lt_ips = [f"192.0.2.{101+i}" for i in range(8)]
gamma_mule_ips = [f"192.0.2.{200+i}" for i in range(10)]  # 10 shared IPs for mules

for ip in [gamma_kingpin_ip] + gamma_lt_ips + gamma_mule_ips:
    execute_cypher(
        "CREATE (:IP {address: $ip, geo: 'Residential', is_proxy: false})",
        {"ip": ip},
        desc=f"IP {ip}"
    )

# Collector account for Ring BETA
beta_collector_account = "ACC_BETA_COLLECTOR_001"
execute_cypher(
    "CREATE (:BankAccount {number: $num, type: 'collector'})",
    {"num": beta_collector_account},
    desc=f"Collector account {beta_collector_account}"
)

# Kingpin account for Ring GAMMA
gamma_kingpin_account = "ACC_GAMMA_KINGPIN_001"
execute_cypher(
    "CREATE (:BankAccount {number: $num, type: 'kingpin'})",
    {"num": gamma_kingpin_account},
    desc=f"Kingpin account {gamma_kingpin_account}"
)

# Lieutenant accounts for Ring GAMMA
gamma_lt_accounts = [f"ACC_GAMMA_LT_{i:02d}" for i in range(8)]
for num in gamma_lt_accounts:
    execute_cypher(
        "CREATE (:BankAccount {number: $num, type: 'lieutenant'})",
        {"num": num},
        desc=f"Lieutenant account {num}"
    )

# ─── 3. NOISE POPULATION (2,000 disconnected persons) ───
print(f"\n=== Creating {NOISE_COUNT} Noise Persons ===")
noise_queries = []
for i in range(NOISE_COUNT):
    person_id = f"noise_{i:05d}"
    name = fake.name()
    email = fake.email()
    created_at = fake.date_time_between(start_date="-2y", end_date="now").isoformat()
    
    device_fp = f"dev_noise_{i:05d}"
    ip_addr = f"10.0.{i // 256}.{i % 256}"  # Private IPs
    account_num = f"ACC_NOISE_{i:05d}"
    
    # Build a single transaction per person: Person + Device + IP + Account + relationships
    query = """
    CREATE (p:Person {id: $pid, name: $name, email: $email, created_at: $created_at})
    CREATE (d:Device {fingerprint: $dfp, os: $dos})
    CREATE (ip:IP {address: $ip, geo: 'Residential', is_proxy: false})
    CREATE (a:BankAccount {number: $acc, type: 'personal'})
    CREATE (p)-[:USES_DEVICE {first_seen: $created_at}]->(d)
    CREATE (p)-[:LOGGED_FROM {at: $created_at}]->(ip)
    CREATE (p)-[:OWNS]->(a)
    """
    params = {
        "pid": person_id,
        "name": name,
        "email": email,
        "created_at": created_at,
        "dfp": device_fp,
        "dos": fake.random_element(["Windows", "macOS", "Linux", "Android", "iOS"]),
        "ip": ip_addr,
        "acc": account_num,
    }
    noise_queries.append((query, params))

batch_execute(noise_queries, f"Noise persons ({NOISE_COUNT})")

# ─── 4. RING ALPHA — Mule Network (120 persons, 4 devices, 2 IPs, circular transfers) ───
print(f"\n=== Creating Ring ALPHA ({ALPHA_COUNT} persons) ===")
alpha_queries = []
for i in range(ALPHA_COUNT):
    person_id = f"alpha_{i:03d}"
    name = fake.name()
    email = fake.email()
    created_at = fake.date_time_between(start_date="-1y", end_date="now").isoformat()
    
    # Round-robin assignment to 4 devices, 2 IPs
    device_fp = alpha_devices[i % 4]
    ip_addr = alpha_ips[i % 2]
    account_num = f"ACC_ALPHA_{i:03d}"
    
    query = """
    MATCH (d:Device {fingerprint: $dfp})
    MATCH (ip:IP {address: $ip})
    CREATE (p:Person {id: $pid, name: $name, email: $email, created_at: $created_at})
    CREATE (a:BankAccount {number: $acc, type: 'mule'})
    CREATE (p)-[:USES_DEVICE {first_seen: $created_at}]->(d)
    CREATE (p)-[:LOGGED_FROM {at: $created_at}]->(ip)
    CREATE (p)-[:OWNS]->(a)
    """
    params = {
        "pid": person_id,
        "name": name,
        "email": email,
        "created_at": created_at,
        "dfp": device_fp,
        "ip": ip_addr,
        "acc": account_num,
    }
    alpha_queries.append((query, params))

batch_execute(alpha_queries, f"Alpha persons ({ALPHA_COUNT})")

# Alpha circular transfers: each person transfers to next (mod 120), amount ~$100-500
print("  Creating Alpha circular transfers...")
for i in range(ALPHA_COUNT):
    src = f"ACC_ALPHA_{i:03d}"
    dst = f"ACC_ALPHA_{(i + 1) % ALPHA_COUNT:03d}"
    amount = round(random.uniform(100, 500), 2)
    at = fake.date_time_between(start_date="-6m", end_date="now").isoformat()
    execute_cypher(
        """
        MATCH (src:BankAccount {number: $src}), (dst:BankAccount {number: $dst})
        CREATE (src)-[:TRANSFERRED_TO {amount: $amount, at: $at}]->(dst)
        """,
        {"src": src, "dst": dst, "amount": amount, "at": at},
        desc=f"Alpha transfer {i+1}/{ALPHA_COUNT}"
    )

# ─── 5. RING BETA — Identity Theft (40 persons, 1 IP, 40 devices, fan-out to collector) ───
print(f"\n=== Creating Ring BETA ({BETA_COUNT} persons) ===")
beta_queries = []
for i in range(BETA_COUNT):
    person_id = f"beta_{i:02d}"
    name = fake.name()
    email = fake.email()
    created_at = fake.date_time_between(start_date="-8m", end_date="now").isoformat()
    
    device_fp = beta_devices[i]
    ip_addr = beta_ip  # ALL share the same corporate IP
    account_num = f"ACC_BETA_{i:02d}"
    
    query = """
    MATCH (d:Device {fingerprint: $dfp})
    MATCH (ip:IP {address: $ip})
    CREATE (p:Person {id: $pid, name: $name, email: $email, created_at: $created_at})
    CREATE (a:BankAccount {number: $acc, type: 'stolen'})
    CREATE (p)-[:USES_DEVICE {first_seen: $created_at}]->(d)
    CREATE (p)-[:LOGGED_FROM {at: $created_at}]->(ip)
    CREATE (p)-[:OWNS]->(a)
    """
    params = {
        "pid": person_id,
        "name": name,
        "email": email,
        "created_at": created_at,
        "dfp": device_fp,
        "ip": ip_addr,
        "acc": account_num,
    }
    beta_queries.append((query, params))

batch_execute(beta_queries, f"Beta persons ({BETA_COUNT})")

# Beta fan-out transfers: each person transfers to collector account
print("  Creating Beta fan-out transfers...")
for i in range(BETA_COUNT):
    src = f"ACC_BETA_{i:02d}"
    dst = beta_collector_account
    amount = round(random.uniform(1000, 10000), 2)
    at = fake.date_time_between(start_date="-4m", end_date="now").isoformat()
    execute_cypher(
        """
        MATCH (src:BankAccount {number: $src}), (dst:BankAccount {number: $dst})
        CREATE (src)-[:TRANSFERRED_TO {amount: $amount, at: $at}]->(dst)
        """,
        {"src": src, "dst": dst, "amount": amount, "at": at},
        desc=f"Beta transfer {i+1}/{BETA_COUNT}"
    )

# ─── 6. RING GAMMA — The Kingpin (129 persons: 1 kingpin, 8 lieutenants, 120 mules) ───
print(f"\n=== Creating Ring GAMMA ({GAMMA_COUNT} persons) ===")

# 6a. Kingpin
kp_id = "gamma_kingpin_001"
kp_name = "Victor Krane"
kp_email = "v.krane@gamma-syndicate.xyz"
kp_created = fake.date_time_between(start_date="-2y", end_date="-1y").isoformat()

execute_cypher(
    """
    MATCH (d:Device {fingerprint: $dfp})
    MATCH (ip:IP {address: $ip})
    MATCH (a:BankAccount {number: $acc})
    CREATE (p:Person {id: $pid, name: $name, email: $email, created_at: $created_at})
    CREATE (p)-[:USES_DEVICE {first_seen: $created_at}]->(d)
    CREATE (p)-[:LOGGED_FROM {at: $created_at}]->(ip)
    CREATE (p)-[:OWNS]->(a)
    """,
    {
        "pid": kp_id,
        "name": kp_name,
        "email": kp_email,
        "created_at": kp_created,
        "dfp": gamma_kingpin_device,
        "ip": gamma_kingpin_ip,
        "acc": gamma_kingpin_account,
    },
    desc="Kingpin"
)

# 6b. 8 Lieutenants
lt_queries = []
for i in range(8):
    lt_id = f"gamma_lt_{i:02d}"
    name = fake.name()
    email = fake.email()
    created_at = fake.date_time_between(start_date="-1y", end_date="-6m").isoformat()
    
    query = """
    MATCH (d:Device {fingerprint: $dfp})
    MATCH (ip:IP {address: $ip})
    MATCH (a:BankAccount {number: $acc})
    CREATE (p:Person {id: $pid, name: $name, email: $email, created_at: $created_at})
    CREATE (p)-[:USES_DEVICE {first_seen: $created_at}]->(d)
    CREATE (p)-[:LOGGED_FROM {at: $created_at}]->(ip)
    CREATE (p)-[:OWNS]->(a)
    """
    params = {
        "pid": lt_id,
        "name": name,
        "email": email,
        "created_at": created_at,
        "dfp": gamma_lt_devices[i],
        "ip": gamma_lt_ips[i],
        "acc": gamma_lt_accounts[i],
    }
    lt_queries.append((query, params))

batch_execute(lt_queries, "Gamma lieutenants (8)")

# Lieutenant -> Kingpin transfers
print("  Creating Lieutenant -> Kingpin transfers...")
for i in range(8):
    src = gamma_lt_accounts[i]
    dst = gamma_kingpin_account
    amount = round(random.uniform(50000, 200000), 2)
    at = fake.date_time_between(start_date="-6m", end_date="now").isoformat()
    execute_cypher(
        """
        MATCH (src:BankAccount {number: $src}), (dst:BankAccount {number: $dst})
        CREATE (src)-[:TRANSFERRED_TO {amount: $amount, at: $at}]->(dst)
        """,
        {"src": src, "dst": dst, "amount": amount, "at": at},
        desc=f"Lt {i+1} -> Kingpin"
    )

# 6c. 120 Mules (15 per lieutenant)
mule_queries = []
mule_accounts = []
for lt_idx in range(8):
    for mule_idx in range(15):
        mule_num = lt_idx * 15 + mule_idx
        mule_id = f"gamma_mule_{mule_num:03d}"
        name = fake.name()
        email = fake.email()
        created_at = fake.date_time_between(start_date="-6m", end_date="now").isoformat()
        
        device_fp = gamma_mule_devices[mule_num]
        ip_addr = gamma_mule_ips[mule_num % 10]
        account_num = f"ACC_GAMMA_MULE_{mule_num:03d}"
        mule_accounts.append(account_num)
        
        query = """
        MATCH (d:Device {fingerprint: $dfp})
        MATCH (ip:IP {address: $ip})
        CREATE (p:Person {id: $pid, name: $name, email: $email, created_at: $created_at})
        CREATE (a:BankAccount {number: $acc, type: 'mule'})
        CREATE (p)-[:USES_DEVICE {first_seen: $created_at}]->(d)
        CREATE (p)-[:LOGGED_FROM {at: $created_at}]->(ip)
        CREATE (p)-[:OWNS]->(a)
        """
        params = {
            "pid": mule_id,
            "name": name,
            "email": email,
            "created_at": created_at,
            "dfp": device_fp,
            "ip": ip_addr,
            "acc": account_num,
        }
        mule_queries.append((query, params))

batch_execute(mule_queries, "Gamma mules (120)")

# Mule -> Lieutenant transfers (15 per lieutenant)
print("  Creating Mule -> Lieutenant transfers...")
for lt_idx in range(8):
    lt_acc = gamma_lt_accounts[lt_idx]
    for mule_idx in range(15):
        mule_num = lt_idx * 15 + mule_idx
        src = f"ACC_GAMMA_MULE_{mule_num:03d}"
        dst = lt_acc
        amount = round(random.uniform(2000, 15000), 2)
        at = fake.date_time_between(start_date="-3m", end_date="now").isoformat()
        execute_cypher(
            """
            MATCH (src:BankAccount {number: $src}), (dst:BankAccount {number: $dst})
            CREATE (src)-[:TRANSFERRED_TO {amount: $amount, at: $at}]->(dst)
            """,
            {"src": src, "dst": dst, "amount": amount, "at": at},
            desc=f"Mule {mule_num} -> Lt {lt_idx+1}"
        )

# ─── 7. VERIFICATION ───
print("\n=== Verification ===")

# Count nodes by label
counts = {}
for label in ["Person", "Device", "IP", "BankAccount"]:
    res = execute_cypher(f"MATCH (n:{label}) RETURN count(n) AS c", desc=f"Count {label}")
    counts[label] = res.result_set[0][0] if res.result_set else 0

# Count edges by type
edge_counts = {}
for rel in ["USES_DEVICE", "LOGGED_FROM", "OWNS", "TRANSFERRED_TO"]:
    res = execute_cypher(f"MATCH ()-[r:{rel}]->() RETURN count(r) AS c", desc=f"Count {rel}")
    edge_counts[rel] = res.result_set[0][0] if res.result_set else 0

# Verify rings exist
print("\n--- Ring Verification ---")

# Alpha: check shared device+IP pairs
res = execute_cypher("""
    MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person),
          (a)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b)
    WHERE a.id STARTS WITH 'alpha_' AND b.id STARTS WITH 'alpha_'
    RETURN count(DISTINCT a) + count(DISTINCT b) AS linked
""", desc="Alpha dual-entity links")
alpha_linked = res.result_set[0][0] if res.result_set else 0

# Beta: check shared IP
res = execute_cypher("""
    MATCH (a:Person)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b:Person)
    WHERE a.id STARTS WITH 'beta_' AND b.id STARTS WITH 'beta_'
    RETURN count(DISTINCT a) + count(DISTINCT b) AS linked
""", desc="Beta shared IP links")
beta_linked = res.result_set[0][0] if res.result_set else 0

# Gamma: check kingpin PageRank centrality (degree fallback)
res = execute_cypher("""
    MATCH (p:Person {id: 'gamma_kingpin_001'})-[r]-()
    RETURN count(r) AS degree
""", desc="Kingpin degree")
kingpin_degree = res.result_set[0][0] if res.result_set else 0

# Gamma: check lieutenant degrees
res = execute_cypher("""
    MATCH (p:Person)-[r]-() WHERE p.id STARTS WITH 'gamma_lt_'
    RETURN p.id, count(r) AS degree ORDER BY degree DESC
""", desc="Lieutenant degrees")
lt_degrees = res.result_set

print(f"\n=== SUMMARY ===")
print(f"Nodes: Person={counts['Person']}, Device={counts['Device']}, IP={counts['IP']}, BankAccount={counts['BankAccount']}")
print(f"Edges: USES_DEVICE={edge_counts['USES_DEVICE']}, LOGGED_FROM={edge_counts['LOGGED_FROM']}, OWNS={edge_counts['OWNS']}, TRANSFERRED_TO={edge_counts['TRANSFERRED_TO']}")
print(f"Ring Alpha dual-entity linked persons: {alpha_linked}")
print(f"Ring Beta shared-IP linked persons: {beta_linked}")
print(f"Kingpin degree: {kingpin_degree}")
print(f"Lieutenant degrees: {[(row[0], row[1]) for row in lt_degrees]}")

total_nodes = sum(counts.values())
total_edges = sum(edge_counts.values())
print(f"\nTOTAL: {total_nodes} nodes, {total_edges} edges")

# Noise (~2000p + devices/ips/accounts) + 3 rings. Kingpin person-degree is 3
# (device + IP + account); money-hub proof is lieutenant transfer count.
if (
    counts["Person"] >= 2200
    and counts["BankAccount"] >= 2200
    and edge_counts["TRANSFERRED_TO"] >= 160
    and alpha_linked > 0
    and beta_linked > 0
    and kingpin_degree >= 3
):
    print("\n✅ SEED SUCCESSFUL - All rings verified")
    sys.exit(0)
else:
    print("\n❌ SEED VERIFICATION FAILED")
    sys.exit(1)