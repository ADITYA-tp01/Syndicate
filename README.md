# Syndicate

> Rows hide the ring. The graph reveals the ringleader. The AI writes the brief.

**Track: Investigation and Risk**  
WeMakeDevs — Graph Hacks: Building Next-Gen RAG × FalkorDB (September 2026)

## The Problem

Fraud lives in *connections*, not rows. 2,289 suspects hide three engineered rings. Vector RAG cannot walk a 5-hop money trail or cluster shared devices/IPs. A knowledge graph can.

## How It Works (GraphRAG pipeline)

1. **Graph algorithms** — FalkorDB Cypher extracts person-person links (shared device, shared IP, money). Backend WCC (union-find) isolates rings. Degree on `TRANSFERRED_TO` ranks the ringleader (PageRank if native algos exist).
2. **Identity resolution** — Dual-entity match: persons sharing BOTH a device AND an IP.
3. **Evidence trail** — Variable-length `[:TRANSFERRED_TO*1..5]` money traces.
4. **AI Investigation Brief** — LLM narrates graph evidence with the exact Cypher queries as data sources.

## Graph Data Model

```cypher
(:Person      {id, name, email, created_at})
(:Device      {id, fingerprint, os})
(:IP          {address, geo, is_proxy})
(:BankAccount {number, type})

(:Person)-[:USES_DEVICE   {first_seen}]->(:Device)
(:Person)-[:LOGGED_FROM   {at}]->(:IP)
(:Person)-[:OWNS]->(:BankAccount)
(:BankAccount)-[:TRANSFERRED_TO {amount, at}]->(:BankAccount)
```

**Engineered rings (deterministic `seed(42)`):**

| Ring | Size | Pattern |
|---|---|---|
| ALPHA — mule network | 120 | 4 burner devices + 2 proxy IPs, circular transfers |
| BETA — identity theft | 40 | One corporate IP, fan-out to a collector account |
| GAMMA — kingpin | 129 | 1 kingpin → 8 lieutenants → 15 mules each |

## Setup

### Option A — local (dev)

```bash
# 1. Graph DB
docker run -p 6379:6379 -d --name syndicate-falkordb falkordb/falkordb:latest

# 2. Seed (Python)
pip install -r scripts/requirements.txt
python scripts/seed.py
python scripts/verify_seed.py

# 3. App
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3000

### Option B — docker compose (judge path)

```bash
cp .env.example .env   # optional OPENAI_API_KEY for briefs
docker compose up --build
```

FalkorDB :6379 · app :3000. Seed runs once, then the web service starts.

### Option C — live deployment

Stretch. Local docker-compose is the submission path if FalkorDB Cloud is unavailable.

## Cypher (hero queries)

All queries live in `lib/queries.ts`. Highlights:

- Dual identity: persons sharing device **and** IP
- Money trail: `[:TRANSFERRED_TO*1..5]`
- Ring isolate fallback: person–person links via device / IP / money, clustered in `lib/graph-algos.ts`
- Ringleader fallback: transfer degree (kingpin of Ring Gamma should rank #1)

## AI Usage Disclosure

- AI-assisted coding (Hermes Agent / IDE assistants) — disclosed
- LLM API (GPT-4o-mini) for Investigation Brief generation — optional, set `OPENAI_API_KEY`
- Graph algorithms and Cypher are deterministic, non-AI

## Status

Day 1 scaffold: seed, docker-compose, Next.js shell, route handlers, query inspector, graph canvas. Algorithm branch defaults to **Cypher + union-find / degree** until `CALL dbms.procedures()` is verified.
