'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Monitor, Globe, CreditCard, GitFork, ArrowRight, Zap, Database } from 'lucide-react';

interface Stats {
  persons: number;
  devices: number;
  ips: number;
  accounts: number;
  edges: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/overview')
      .then(r => r.json())
      .then(data => {
        if (data.result?.[0]) {
          const [persons, devices, ips, accounts, edges] = data.result[0];
          setStats({ persons, devices, ips, accounts, edges });
          setMs(data.ms ?? null);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-primary">SYNDICATE</h1>
            <span className="text-xs text-gray-500 font-mono">GRAPHRAG FRAUD RING INVESTIGATOR</span>
          </div>
          <Link
            href="/investigate"
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
          >
            Open Investigator
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h2 className="text-4xl font-bold tracking-tight">
            Rows hide the ring.<br />
            <span className="text-primary">The graph reveals the ringleader.</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            2,289 suspects. Three engineered fraud rings hiding in noise.
            Vector RAG cannot walk a 5-hop money trail or cluster shared devices —
            FalkorDB does it in milliseconds, and the LLM writes the brief.
          </p>
        </section>

        {/* Stats bar */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon={Users} label="Persons" value={stats?.persons} loading={!stats && !error} />
            <StatCard icon={Monitor} label="Devices" value={stats?.devices} loading={!stats && !error} />
            <StatCard icon={Globe} label="IPs" value={stats?.ips} loading={!stats && !error} />
            <StatCard icon={CreditCard} label="Accounts" value={stats?.accounts} loading={!stats && !error} />
            <StatCard icon={GitFork} label="Edges" value={stats?.edges} loading={!stats && !error} />
          </div>
          {error && (
            <p className="text-center text-sm text-yellow-500 mt-3">
              Live stats unavailable — is FalkorDB running and seeded? (docker compose up)
            </p>
          )}
        </section>

        {/* SQL vs Graph comparison card */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-6 space-y-3">
            <div className="flex items-center gap-2 text-gray-400">
              <Database className="w-5 h-5" />
              <h3 className="font-semibold uppercase tracking-wider text-sm">SQL — 6 joins, seconds</h3>
            </div>
            <pre className="text-xs font-mono text-gray-400 bg-black/50 rounded p-3 overflow-x-auto leading-relaxed">
{`SELECT ...
FROM person p1
JOIN uses_device u1 ON ...
JOIN uses_device u2 ON u2.device_id = u1.device_id
JOIN logged_from l1 ON ...
JOIN logged_from l2 ON l2.ip_id = l1.ip_id
JOIN owns o1 ON ...  JOIN owns o2 ON ...
JOIN transferred_to t ON ...  -- x5 hops
-- explodes combinatorially at depth`}
            </pre>
            <p className="text-xs text-gray-500">
              Multi-hop fraud questions need 6+ self-joins; the query planner
              gives up (or the DBA does) long before hop 5.
            </p>
          </div>

          <div className="border border-primary/40 rounded-lg bg-primary/5 p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Zap className="w-5 h-5" />
              <h3 className="font-semibold uppercase tracking-wider text-sm">
                FalkorDB — one pattern, milliseconds
                {ms !== null && <span className="ml-2 font-mono normal-case">({ms.toFixed(2)} ms live)</span>}
              </h3>
            </div>
            <pre className="text-xs font-mono text-gray-300 bg-black/50 rounded p-3 overflow-x-auto leading-relaxed">
{`MATCH (a:Person)-[:USES_DEVICE]->(d:Device)
      <-[:USES_DEVICE]-(b:Person),
      (a)-[:LOGGED_FROM]->(ip:IP)
      <-[:LOGGED_FROM]-(b)
RETURN a, b, d, ip
-- identity resolution in one pattern`}
            </pre>
            <p className="text-xs text-gray-400">
              The numbers above come from a live Cypher query against the seeded
              graph — every action in the investigator shows its own Cypher + timing.
            </p>
          </div>
        </section>

        {/* Rings table */}
        <section>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Engineered rings (deterministic seed 42)
          </h3>
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900/70 text-gray-500 text-left">
                  <th className="px-4 py-2">Ring</th>
                  <th className="px-4 py-2">Size</th>
                  <th className="px-4 py-2">Pattern</th>
                </tr>
              </thead>
              <tbody>
                <RingsRow name="ALPHA — mule network" size="120" pattern="4 burner devices + 2 proxy IPs, circular transfers" />
                <RingsRow name="BETA — identity theft" size="40" pattern="One corporate IP, fan-out to a collector account" />
                <RingsRow name="GAMMA — kingpin" size="129" pattern="1 kingpin → 8 lieutenants → 15 mules each ($.95M funnels to the top)" />
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <footer className="border-t border-gray-800 px-6 py-4">
        <p className="max-w-5xl mx-auto text-xs text-gray-600">
          WeMakeDevs Graph Hacks × FalkorDB · Track: Investigation and Risk
        </p>
      </footer>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, loading }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-4 flex items-center gap-3">
      <Icon className="w-5 h-5 text-primary shrink-0" />
      <div>
        <div className="text-xl font-mono font-semibold">
          {loading ? '…' : (value?.toLocaleString() ?? '—')}
        </div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function RingsRow({ name, size, pattern }: { name: string; size: string; pattern: string }) {
  return (
    <tr className="border-t border-gray-800/70 hover:bg-gray-900/40">
      <td className="px-4 py-2 font-medium">{name}</td>
      <td className="px-4 py-2 font-mono">{size}</td>
      <td className="px-4 py-2 text-gray-400">{pattern}</td>
    </tr>
  );
}
