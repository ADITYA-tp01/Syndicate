# Syndicate — Master Plan 

**Hackathon:** WeMakeDevs — Graph Hacks: Building Next-Gen RAG × FalkorDB (September 2026)
**Target:** Track 01 — Investigation and Risk (share of $10,000)
**Project:** Syndicate — GraphRAG Fraud Ring Investigator
**Tagline:** *Rows hide the ring. The graph reveals the ringleader. The AI writes the brief.*
**Mode:** Solo · Fresh Start

---

## 0. HACKATHON THEME ALIGNMENT

The hackathon is called **"Building Next-Gen RAG."** The brief says: *"Combine knowledge graphs, LLMs, and autonomous agents into something fast, accurate, and explainable."* The core problem: *"Vector RAG breaks down on multi-step reasoning and on entities spread across documents."*

**What this means for Syndicate:** Pure graph analytics is not enough to win. Every feature must prove that the **graph does the reasoning** AND that we can **pipe graph results into an LLM** to produce explainable, human-readable intelligence. The graph is the engine. The LLM is the narrator. Neither works alone. This is what makes it "Next-Gen RAG" — structured, multi-hop graph context fed to an LLM with source attribution, not vector similarity search.

---

## 0.1 VERIFICATION STATUS (Honesty Layer)

Every technical claim is labeled:

| Label | Meaning |
|---|---|
| ✅ **VERIFIED** | Confirmed from official hackathon rules/docs during research |
| 🔶 **CONFIDENT** | Standard FalkorDB behavior from docs knowledge — confirm at kickoff |
| 🔴 **VERIFY DAY 0** | Unverified assumption with a built-in fallback. Must be tested before coding |

**The 4 🔴 items (all have fallbacks):**
1. Exact `algo.*` procedure syntax (WCC / PageRank) → Fallback: Cypher + networkx post-processing
2. FalkorDB Cloud free-tier availability → Fallback: docker-compose is the official judge path
3. Cytoscape.js performance at scale → Fallback: render suspicious subgraph only (~600 nodes)
4. Exact hackathon start/end dates → Plan is phase-based, maps to any window

---

## 1. HACKATHON RULES (✅ VERIFIED from wemakedevs.org/hackathons/falkordb/rules)

| # | Rule | Detail |
|---|---|---|
| 1 | **When** | September 2026, online, worldwide. Exact dates TBA — watch WeMakeDevs + FalkorDB Discord |
| 2 | **Teams** | Solo or up to 4. One team per person. (You: **SOLO**) |
| 3 | **FalkorDB mandatory** | Must be the primary graph DB powering a *central* feature |
| 4 | **THE GOLDEN RULE (Rule 3)** | *"If the product still works once FalkorDB is taken out, the graph is decoration."* — Everything is designed around this |
| 5 | **Data rules** | Public, synthetic, or your own ONLY. No private/login/paywalled/personal data |
| 6 | **One track per submission** | We enter **Track 01: Investigation and Risk** — named explicitly at submission |
| 7 | **Pre-planning allowed** | Notes, diagrams, **graph model sketches**, planning docs allowed before start. Coding after start |
| 8 | **Libraries/frameworks OK** | Any language, framework, deployment platform |
| 9 | **AI assistants allowed** | Must be **disclosed**; you must be able to explain every decision |
| 10 | **No pure AI-gen** | Meaningful human contribution + understanding required. You'll own every Cypher query |
| 11 | **IP** | Belongs to you |

### Submission Checklist (Rule 9 — the complete list)
- [ ] Public source-code repository
- [ ] README with **setup instructions AND your graph data model**
- [ ] **The Cypher queries / graph algorithms the product depends on** (dedicated README section)
- [ ] Demo video showing the working project
- [ ] Live deployment **OR** complete local setup instructions
- [ ] Track named: *"Investigation and Risk"*
- [ ] AI usage disclosure

### Track 01 Judging Focus (what we optimize for)
| Key Focus | How Syndicate Hits It |
|---|---|
| Multi-hop link analysis | Variable-length path queries (`*1..5`) as core feature |
| Identity resolution | Linking suspects through shared devices AND IPs (dual-entity match) |
| Fraud ring detection | Community clustering isolates rings from noise |
| Evidence & case mapping | Per-ring case file: members, devices, IPs, money flow |
| **Explainable results** | Every answer shows the exact Cypher path that produced it + LLM-generated Investigation Brief with source attribution back to the queries |

**Strategy:** Win Track 01 on *explainability + visual drama + GraphRAG narrative*. The graph does the math, the LLM explains it. Secondary: the polished UI is strong enough to be remembered in any "best overall" discussion.

---

## 2. FALKORDB — CAPABILITIES & HOW WE USE THEM

| Feature | What It Does | Status | How Syndicate Uses It |
|---|---|---|---|
| **Cypher pattern matching** | `MATCH (a)-[:REL]->(b)` | 🔶 CONFIDENT | Every investigation query |
| **Variable-length paths** | `[:TRANSFERRED_TO*1..5]` | 🔶 CONFIDENT | Money trail tracing (the hero feature) |
| **Sub-millisecond traversals** | Sparse-matrix engine (GraphBLAS) | ✅ VERIFIED (their core pitch) | Live queries during demo, timing shown on screen |
| **Graph algorithms** | PageRank, community detection, etc. | 🔴 VERIFY DAY 0 | Ring isolation + ringleader detection (with fallback) |
| **Indexes** | `CREATE INDEX` | 🔶 CONFIDENT | Fast lookup by device fingerprint / IP / account number |
| **Docker deployment** | `docker run falkordb/falkordb` on port 6379 | 🔶 CONFIDENT | Local dev + judge setup |
| **FalkorDB Cloud** | Managed instance | 🔴 VERIFY DAY 0 | Stretch deployment (not required) |
| **Python + Node.js clients** | Official drivers | 🔶 CONFIDENT | Python = seeder, Node.js = app backend |
| **FalkorDB Browser** | Visual query explorer | 🔶 CONFIDENT | Debugging + README screenshots |

### Critical Architecture Insight (same class as TrueForge's "server, not library")
> FalkorDB speaks the **Redis protocol on port 6379**. Clients connect like a Redis client. The graph lives in a *named graph* inside the server. You `select_graph('name')`, then run Cypher. There is no ORM, no migration system — **your schema is your Cypher and your indexes, created at seed time.**

---

## 3. ARCHITECTURE (Solo-Optimized — Fewest Moving Parts)

```text
┌────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP (one repo)                  │
│                                                            │
│  ┌──────────────────────┐   ┌───────────────────────────┐  │
│  │  INVESTIGATOR UI     │   │  ROUTE HANDLERS (API)     │  │
│  │  Next.js + Tailwind  │──▶│  falkordb Node.js client  │  │
│  │  shadcn/ui           │   │                           │  │
│  │  Cytoscape.js canvas │   │  /api/rings/isolate       │  │
│  │                      │   │  /api/rings/[id]/leader   │  │
│  └──────────────────────┘   │  /api/trace               │  │
│                             │  /api/report (LLM, opt.)  │  │
│                             └─────────────┬─────────────┘  │
└───────────────────────────────────────────┼────────────────┘
                                            │ Redis protocol :6379
                                            ▼
┌────────────────────────────────────────────────────────────┐
│                     FALKORDB (Docker)                      │
│                                                            │
│  Graph: "syndicate"                                        │
│  ~7,000 nodes · ~8,500 edges · 3 hidden fraud rings        │
│  Indexes: Device.fingerprint · IP.address · Account.number │
└────────────────────────────────────────────────────────────┘
                                            ▲
                                            │ One-time seed (Python)
┌────────────────────────────────────────────────────────────┐
│              SEED SCRIPT (scripts/seed.py)                 │
│  faker + deterministic seed(42)                            │
│  2,000 noise users + Ring Alpha + Ring Beta + Ring Gamma   │
└────────────────────────────────────────────────────────────┘
```

**v1 → v2 fixes:**
- ❌ Removed separate FastAPI backend. ✅ Node.js FalkorDB client lives in Next.js route handlers = **one deployable unit**, fewer failure points for a solo dev.
- Python exists ONLY for the seed script (faker is unbeatable there).
- UI never renders the full 7k-node graph. It renders **query results** — performant AND mirrors real investigation workflow (seed → expand).

---

## 4. WHAT WE BUILD (Scoped for a 7-Day Sprint)

### MUST HAVE (won't ship without)
| # | Component | What | FalkorDB/RAG Feature Proven |
|---|---|---|---|
| 1 | **Seed script** | Deterministic synthetic dataset: 2,000 noise users + 3 engineered fraud rings | Graph modeling, indexes |
| 2 | **Graph canvas** | Cytoscape.js view of investigation results | Traversal results as nodes/edges |
| 3 | **Shared-entity finder** | "Which suspects share this device AND this IP?" (dual-entity identity resolution) | 2-hop pattern matching |
| 4 | **Money trail tracer** | Follow transfers up to 5 hops from any account | Variable-length paths `*1..5` |
| 5 | **Ring isolation** | Cluster the suspicious subgraph into distinct rings | WCC algo (or Cypher+networkx fallback) |
| 6 | **Ringleader detection** | Rank nodes within a ring, highlight the hub | PageRank (or degree-centrality Cypher fallback) |
| 7 | **Case file view** | Per-ring evidence report: members, shared entities, money paths, **the exact Cypher used** | Explainable results |
| 8 | **Query inspector panel** | Live side-panel showing the exact Cypher + execution time for every action | Proof the graph does the work |
| 9 | **AI Investigation Brief** | LLM takes the graph evidence (WCC clusters, PageRank scores, evidence paths, identity matches) and generates a structured Investigation Brief with source attribution back to the exact Cypher queries. This is the **GraphRAG layer** — the graph reasons, the LLM explains. | **GraphRAG: LLM + graph context + source attribution** |
| 10 | **docker-compose** | One-command judge setup: FalkorDB + seed + app | Deployment rule |
| 11 | **Demo video + README** | Per submission checklist | Rule 9 |

### NICE TO HAVE (after Day 5, only if green)
| # | Component | Why |
|---|---|---|
| 12 | Timeline scrubber | Watch a ring grow over time (timestamps on edges) |
| 13 | Export case file to PDF | Investigator realism |
| 14 | FalkorDB Cloud deployment | Live URL bonus (only if Day 0 verification passes) |

### WILL NOT BUILD
❌ Real banking APIs / real data (Rule 6 + time sink)
❌ Auth / multi-tenancy
❌ Custom graph rendering engine (Cytoscape.js, done)
❌ Full GraphRAG SDK pipeline (that's Track 03 — we do targeted LLM calls with graph context, not ontology-from-docs)
❌ Multi-agent orchestration / autonomous loops (Track 02 territory — we use a single deterministic LLM call, not an agent)
❌ Mobile layout
❌ Streaming/real-time ingestion

---

## 5. GRAPH MODEL & CYPHER — THE CORE ENGINE

### 5.1 Data Model (must appear in README — Rule 9)

```cypher
// ── NODES ──────────────────────────────────────────────
(:Person      {id, name, email, created_at})
(:Device      {id, fingerprint, os})
(:IP          {address, geo, is_proxy})
(:BankAccount {number, type})

// ── EDGES ──────────────────────────────────────────────
(:Person)-[:USES_DEVICE   {first_seen}]->(:Device)
(:Person)-[:LOGGED_FROM   {at}]->(:IP)
(:Person)-[:OWNS]->(:BankAccount)
(:BankAccount)-[:TRANSFERRED_TO {amount, at}]->(:BankAccount)

// ── INDEXES (seed time) ───────────────────────────────
CREATE INDEX FOR (d:Device)      ON (d.fingerprint);
CREATE INDEX FOR (i:IP)          ON (i.address);
CREATE INDEX FOR (a:BankAccount) ON (a.number);
CREATE INDEX FOR (p:Person)      ON (p.id);
```

### 5.2 The Hero Queries (these go verbatim in README + demo)

**Q1 — Identity resolution (dual-entity match — persons sharing BOTH a device AND an IP):**
```cypher
// Find "different" persons who are likely the same person
// because they share BOTH a device AND an IP address
MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person),
      (a)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b)
WHERE id(a) < id(b)
RETURN a.name AS person_a, b.name AS person_b,
       d.fingerprint AS shared_device, ip.address AS shared_ip
ORDER BY shared_device;
```

**Q1b — Shared-entity detection (single-entity, broader net):**
```cypher
MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person)
WHERE id(a) < id(b)
RETURN d.fingerprint AS device,
       collect(DISTINCT a.name) + collect(DISTINCT b.name) AS linked_suspects
ORDER BY size(linked_suspects) DESC
LIMIT 10;
```

**Q2 — Money trail (multi-hop, the showstopper):**
```cypher
MATCH path = (src:BankAccount {number: $account})-[:TRANSFERRED_TO*1..5]->(dst)
RETURN path, length(path) AS hops
ORDER BY hops DESC;
```

**Q3 — Ego-network expansion (investigator workflow):**
```cypher
MATCH (seed:Person {id: $person_id})-[r*1..2]-(n)
RETURN seed, r, n;
```

**Q4 — Ringleader fallback (degree centrality — guaranteed to work):**
```cypher
MATCH (p:Person)-[r]-(n)
WHERE p.id IN $ring_members
RETURN p.name, count(r) AS degree
ORDER BY degree DESC
LIMIT 3;
```

**Q5 — Ring isolation fallback (if no native WCC):**
```cypher
// Pull the suspicious subgraph (degree ≥ 2 people + neighbors)
MATCH (p:Person)-[r]-(n)
WITH p, count(r) AS deg WHERE deg >= 2
MATCH (p)-[*1..3]-(connected)
RETURN DISTINCT p, connected;
// → union-find clustering in backend (~20 lines Python/JS)
```

### 5.3 Algorithm Strategy (the v1 fix)
```text
Day 0: run `CALL dbms.procedures()` (or check docs)
        │
        ├─ algo procs EXIST ──▶ use native WCC + PageRank (best story)
        │
        └─ algo procs MISSING ─▶ FalkorDB does ALL traversal via Cypher,
                                 backend runs networkx WCC/PageRank on the
                                 fetched subgraph (~20 lines).
                                 README explains: "FalkorDB extracts the
                                 subgraph in <5ms; ranking is post-processing."
```
Either way, **remove FalkorDB and the product dies** — the multi-hop extraction across 7k entities is the engine. Rule 3 satisfied in both branches. 🔴→✅

### 5.4 The GraphRAG Layer (the differentiator)

This is what separates us from every other "graph visualization" project. The LLM doesn't *replace* the graph — it *narrates* the graph's findings.

**How it works:**
1. User runs the investigation flow: Isolate Rings → Find Ringleader → Evidence Trail → Identity Resolution
2. User clicks **"Generate Investigation Brief"**
3. Backend collects all graph evidence: (a) WCC cluster data, (b) PageRank scores, (c) evidence path, (d) identity resolution matches
4. All serialized into a structured prompt → single LLM call (GPT-4o-mini or Gemini Flash — cheap, fast)
5. LLM returns a structured Investigation Brief
6. **Every claim in the report cites the exact Cypher query that produced it** — this is source attribution

**The Prompt Template:**
```text
You are a financial crime analyst. Based on the following graph database
evidence, write a structured Investigation Brief.

GRAPH EVIDENCE:
- Fraud ring detected via Weakly Connected Components: [WCC_DATA]
- Central suspect identified via PageRank: [PAGERANK_RESULTS]
- Money trail traced via Cypher shortestPath: [EVIDENCE_PATH]
- Identity resolution matches (shared device + IP): [IDENTITY_MATCHES]

OUTPUT FORMAT:
## Investigation Brief — Case [RING_ID]
### Executive Summary (2-3 sentences)
### Primary Suspect (name, PageRank score, reasoning)
### Evidence Chain (numbered list of transactions/connections)
### Identity Resolution Flags (suspected duplicate identities)
### Risk Assessment (LOW/MEDIUM/HIGH/CRITICAL with justification)
### Recommended Action (1-2 sentences)
### Data Sources (list the exact Cypher queries used — verbatim)
```

**Why this wins:** The judge sees the *graph* do the math, and the *LLM* explain it in plain English with source attribution. Vector RAG can't do this — it can't traverse 5-hop money trails or cluster connected components. This is textbook Next-Gen RAG.

### 5.5 The SQL Framing (don't get caught)
**NEVER say:** "SQL can't do this."
**ALWAYS say:** *"In SQL, a 5-hop trail means recursive CTEs or five self-joins that re-scan tables on every hop — seconds at this scale, and unreadable. In FalkorDB, the relationship is stored once and the query IS the pattern: one line, sub-millisecond. Same answer, different universe of effort."*

---

## 6. SYNTHETIC DATA GENERATOR (`scripts/seed.py`)

**Deterministic. Reproducible. Engineered for the demo.** `random.seed(42)`.

| Population | Size | Design | Demo Purpose |
|---|---|---|---|
| **Noise** | 2,000 persons (≈5,500 nodes total with their devices/accounts + shared IP pool of 500) | Fully disconnected, boring, 1 device + 1 account each | Proves rings hide in scale |
| **Ring ALPHA** — *Mule Network* | 120 persons | Share only 4 burner devices + 2 proxy IPs; circular `TRANSFERRED_TO` loops | Shared-entity detection demo |
| **Ring BETA** — *Identity Theft* | 40 persons | All `LOGGED_FROM` one corporate IP, distinct devices, fan-out transfers to 1 collector account | IP-based identity resolution |
| **Ring GAMMA** — *The Kingpin* | 129 persons (1 kingpin → 8 lieutenants → 15 mules each) | Star topology; money flows mule→lieutenant→kingpin | **PageRank demo — kingpin MUST rank #1** |

**Totals:** ~2,289 suspects · ~7,000 nodes · ~8,500 edges.

**Seed script contract:**
1. Connect to FalkorDB → `select_graph("syndicate")` (delete if exists)
2. Create indexes
3. Batch-insert with parameterized Cypher (batches of 500 — 🔶 verify bulk perf Day 0; fallback: `CREATE` in UNWIND loops)
4. Print verification counts + confirm 3 rings exist
5. Exit 0 → docker-compose `seeded` healthcheck passes

---

## 7. INVESTIGATOR UI (Next.js)

**Stack:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · **react-cytoscapejs**

| Page/Panel | Purpose |
|---|---|
| `/` Overview | Stats bar (entities, relationships, query latency), "Start Investigation" CTA, SQL-vs-Graph comparison card |
| `/investigate` | Left: Cytoscape canvas · Right: control dock (Search entity · Trace money · Isolate rings · Find ringleader) · Bottom: **Query Inspector** (live Cypher + ms timing) |
| `/case/[ringId]` | Case file: member table, shared devices/IPs, money-flow diagram, confidence rationale, export button |

**UX details that win judges:**
- Every button click → Query Inspector lights up with the exact Cypher + `executed in 3ms`
- Rings color-coded on isolation (Cytoscape style update, no re-fetch)
- Ringleader node **pulses red** (CSS/Cytoscape animation)
- Dark theme, monospace Cypher panels — "security ops center" aesthetic (your home turf)

---

## 8. DEMO SCRIPT (3 Minutes — Judge-Spoonfeeding v2)

| Time | On Screen | Judge Writes Down |
|---|---|---|
| 0:00–0:15 | **Hook:** "2,289 suspects. Three hidden fraud rings. The fraud lives in the *connections* — and rows can't show connections." | "Clear problem framing. Graph is necessary." |
| 0:15–0:35 | **SQL-vs-Graph card:** recursive-CTE pain vs. one line of Cypher. Honest framing. | "Understands WHY graphs. No overclaims." |
| 0:35–1:00 | **Search + Trace:** search a mule account → click **Trace Money** → 5-hop path animates across canvas. Query Inspector: `*1..5` Cypher, `4ms`. | "Multi-hop link analysis ✅. Sub-millisecond ✅." |
| 1:00–1:25 | **Isolate Rings:** click **Isolate Rings** → suspicious subgraph snaps into 3 color-coded clusters. | "Fraud ring detection ✅. Graph algorithms doing real work ✅." |
| 1:25–1:50 | **Find the Ringleader:** select Ring Gamma → click **Find Ringleader** → kingpin pulses red. PageRank scores visible. | "Ringleader detection ✅. Explainable results ✅." |
| 1:50–2:10 | **Identity Resolution:** click **Resolve Identities** → 3 pairs of "different" persons flagged as suspected duplicates (shared device + IP). | "Identity resolution ✅. Core Track 01." |
| 2:10–2:40 | **AI Investigation Brief:** click **Generate Brief** → LLM produces a structured Investigation Brief: Executive Summary, Primary Suspect, Evidence Chain, Risk Assessment. Scroll to bottom — **"Data Sources" section lists the exact Cypher queries used.** | "GraphRAG ✅! LLM + graph context + source attribution. THIS is Next-Gen RAG." |
| 2:40–3:00 | **Close:** "The graph does the math. The AI writes the brief. Syndicate: GraphRAG for fraud investigation. Built on FalkorDB." + repo/setup shot. | "Polished. Complete. Full GraphRAG pipeline." |

**Memorized 30-second judge answer:**
*"Syndicate is a GraphRAG fraud investigator. FalkorDB's graph algorithms — connected components and PageRank — do the mathematical reasoning to detect fraud rings and identify ringleaders in milliseconds. The graph evidence is then piped into an LLM to generate a structured Investigation Brief with source attribution back to the exact Cypher queries. Vector RAG can't do multi-hop reasoning across 7,000 linked entities — a knowledge graph can. That's what makes this Next-Gen RAG."*

---

## 9. FALKORDB INTEGRATION PROOF (Rule 3 armor)

| Judge Thought | Our Proof |
|---|---|
| "Is FalkorDB just a data dump under a visualization?" | Every action fires a live Cypher query — visible in Query Inspector with timing |
| "Would this work on Postgres?" | Show the 5-hop trace: one Cypher pattern vs. recursive CTE; show ms timing |
| "Are they actually using graph capabilities?" | Variable-length paths + indexes + (native algos OR documented subgraph extraction) |
| "Where's the RAG / LLM component?" | AI Investigation Brief: graph evidence → structured LLM prompt → report with Cypher source attribution. The graph provides the context that vector RAG can't (multi-hop, connected components). |
| "Can I run it?" | `docker compose up` → seeded graph + app on localhost in one command |
| "Do they understand it?" | README explains the data model, every query, the algorithm fallback decision, and the GraphRAG pipeline |

---

## 10. PHASE 0 — PRE-HACKATHON (NOW → Kickoff)

**Today (Sep 1):**
- [ ] **REGISTER** via the Google Form (free, <1 min; early-registration perks have been hinted)
- [ ] Join WeMakeDevs Discord + FalkorDB Discord (both are official help channels during the event)

**Before kickoff — the Day-0 Verification Protocol (do ALL of these):**
- [ ] 🔴 `docker run -p 6379:6379 -d falkordb/falkordb:latest` → connect with `redis-cli` or Python client
- [ ] 🔶 `pip install falkordb` → create graph, `CREATE`/`MATCH` round-trip works
- [ ] 🔴 Run `CALL dbms.procedures()` → **write down exact algorithm procedure names + syntax** (this decides the algo branch in §5.3)
- [ ] 🔶 `npm install falkordb` → connect from Node, run a query
- [ ] 🔴 FalkorDB Cloud: sign up → does a free instance exist? connection string + TLS from a serverless context?
- [ ] 🔴 Cytoscape.js spike: render 600 nodes + style update → confirm smooth
- [ ] 🔶 Test bulk seeding speed: UNWIND batches of 500
- [ ] 🔶 LLM API key: get an API key for OpenAI (GPT-4o-mini) or Gemini Flash. Test a single API call from Node.js. Confirm structured output works.
- [ ] Confirm exact start/end times + kickoff session on the schedule page/Discord
- [ ] Sketch the data model diagram (allowed pre-planning — put it straight into README)

**Exit criteria:** every 🔴 is now ✅ or its fallback is chosen. Zero unknowns when coding starts.

---

## 11. SPRINT SCHEDULE (Day 1–7 — map to real dates at kickoff)

**Day 1 — Foundation**
- New repo + README skeleton (with data model diagram from Phase 0)
- `docker-compose.yml`: falkordb + web
- `scripts/seed.py` complete: noise + all 3 rings + indexes + verification output
- ✅ **SUCCESS:** seeded graph verified in FalkorDB Browser; screenshot for README

**Day 2 — The Engine (Cypher day)**
- All hero queries (Q1–Q5) implemented and tested against real data
- Algorithm branch finalized (native vs. fallback) based on Day 0 findings
- Query timing harness (every query returns `{result, cypher, ms}`)
- ✅ **SUCCESS:** every MUST-HAVE query returns correct results from CLI

**Day 3 — App Skeleton**
- Next.js + Tailwind + shadcn/ui shell
- Route handlers wired to FalkorDB Node client
- Query Inspector component (live Cypher + timing)
- ✅ **SUCCESS:** click "Trace Money" in browser → path renders from live query

**Day 4 — Investigation Features**
- Shared-entity finder UI
- Ring isolation (cluster coloring on canvas)
- Ringleader detection (pulse animation)
- ✅ **SUCCESS:** full investigation flow works end-to-end, unstyled

**Day 5 — The AI Layer (GraphRAG day)**
- `/case/[ringId]` evidence report page with case file view
- Build the **"Generate Investigation Brief"** button
- Implement the LLM call with the prompt template from §5.4
- Render the structured brief in a slide-out panel
- Add source attribution: clickable Cypher query references in the "Data Sources" section
- Edge cases: LLM timeout → show "generating..." state; LLM failure → show graph evidence without the brief
- Error/empty/loading states everywhere
- ✅ **SUCCESS:** full GraphRAG flow works: investigate → generate brief → brief cites Cypher queries

**Day 6 — Polish + Demo Prep**
- Dark theme, animations, stats bar, SQL-vs-Graph card
- Record demo 5+ times; fix what breaks
- README: setup, data model, Cypher section, GraphRAG pipeline explanation, track name, AI disclosure
- ✅ **SUCCESS:** demo lands clean 3× in a row

**Day 7 — FREEZE + SUBMIT**
- **NO NEW FEATURES.**
- Final video · README polish · docker-compose fresh-clone test (ask a friend or use a clean machine/VM)
- Submit with track named: *Investigation and Risk*
- ✅ **SUCCESS:** submitted before deadline

---

## 12. README STRUCTURE (Rule 9-proof)

```markdown
# Syndicate
> Rows hide the ring. The graph reveals the ringleader. The AI writes the brief.
**Track: Investigation and Risk**

## The Problem (fraud lives in connections, not rows)
## Demo Video
## How It Works (The GraphRAG Pipeline)
  ### 1. Graph Algorithms (WCC + PageRank — ring isolation & ringleader detection)
  ### 2. Identity Resolution (dual-entity pattern matching)
  ### 3. Evidence Trail (shortestPath money tracing)
  ### 4. AI Investigation Brief (LLM + graph context = GraphRAG)
## Graph Data Model (diagram + node/edge tables)
## The Cypher Queries (each hero query + what it proves)
## Graph Algorithms Used (native or fallback — explained honestly)
## Architecture
## Tech Stack
## Setup (judge path)
  ### Option A: docker compose up (one command)
  ### Option B: manual (FalkorDB Docker + seed + npm)
  ### Option C: live deployment (if Cloud works out)
## Features
## AI Usage Disclosure
  - AI-assisted coding (Antigravity IDE) — disclosed
  - LLM API (GPT-4o-mini / Gemini Flash) for Investigation Brief generation — disclosed
  - All graph algorithms and Cypher queries are deterministic, non-AI
## Challenges & Learnings
```

---

## 13. PROJECT STRUCTURE

```text
syndicate/
 ├── app/                        # Next.js App Router
 │   ├── page.tsx                # Overview
 │   ├── investigate/page.tsx    # Canvas + control dock
 │   ├── case/[ringId]/page.tsx  # Case file
 │   ├── api/
 │   │   ├── trace/route.ts      # Money trail (Q2)
 │   │   ├── shared/route.ts     # Shared entities (Q1)
 │   │   ├── rings/isolate/route.ts   # WCC branch
 │   │   ├── rings/[id]/leader/route.ts  # PageRank branch
 │   │   └── report/route.ts     # AI Analyst (optional)
 │   └── components/
 │       ├── GraphCanvas.tsx     # react-cytoscapejs
 │       ├── QueryInspector.tsx  # live Cypher + ms
 │       └── CaseFile.tsx
 ├── lib/
 │   ├── falkordb.ts             # client singleton
 │   ├── queries.ts              # ALL Cypher in one place (README source)
 │   └── graph-algos.ts          # fallback clustering/ranking
 ├── scripts/
 │   ├── seed.py                 # deterministic dataset
 │   └── verify_seed.py          # ring-existence assertions
 ├── docker-compose.yml          # falkordb + seed + web
 ├── Dockerfile
 ├── README.md
 └── .env.example                # FALKORDB_HOST/PORT, OPENAI_KEY (optional)
```

---

## 14. TECH STACK (Final)

| Layer | Choice | Why |
|---|---|---|
| Graph DB | FalkorDB (Docker local; Cloud stretch) | Mandatory; sub-ms traversals |
| App backend | Next.js route handlers + `falkordb` Node client | One deployable, zero extra services |
| Graph viz | react-cytoscapejs | Industry standard, handles 600-node subgraphs smoothly |
| Frontend | Next.js + Tailwind + shadcn/ui | Your proven stack from TrueForge |
| Seeder | Python + faker | Best synthetic-data tooling |
| LLM (**core**) | OpenAI GPT-4o-mini or Gemini Flash via route handler | AI Investigation Brief — GraphRAG layer. Disclosed in README. |
| Judge setup | docker-compose | One command, rule-compliant |

---

## 15. CONTINGENCY TABLE

| If This Fails | Do This Instead |
|---|---|
| No native algo procedures | Cypher subgraph extraction + networkx WCC/PageRank (§5.3) — document the choice, it's still graph-powered |
| Cytoscape lags | Cap canvas at suspicious subgraph (~600 nodes); full graph stays in DB, proven by Cypher panel |
| FalkorDB Cloud unavailable/awkward | docker-compose local setup IS the submission path (fully rule-compliant) |
| Bulk seeding slow | UNWIND batches; worst case cut noise to 1,000 persons (rings untouched) |
| LLM unavailable/rate-limited | Pre-generate 3 sample briefs during dev. Cache them. Show cached brief in demo with note "Generated via GPT-4o-mini." Graph features still work independently. |
| Query timing looks bad | Pre-warm indexes, re-record; show median of 3 runs |
| Docker networking confusion | App container reaches DB via compose service name `falkordb:6379`, never `localhost` |
| LLM hallucinates in the brief | Use structured output (JSON mode) + validate cited Cypher queries actually exist. Regenerate if validation fails. |
| Time collapses | Ship MUST-HAVES 1–9 only; cut timeline + PDF export. Core loop + GraphRAG layer still wins |

---

## 16. DECISION FILTER (v2 — GraphRAG edition)

For every idea during the sprint:
1. Does the demo work without it? → **YES → Cut**
2. Does it make FalkorDB do visible work? → **NO → Deprioritize**
3. Does it strengthen the GraphRAG narrative (graph + LLM)? → **NO → Deprioritize**
4. Can it be built in < 2 hours? → **NO → Cut**
5. Will a judge see it in the 3-minute video? → **NO → Cut**
6. Does it risk Rule 3 (graph becomes decoration)? → **YES → Kill it**

---

## 17. WINNING CRITERIA ALIGNMENT (Track 01 + Hackathon Theme)

### Track 01 Scorecard
| Judging Focus | Syndicate's Answer |
|---|---|
| Multi-hop link analysis | 5-hop money trail as the hero feature, live timing proof |
| Identity resolution | Suspects linked via shared devices AND IPs — dual-entity pattern matching |
| Fraud ring detection | Ring isolation via connected components (native or documented fallback) |
| Evidence & case mapping | Case file page: members, shared entities, money paths per ring |
| Explainable results | Query Inspector shows exact Cypher + latency. AI Brief explains findings in plain English with source attribution. |
| Graph does real work (Rule 3) | Remove FalkorDB → no traversals, no rings, no product |
| Repo quality | One-command setup, model diagram, Cypher section, GraphRAG explanation, AI disclosure |
| Demo | 3-min story: hide in rows → reveal in graph → name the ringleader → AI writes the brief |

### Hackathon Theme Scorecard ("Building Next-Gen RAG")
| Theme Element | Syndicate's Answer |
|---|---|
| "Combine knowledge graphs, LLMs, and autonomous agents" | Knowledge graph (FalkorDB) does multi-hop reasoning. LLM generates Investigation Brief from graph context. Single deterministic LLM call (not an agent loop — honest and reliable). |
| "Vector RAG breaks down on multi-step reasoning" | Our 5-hop money trail and WCC clustering are exactly the multi-step reasoning that vector RAG cannot do. The graph provides structured, relational context. |
| "Fast, accurate, and explainable" | Sub-millisecond graph queries (fast). Deterministic Cypher + algorithms (accurate). AI Brief with Cypher source attribution (explainable). |
| Source attribution | Every claim in the AI Brief links back to the exact Cypher query that produced the evidence. |

---

## EXECUTE SEQUENCE (your next 3 moves)

1. **Register now** (Google Form) + join both Discords.
2. **Run Phase 0 Verification Protocol** (§10) — convert every 🔴 to ✅. **Include the LLM API key test.**
3. Report back the results of `CALL dbms.procedures()` — I'll finalize the exact algorithm syntax branch and we write `seed.py` together.

The plan is airtight *because* it tells you exactly what's unverified and what to do about it. The GraphRAG layer is no longer optional — it's the differentiator. Go verify, then go win. 🏆