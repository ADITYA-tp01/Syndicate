'use client';

import Link from 'next/link';
import { Shield, Search, Zap, Brain, GitBranch, Terminal } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/30 border border-red-700/50 text-red-300 text-sm font-mono mb-6">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
            TRACK 01: INVESTIGATION AND RISK
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Syndicate
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8 font-mono">
            Rows hide the ring. The graph reveals the ringleader. The AI writes the brief.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/investigate"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Start Investigation
            </Link>
            <Link
              href="https://github.com/ADITYA-tp01/Syndicate"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-gray-600 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              View Source
            </Link>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-16" id="stats-bar">
          <StatCard icon={GitBranch} label="Persons" value="—" id="stat-persons" />
          <StatCard icon={Shield} label="Devices" value="—" id="stat-devices" />
          <StatCard icon={Search} label="IPs" value="—" id="stat-ips" />
          <StatCard icon={Zap} label="Accounts" value="—" id="stat-accounts" />
          <StatCard icon={Terminal} label="Relationships" value="—" id="stat-edges" />
        </div>

        {/* SQL vs Graph Comparison */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Why Graph? (The SQL Problem)
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                SQL: 5-Hop Money Trail
              </h3>
              <pre className="bg-black/50 p-4 rounded text-xs text-gray-300 overflow-x-auto font-mono"><code>{`-- Recursive CTE (5 self-joins equivalent)
WITH RECURSIVE trail AS (
  SELECT src, dst, amount, 1 as hop, ARRAY[src] as path
  FROM transfers WHERE src = 'ACC_ALPHA_001'
  UNION ALL
  SELECT t.src, t.dst, t.amount, tr.hop + 1, tr.path || t.src
  FROM transfers t
  JOIN trail tr ON t.src = tr.dst
  WHERE tr.hop < 5
    AND NOT t.src = ANY(tr.path)  -- cycle prevention
)
SELECT * FROM trail ORDER BY hop DESC;`}</code></pre>
              <p className="text-gray-400 text-sm mt-3">
                • Re-scans tables on every hop<br />
                • Cycle detection = array ops<br />
                • Seconds at 8,500 edges<br />
                • Unreadable, unmaintainable
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                FalkorDB: One Pattern
              </h3>
              <pre className="bg-black/50 p-4 rounded text-xs text-gray-300 overflow-x-auto font-mono"><code>{`-- One line, sub-millisecond
MATCH path = (src:BankAccount {number: $account})
  -[:TRANSFERRED_TO*1..5]->(dst)
RETURN path, length(path) AS hops
ORDER BY hops DESC;`}</code></pre>
              <p className="text-gray-400 text-sm mt-3">
                • Relationship stored once<br />
                • Traversal = sparse matrix multiply<br />
                • <5ms at 8,500 edges<br />
                • Query IS the pattern
              </p>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Core Capabilities</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={GitBranch}
              title="Multi-Hop Link Analysis"
              desc="Variable-length paths (*1..5) trace money across 5 hops in milliseconds. The hero feature."
            />
            <FeatureCard
              icon={Shield}
              title="Identity Resolution"
              desc="Dual-entity matching: suspects sharing BOTH a device AND an IP. Strongest duplicate signal."
            />
            <FeatureCard
              icon={Brain}
              title="GraphRAG Investigation Brief"
              desc="LLM narrates graph findings with source attribution — every claim cites the exact Cypher query."
            />
            <FeatureCard
              icon={Search}
              title="Ring Isolation"
              desc="Weakly Connected Components clustering separates 3 fraud rings from 2,000 noise persons."
            />
            <FeatureCard
              icon={Zap}
              title="Ringleader Detection"
              desc="Degree centrality (fallback) or PageRank (native) ranks the kingpin at #1 in Ring Gamma."
            />
            <FeatureCard
              icon={Terminal}
              title="Query Inspector"
              desc="Live side-panel shows exact Cypher + execution time for every action. Proof the graph works."
            />
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-16 border-t border-gray-800 pt-12">
          <h2 className="text-2xl font-bold mb-6">Tech Stack</h2>
          <div className="grid md:grid-cols-4 gap-4 text-center">
            <StackItem name="FalkorDB" desc="Graph DB (Redis protocol)" />
            <StackItem name="Next.js 14" desc="App Router + Route Handlers" />
            <StackItem name="Cytoscape.js" desc="Graph Visualization" />
            <StackItem name="OpenAI" desc="GPT-4o-mini (GraphRAG)" />
            <StackItem name="TypeScript" desc="End-to-end type safety" />
            <StackItem name="Tailwind" desc="Dark-mode UI" />
            <StackItem name="Docker" desc="One-command judge setup" />
            <StackItem name="Python/Faker" desc="Deterministic seed data" />
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm py-8 border-t border-gray-800">
          <p>Built for WeMakeDevs Graph Hacks — Building Next-Gen RAG × FalkorDB (Sep 2026)</p>
          <p className="mt-1">Track 01: Investigation and Risk • Solo • AI-assisted coding disclosed</p>
        </footer>
      </section>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, id }: { icon: any; label: string; value: string; id: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
      <Icon className="w-6 h-6 mx-auto text-primary mb-2" />
      <div id={id} className="text-2xl font-mono font-bold text-primary">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
      <Icon className="w-8 h-8 text-primary mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}

function StackItem({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
      <div className="font-semibold text-primary mb-1">{name}</div>
      <div className="text-xs text-gray-500">{desc}</div>
    </div>
  );
}