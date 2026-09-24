'use client';

import { useState, useEffect } from 'react';
import { Search, Zap, GitBranch, Brain, RefreshCw, AlertTriangle } from 'lucide-react';
import GraphCanvas from '@/app/components/GraphCanvas';
import QueryInspector from '@/app/components/QueryInspector';

interface Entity {
  id: string;
  name: string;
  type: string;
  email?: string;
}

interface QueryResult {
  result: any[];
  columns: string[];
  ms: number;
  cypher: string;
  params: any;
}

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

interface LeaderResult {
  ringId: string;
  ringName: string;
  leader: {
    leaderId: string;
    leaderName: string;
    score: number;
    method: string;
  };
}

interface BriefResult {
  ringId: string;
  brief: string;
  evidence: any;
  generatedAt: string;
}

export default function InvestigatePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [rings, setRings] = useState<Ring[]>([]);
  const [selectedRing, setSelectedRing] = useState<Ring | null>(null);
  const [leader, setLeader] = useState<LeaderResult | null>(null);
  const [brief, setBrief] = useState<BriefResult | null>(null);
  const [identityMatches, setIdentityMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([]);
  const [activeTab, setActiveTab] = useState<'graph' | 'brief'>('graph');

  // Fetch overview stats on mount
  useEffect(() => {
    fetch('/api/overview').then(r => r.json()).then(data => {
      if (data.result?.[0]) {
        const [persons, devices, ips, accounts, edges] = data.result[0];
        // Update stat cards (would need a global state or context)
        console.log('Stats:', { persons, devices, ips, accounts, edges });
      }
    }).catch(console.error);
  }, []);

  const addQueryToHistory = (result: QueryResult) => {
    setQueryHistory(prev => [result, ...prev.slice(0, 9)]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading('search');
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.result || []);
      addQueryToHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleTraceMoney = async (account: string) => {
    setLoading('trace');
    try {
      const res = await fetch(`/api/trace?account=${encodeURIComponent(account)}`);
      const data = await res.json();
      addQueryToHistory(data);
      
      // Convert path result to Cytoscape format
      const nodes: any[] = [];
      const edges: any[] = [];
      const nodeSet = new Set<string>();
      
      for (const row of data.result || []) {
        const path = row[0];
        if (path && path.length) {
          for (const segment of path) {
            if (segment.start && segment.end) {
              const srcId = String(segment.start.identity || segment.start);
              const tgtId = String(segment.end.identity || segment.end);
              
              if (!nodeSet.has(srcId)) {
                nodeSet.add(srcId);
                nodes.push({
                  data: { id: srcId, label: segment.start.properties?.number || srcId, type: 'BankAccount' },
                  classes: 'account',
                });
              }
              if (!nodeSet.has(tgtId)) {
                nodeSet.add(tgtId);
                nodes.push({
                  data: { id: tgtId, label: segment.end.properties?.number || tgtId, type: 'BankAccount' },
                  classes: 'account',
                });
              }
              edges.push({
                data: { id: `e-${srcId}-${tgtId}`, source: srcId, target: tgtId, amount: segment.properties?.amount },
                classes: 'transfer',
              });
            }
          }
        }
      }
      setGraphData({ nodes, edges });
      setSelectedEntity({ id: account, name: account, type: 'BankAccount' });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleIsolateRings = async () => {
    setLoading('isolate');
    try {
      const res = await fetch('/api/rings/isolate');
      const data = await res.json();
      addQueryToHistory(data);
      
      if (data.rings) {
        setRings(data.rings);
        // Render first ring by default
        if (data.rings.length > 0) {
          await renderRing(data.rings[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const renderRing = async (ring: Ring) => {
    setSelectedRing(ring);
    setLoading('render');
    try {
      // Fetch ring subgraph
      const res = await fetch(`/api/ring-subgraph?memberIds=${ring.memberIds.join(',')}`);
      const data = await res.json();
      addQueryToHistory(data);
      setGraphData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleFindLeader = async () => {
    if (!selectedRing) return;
    setLoading('leader');
    try {
      const res = await fetch(`/api/rings/leader/${selectedRing.id}`);
      const data = await res.json();
      addQueryToHistory(data);
      setLeader(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleIdentityResolution = async (mode: 'dual' | 'device' | 'ip') => {
    setLoading('identity');
    try {
      const res = await fetch(`/api/shared?mode=${mode}`);
      const data = await res.json();
      addQueryToHistory(data);
      setIdentityMatches(data.result || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateBrief = async () => {
    if (!selectedRing) return;
    setLoading('brief');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ringId: selectedRing.id }),
      });
      const data = await res.json();
      if (data.brief) {
        setBrief(data);
        setActiveTab('brief');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleEgoNetwork = async (personId: string) => {
    setLoading('ego');
    try {
      const res = await fetch(`/api/ego?personId=${encodeURIComponent(personId)}`);
      const data = await res.json();
      addQueryToHistory(data);
      // Render ego network
      setGraphData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top Bar */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm px-6 py-3">
        <div className="max-w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-primary">SYNDICATE</h1>
            <span className="text-xs text-gray-500 font-mono">INVESTIGATE</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search person, device, IP, account..."
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 w-64 focus:outline-none focus:border-primary"
            />
            <button onClick={handleSearch} disabled={loading === 'search'} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1">
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleIsolateRings} disabled={loading === 'isolate'} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1">
              <GitBranch className="w-4 h-4" />
              Isolate Rings
            </button>
            <button onClick={() => handleIdentityResolution('dual')} disabled={loading === 'identity'} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Resolve IDs
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Graph Canvas */}
        <div className="flex-1 relative min-w-0">
          <GraphCanvas
            elements={{ nodes: graphData.nodes, edges: graphData.edges }}
            onNodeClick={(node) => {
              if (node.data().type === 'BankAccount') {
                handleTraceMoney(node.id());
              } else if (node.data().type === 'Person') {
                handleEgoNetwork(node.id());
              }
            }}
          />
          
          {/* Ring Selector Overlay */}
          {rings.length > 0 && (
            <div className="absolute top-4 left-4 z-10 bg-gray-900/90 border border-gray-700 rounded-lg p-2 max-h-64 overflow-y-auto">
              <div className="text-xs font-semibold text-gray-400 mb-2 px-2">FRAUD RINGS</div>
              {rings.map(ring => (
                <button
                  key={ring.id}
                  onClick={() => renderRing(ring)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                    selectedRing?.id === ring.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="font-mono">{ring.name}</div>
                  <div className="text-[10px] opacity-70">{ring.size} members • {ring.moneyFlowEdges} txs</div>
                </button>
              ))}
            </div>
          )}

          {/* Selected Entity Badge */}
          {selectedEntity && (
            <div className="absolute bottom-4 left-4 z-10 bg-gray-900/90 border border-gray-700 rounded-lg p-3 flex items-center gap-2 max-w-xs">
              <div className="text-[10px] text-gray-500">SELECTED</div>
              <div className="font-mono text-sm">{selectedEntity.name}</div>
              <span className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">{selectedEntity.type}</span>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm font-mono">Running {loading}...</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Control Dock + Query Inspector */}
        <div className="w-96 border-l border-gray-800 bg-gray-900/50 flex flex-col overflow-hidden">
          {/* Tab Switcher */}
          <div className="border-b border-gray-800 flex">
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'graph' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Graph
            </button>
            <button
              onClick={() => setActiveTab('brief')}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'brief' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Brief
            </button>
          </div>

          {activeTab === 'graph' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Search Results</h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {searchResults.map(entity => (
                      <button
                        key={entity.id}
                        onClick={() => {
                          setSelectedEntity(entity);
                          if (entity.type === 'BankAccount') handleTraceMoney(entity.id);
                          else if (entity.type === 'Person') handleEgoNetwork(entity.id);
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-gray-800 rounded text-sm flex items-center gap-2"
                      >
                        <span className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] font-mono">{entity.type}</span>
                        <span className="font-mono truncate">{entity.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Identity Matches */}
              {identityMatches.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Identity Matches
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {identityMatches.slice(0, 10).map((match, i) => (
                      <div key={i} className="px-2 py-1.5 bg-gray-800/50 rounded text-xs border border-gray-700">
                        <div className="font-mono text-yellow-300">{match[1] || match[0]} ↔ {match[3] || match[2]}</div>
                        <div className="text-[10px] text-gray-500">Device: {match[4]} • IP: {match[5]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ring Actions */}
              {selectedRing && (
                <div className="space-y-2 border-t border-gray-800 pt-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ring Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleFindLeader}
                      disabled={loading === 'leader'}
                      className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Find Ringleader
                    </button>
                    <button
                      onClick={handleGenerateBrief}
                      disabled={loading === 'brief'}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      Generate Brief
                    </button>
                    {leader && (
                      <div className="p-2 bg-green-900/30 border border-green-700/50 rounded text-xs">
                        <div className="text-green-400 font-mono mb-1">RINGLEADER IDENTIFIED</div>
                        <div>{leader.leader.leaderName}</div>
                        <div className="text-[10px] opacity-70">{leader.leader.method} • score: {leader.leader.score.toFixed(4)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t border-gray-800 pt-4 space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleIsolateRings} disabled={loading === 'isolate'} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm hover:bg-gray-700 disabled:opacity-50">
                    <GitBranch className="w-4 h-4 inline mr-1" /> Isolate Rings
                  </button>
                  <button onClick={() => handleIdentityResolution('dual')} disabled={loading === 'identity'} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm hover:bg-gray-700 disabled:opacity-50">
                    <AlertTriangle className="w-4 h-4 inline mr-1" /> Dual-Entity Match
                  </button>
                  <button onClick={() => handleIdentityResolution('device')} disabled={loading === 'identity'} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm hover:bg-gray-700 disabled:opacity-50">
                    <Search className="w-4 h-4 inline mr-1" /> Shared Devices
                  </button>
                  <button onClick={() => handleIdentityResolution('ip')} disabled={loading === 'identity'} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm hover:bg-gray-700 disabled:opacity-50">
                    <Zap className="w-4 h-4 inline mr-1" /> Shared IPs
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'brief' && (
            <div className="flex-1 overflow-y-auto p-4">
              {brief ? (
                <div className="prose prose-invert max-w-none text-sm">
                  {brief.brief.split('\n').map((line, i) => (
                    <p key={i} className="whitespace-pre-wrap">{line}</p>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Select a ring and click "Generate Brief"</p>
                  <p className="text-xs mt-1">Requires OPENAI_API_KEY</p>
                </div>
              )}
            </div>
          )}

          {/* Query Inspector - Always visible at bottom */}
          <QueryInspector queries={queryHistory} />
        </div>
      </div>
    </div>
  );
}