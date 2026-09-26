# Syndicate — Tasks, Days Wise

Source: `Docs/Plan.md` §10–11 (Phase 0 + Day 1–7 sprint).  
Hackathon: WeMakeDevs — Graph Hacks: Building Next-Gen RAG × FalkorDB  
Track: **Investigation and Risk**

---

## Day 0 — Pre-hackathon verification (Phase 0)

Do this **before coding starts**. Exit: every 🔴 is ✅ or its fallback is chosen. Zero unknowns.

### Register / community
- [ ] Register via the Google Form
- [ ] Join WeMakeDevs Discord
- [ ] Join FalkorDB Discord
- [ ] Confirm exact start/end times + kickoff session (schedule page / Discord)

### FalkorDB (🔴 / 🔶)
- [x] 🔴 `docker run -p 6379:6379 -d falkordb/falkordb:latest` → connect with `redis-cli` or Python client
- [x] 🔶 `pip install falkordb` → create graph, `CREATE` / `MATCH` round-trip works
- [x] 🔴 Run `CALL dbms.procedures()` → write down exact algorithm procedure names + syntax (this decides the algo branch in Plan §5.3)
- [x] 🔶 `npm install falkordb` → connect from Node, run a query
- [ ] 🔴 FalkorDB Cloud: sign up → does a free instance exist? connection string + TLS from a serverless context?
- [ ] 🔶 Test bulk seeding speed: UNWIND batches of 500

### UI / LLM spikes
- [x] 🔴 Cytoscape.js spike: render 600 nodes + style update → confirm smooth
- [x] 🔶 LLM API key: OpenAI (GPT-4o-mini) or Gemini Flash. Test a single API call from Node.js. Confirm structured output works.

### Planning (allowed pre-kickoff)
- [x] Sketch the data model diagram (put it straight into README)

### Algorithm branch (must lock after `dbms.procedures()`)
```
algo procs EXIST  → native WCC + PageRank
algo procs MISSING → Cypher subgraph extract + backend union-find / degree (or PageRank post-process)
```
Either way: remove FalkorDB and the product dies.

**SUCCESS:** every 🔴 is now ✅ or its fallback is chosen.

- [ ] End-of-day upload: commit + push **Day 0** to GitHub (only after everything above is done)

---

## Day 1 — Foundation

- [x] New repo + README skeleton (with data model diagram from Phase 0)
- [x] `docker-compose.yml`: FalkorDB + web (seed service as needed)
- [x] `scripts/seed.py` complete:
  - [x] 2,000 noise persons
  - [x] Ring ALPHA (120) — mule network
  - [x] Ring BETA (40) — identity theft
  - [x] Ring GAMMA (129) — kingpin
  - [x] indexes
  - [x] verification output
- [x] Deterministic `seed(42)` / `faker.seed_instance(42)`
- [x] Seed runs as separate service in docker-compose, exits on completion

**SUCCESS:** seeded graph verified in FalkorDB Browser; screenshot for README.

- [x] End-of-day upload: commit + push **Day 1** to GitHub (only after everything above is done)
---

## Day 2 — The Engine (Cypher day)

- [ ] All hero queries (Q1–Q5) implemented and tested against real data
  - [x] **Q1** Identity resolution (dual-entity: shared device AND IP) — `lib/queries.ts:13-21`
  - [x] **Q1b** Shared-entity detection (device) — `lib/queries.ts:25-32`
  - [x] **Q1c** Shared IP detection — `lib/queries.ts:35-42`
  - [x] **Q2** Money trail (`[:TRANSFERRED_TO*1..5]`) — `lib/queries.ts:46-51`
  - [x] **Q2b** Money trail shortest path to target — `lib/queries.ts:54-57`
  - [x] **Q3** Ego-network expansion — `lib/queries.ts:61-65`
  - [x] **Q4** Ringleader fallback (degree) — `lib/queries.ts:93-99` / native PageRank if available
  - [x] **Q5** Ring isolation fallback (subgraph + union-find) — `lib/queries.ts:70-82` / native WCC if available
- [x] Algorithm branch finalized (native vs. fallback) based on Day 0 findings → **fallback chosen** (no native algos verified)
- [x] Query timing harness — every query returns `{result, cypher, ms}` — implemented in `lib/falkordb.ts:runQuery()`
- [x] Test all queries via CLI against seeded database

**SUCCESS:** every MUST-HAVE query returns correct results from CLI.

- [ ] End-of-day upload: commit + push **Day 2** to GitHub (only after everything above is done)

---

## Day 3 — App Skeleton

- [x] Next.js + Tailwind + shadcn/ui shell
- [x] Route handlers wired to FalkorDB Node client (`lib/falkordb.ts`)
- [x] All API routes created:
  - [x] `/api/overview` — stats
  - [x] `/api/trace` — money trail (Q2)
  - [x] `/api/shared` — shared entities (Q1)
  - [x] `/api/search` — entity search
  - [x] `/api/rings/isolate` — ring isolation (Q5)
  - [x] `/api/rings/[id]/leader` — ringleader (Q4)
  - [x] `/api/ego` — ego network (Q3)
  - [x] `/api/ring-subgraph` — combined ring view
  - [x] `/api/ring-members` — ring member details
  - [x] `/api/ring-money-flow` — ring money flow
  - [x] `/api/ring-shared-devices` — ring shared devices
  - [x] `/api/ring-shared-ips` — ring shared IPs
  - [x] `/api/report` — AI Investigation Brief (GraphRAG)
- [x] Query Inspector component (live Cypher + timing) — `app/components/QueryInspector.tsx`
- [x] Graph Canvas component (Cytoscape.js) — `app/components/GraphCanvas.tsx`
- [x] Pages:
  - [x] `/` Overview with stats bar, SQL-vs-Graph card
  - [x] `/investigate` — canvas + control dock
  - [x] `/case/[id]` — case file view

**SUCCESS:** click "Trace Money" in browser → path renders from live query.

- [x] End-of-day upload: commit + push **Day 3** to GitHub (only after everything above is done)

---

## Day 4 — Investigation Features

- [ ] Shared-entity finder UI (control dock: search, trace, isolate rings, find ringleader)
- [ ] Ring isolation (cluster coloring on canvas — Alpha/amber, Beta/red, Gamma/purple)
- [ ] Ringleader detection (pulse animation on kingpin node)
- [ ] Wire all control dock buttons to API calls + Query Inspector updates
- [ ] End-to-end flow: search → trace → isolate → ringleader → identity resolution

**SUCCESS:** full investigation flow works end-to-end, unstyled.

- [ ] End-of-day upload: commit + push **Day 4** to GitHub (only after everything above is done)

---

## Day 5 — The AI Layer (GraphRAG day)

- [ ] `/case/[ringId]` evidence report page with case file view (member table, shared devices/IPs, money-flow diagram)
- [ ] Build the **"Generate Investigation Brief"** button
- [ ] Implement the LLM call with the prompt template from Plan §5.4 (`app/api/report/route.ts`)
- [ ] Render the structured brief in a slide-out panel
- [ ] Source attribution: clickable Cypher query references in the "Data Sources" section
- [ ] Edge cases: LLM timeout → show "generating..." state; LLM failure → show graph evidence without the brief
- [ ] Error / empty / loading states everywhere

**SUCCESS:** full GraphRAG flow works: investigate → generate brief → brief cites Cypher queries.

- [ ] End-of-day upload: commit + push **Day 5** to GitHub (only after everything above is done)

---

## Day 6 — Polish + Demo Prep

- [ ] Dark theme (already in `page.tsx` and `globals.css`)
- [ ] Animations (ringleader pulse, smooth transitions)
- [ ] Stats bar (live query latency, entity counts)
- [ ] SQL-vs-Graph comparison card (already in `page.tsx`)
- [ ] Record demo 5+ times; fix what breaks
- [ ] README:
  - [ ] setup instructions (docker-compose + manual)
  - [ ] data model diagram
  - [ ] Cypher section (hero queries verbatim)
  - [ ] GraphRAG pipeline explanation
  - [ ] Track name: "Investigation and Risk"
  - [ ] AI disclosure

**SUCCESS:** demo lands clean 3× in a row.

- [ ] End-of-day upload: commit + push **Day 6** to GitHub (only after everything above is done)

---

## Day 7 — FREEZE + SUBMIT

- [ ] **NO NEW FEATURES.**
- [ ] Final video (3 min, per demo script in Plan §8)
- [ ] README polish
- [ ] docker-compose fresh-clone test (clean machine/VM)
- [ ] Submit with track named: *Investigation and Risk*

**SUCCESS:** submitted before deadline.

- [ ] End-of-day upload: commit + push **Day 7** to GitHub (only after everything above is done)

---

## MUST HAVE (won't ship without) — mapped to days

| # | Component | Day | Status |
|---|---|---|---|
| 1 | Seed script | 1 | ✅ |
| 2 | Graph canvas | 3 | ✅ |
| 3 | Shared-entity finder | 4 | 🟡 |
| 4 | Money trail tracer | 2–3 | 🟡 |
| 5 | Ring isolation | 2 + 4 | 🟡 |
| 6 | Ringleader detection | 2 + 4 | 🟡 |
| 7 | Case file view | 5 | 🟡 |
| 8 | Query inspector panel | 3 | ✅ |
| 9 | AI Investigation Brief (GraphRAG) | 5 | 🟡 |
| 10 | docker-compose | 1 | ✅ |
| 11 | Demo video + README | 6–7 | ⏳ |

---

## NICE TO HAVE (after Day 5, only if green)

- [ ] Timeline scrubber (watch a ring grow over time)
- [ ] Export case file to PDF
- [ ] FalkorDB Cloud deployment (only if Day 0 Cloud verification passed)

---

## WILL NOT BUILD

- Real banking APIs / real data
- Auth / multi-tenancy
- Custom graph rendering engine
- Full GraphRAG SDK pipeline (Track 03)
- Multi-agent orchestration (Track 02)
- Mobile layout
- Streaming / real-time ingestion

---

## Current Status Summary

| Day | Status | Blockers |
|-----|--------|----------|
| Day 0 | ⚠️ Partial | `CALL dbms.procedures()` not run; fallback chosen |
| Day 1 | ✅ Complete | — |
| Day 2 | 🟡 Queries defined, need live testing | — |
| Day 3 | 🟡 Skeleton done, need E2E wiring | — |
| Day 4 | 🟡 APIs ready, need UI wiring | — |
| Day 5 | 🟡 GraphRAG API ready, need E2E | — |
| Day 6 | 🟡 Polish partial | — |
| Day 7 | ⏳ Pending | — |

**Next Action:** Test hero queries against live FalkorDB (Day 2 completion), then wire UI end-to-end (Day 3→4).