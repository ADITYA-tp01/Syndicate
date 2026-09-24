'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Shield, Zap, Brain, GitBranch, Copy, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import GraphCanvas from '@/app/components/GraphCanvas';
import QueryInspector from '@/app/components/QueryInspector';

interface Ring {
  id: string;
  name: string;
  size: number;
  memberIds: string[];
  memberNames: string[];
  sharedDevices: string[];
  sharedIPs: string[];
  moneyFlowEdges: number;
}

interface Leader {
  leaderId: string;
  leaderName: string;
  score: number;
  method: string;
}

interface Brief {
  ringId: string;
  brief: string;
  evidence: any;
  generatedAt: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  devices: string[];
  ips: string[];
  accounts: string[];
}

export default function CasePage() {
  const params = useParams();
  const ringId = params.id as string;

  const [ring, setRing] = useState<Ring | null>(null);
  const [leader, setLeader] = useState<Leader | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [moneyFlow, setMoneyFlow] = useState<any[]>([]);
  const [sharedDevices, setSharedDevices] = useState<any[]>([]);
  const [sharedIPs, setSharedIPs] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'brief'>('overview');

  const addQueryToHistory = (result: any) => {
    setQueryHistory(prev => [result, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    loadCaseData();
  }, [ringId]);

  const loadCaseData = async () => {
    setLoading(true);
    try {
      // Load all rings to find this one
      const ringsRes = await fetch('/api/rings/isolate');
      const ringsData = await ringsRes.json();
      addQueryToHistory(ringsData);
      
      const targetRing = ringsData.rings?.find((r: Ring) => r.id === ringId);
      if (targetRing) {
        setRing(targetRing);
        await loadRingDetails(targetRing);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadRingDetails = async (ring: Ring) => {
    try {
      // Load leader
      const leaderRes = await fetch(`/api/rings/leader/${ring.id}`);
      const leaderData = await leaderRes.json();
      addQueryToHistory(leaderData);
      setLeader(leaderData.leader);

      // Load members
      const membersRes = await fetch(`/api/ring-members?memberIds=${ring.memberIds.join(',')}`);
      const membersData = await membersRes.json();
      addQueryToHistory(membersData);
      setMembers(membersData.result || []);

      // Load money flow
      const accounts = (membersData.result || []).flatMap((m: any) => m[4] || m.accounts || []);
      const moneyRes = await fetch(`/api/ring-money-flow?accounts=${accounts.join(',')}`);
      const moneyData = await moneyRes.json();
      addQueryToHistory(moneyData);
      setMoneyFlow(moneyData.result || []);

      // Load shared devices
      const devicesRes = await fetch(`/api/ring-shared-devices?memberIds=${ring.memberIds.join(',')}`);
      const devicesData = await devicesRes.json();
      addQueryToHistory(devicesData);
      setSharedDevices(devicesData.result || []);

      // Load shared IPs
      const ipsRes = await fetch(`/api/ring-shared-ips?memberIds=${ring.memberIds.join(',')}`);
      const ipsData = await ipsRes.json();
      addQueryToHistory(ipsData);
      setSharedIPs(ipsData.result || []);

      // Load subgraph for graph view
      const graphRes = await fetch(`/api/ring-subgraph?memberIds=${ring.memberIds.join(',')}`);
      const graphData = await graphRes.json();
      addQueryToHistory(graphData);
      setGraphData(graphData);

    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateBrief = async () => {
    if (!ring) return;
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ringId: ring.id }),
      });
      const data = await res.json();
      if (data.brief) {
        setBrief(data);
        setActiveTab('brief');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading case file...</p>
        </div>
      </div>
    );
  }

  if (!ring) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-400">Ring not found</p>
          <Link href="/investigate" className="text-primary hover:underline mt-4 inline-block">Back to Investigate</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm px-6 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/investigate" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Case File: {ring.name}</h1>
              <p className="text-sm text-gray-500 font-mono">{ring.size} members • {ring.moneyFlowEdges} transactions • {ring.sharedDevices.length} shared devices • {ring.sharedIPs.length} shared IPs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-red-900/30 border border-red-700/50 text-red-300 text-xs font-mono rounded">
              TRACK 01: INVESTIGATION AND RISK
            </span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-gray-800 bg-gray-900/50 px-6">
        <div className="max-w-full mx-auto flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'graph', label: 'Graph', icon: GitBranch },
            { id: 'brief', label: 'AI Brief', icon: Brain },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-full mx-auto px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Ring Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <SummaryCard icon={GitBranch} label="Members" value={ring.size} />
              <SummaryCard icon={Zap} label="Transactions" value={ring.moneyFlowEdges} />
              <SummaryCard icon={Shield} label="Shared Devices" value={ring.sharedDevices.length} />
              <SummaryCard icon={AlertTriangle} label="Shared IPs" value={ring.sharedIPs.length} />
            </div>

            {/* Ringleader */}
            {leader && (
              <div className="bg-gray-900 border border-green-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  <h2 className="text-lg font-semibold text-green-400">RINGLEADER IDENTIFIED</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider">Name</div>
                    <div className="font-mono text-lg">{leader.leaderName}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider">Method</div>
                    <div className="font-mono">{leader.method}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider">Score</div>
                    <div className="font-mono text-lg">{leader.score.toFixed(4)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Shared Devices */}
            {sharedDevices.length > 0 && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Shared Devices ({sharedDevices.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-700">
                        <th className="text-left px-3 py-2 font-mono">Device Fingerprint</th>
                        <th className="text-left px-3 py-2">Linked Persons</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sharedDevices.map((row, i) => (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                          <td className="px-3 py-2 font-mono text-green-300">{row[0] || row.device}</td>
                          <td className="px-3 py-2 text-gray-300">{row[1] || row.person_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Shared IPs */}
            {sharedIPs.length > 0 && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Shared IPs ({sharedIPs.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-700">
                        <th className="text-left px-3 py-2 font-mono">IP Address</th>
                        <th className="text-left px-3 py-2">Linked Persons</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sharedIPs.map((row, i) => (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                          <td className="px-3 py-2 font-mono text-red-300">{row[0] || row.ip}</td>
                          <td className="px-3 py-2 text-gray-300">{row[1] || row.person_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Money Flow */}
            {moneyFlow.length > 0 && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Money Flow ({moneyFlow.length} account pairs)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-700">
                        <th className="text-left px-3 py-2 font-mono">Source</th>
                        <th className="text-left px-3 py-2 font-mono">Target</th>
                        <th className="text-left px-3 py-2">Transactions</th>
                        <th className="text-left px-3 py-2">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moneyFlow.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                          <td className="px-3 py-2 font-mono text-blue-300">{row[0] || row.source}</td>
                          <td className="px-3 py-2 font-mono text-blue-300">{row[1] || row.target}</td>
                          <td className="px-3 py-2 text-gray-300">{row[2] || row.tx_count}</td>
                          <td className="px-3 py-2 text-green-300 font-mono">${Number(row[3] || row.total_amount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Members Table */}
            {members.length > 0 && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Members ({members.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-700">
                        <th className="text-left px-3 py-2 font-mono">ID</th>
                        <th className="text-left px-3 py-2">Name</th>
                        <th className="text-left px-3 py-2">Email</th>
                        <th className="text-left px-3 py-2">Devices</th>
                        <th className="text-left px-3 py-2">IPs</th>
                        <th className="text-left px-3 py-2">Accounts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((row, i) => (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                          <td className="px-3 py-2 font-mono text-xs">{row[0] || row.id}</td>
                          <td className="px-3 py-2 font-medium">{row[1] || row.name}</td>
                          <td className="px-3 py-2 text-gray-400 text-xs">{row[2] || row.email}</td>
                          <td className="px-3 py-2 text-xs text-gray-300">{(row[3] || row.devices || []).join(', ') || '—'}</td>
                          <td className="px-3 py-2 text-xs text-gray-300">{(row[4] || row.ips || []).join(', ') || '—'}</td>
                          <td className="px-3 py-2 text-xs font-mono text-blue-300">{(row[5] || row.accounts || []).join(', ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'graph' && (
          <div className="h-[70vh]">
            <GraphCanvas
              elements={graphData}
            />
          </div>
        )}

        {activeTab === 'brief' && (
          <div className="prose prose-invert max-w-none">
            {brief ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">AI Investigation Brief</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Generated: {new Date(brief.generatedAt).toLocaleString()}</span>
                    <button onClick={() => navigator.clipboard.writeText(brief.brief)} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center gap-1">
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 whitespace-pre-wrap text-sm">
                  {brief.brief}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-semibold mb-2">No Brief Generated</h3>
                <p className="text-gray-500 mb-4">Click "Generate Brief" to create an AI Investigation Brief for this ring.</p>
                <button
                  onClick={handleGenerateBrief}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 flex items-center gap-2 mx-auto"
                >
                  <Brain className="w-5 h-5" />
                  Generate Investigation Brief
                </button>
              </div>
            )}
          </div>
        )}

        {/* Query Inspector at bottom */}
        <QueryInspector queries={queryHistory} />
      </main>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <Icon className="w-6 h-6 text-primary mb-2" />
      <div className="text-3xl font-bold font-mono text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}