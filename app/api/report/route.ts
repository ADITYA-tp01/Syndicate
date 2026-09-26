import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { 
  IDENTITY_RESOLUTION_DUAL, 
  SHARED_DEVICE_DETECTION, 
  SHARED_IP_DETECTION,
  RING_MEMBERS,
  RING_MONEY_FLOW,
  RING_SHARED_ENTITIES,
  RING_SHARED_IPS,
} from '@/lib/queries';
import { isolateRings, detectRingleader } from '@/lib/graph-algos';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface GraphEvidence {
  ring: {
    id: string;
    name: string;
    size: number;
    memberIds: string[];
    memberNames: string[];
    sharedDevices: string[];
    sharedIPs: string[];
    moneyFlowEdges: number;
  };
  leader: {
    leaderId: string;
    leaderName: string;
    score: number;
    method: string;
  };
  identityMatches: {
    dual: any[];
    device: any[];
    ip: any[];
  };
  moneyFlow: any[];
  members: any[];
}

async function collectGraphEvidence(ringId: string): Promise<GraphEvidence> {
  // Get all rings to find the target one
  const rings = await isolateRings(runQuery);
  const ring = rings.find(r => r.id === ringId);
  
  if (!ring) {
    throw new Error(`Ring ${ringId} not found`);
  }

  // Get ringleader
  const leader = await detectRingleader(runQuery, ring.memberIds);

  // Get identity resolution matches (filtered to ring members)
  const [dualResult, deviceResult, ipResult] = await Promise.all([
    runQuery(IDENTITY_RESOLUTION_DUAL),
    runQuery(SHARED_DEVICE_DETECTION),
    runQuery(SHARED_IP_DETECTION),
  ]);

  // Filter identity matches to ring members
  const ringMemberSet = new Set(ring.memberIds);
  const filterToRing = (rows: any[]) => rows.filter(row => {
    const ids = [row[0], row[2], row[1], row[3]].filter(Boolean);
    return ids.some(id => ringMemberSet.has(id));
  });

  // Get ring members detail
  const membersResult = await runQuery(RING_MEMBERS, { ring_member_ids: ring.memberIds });

  // Get ring money flow
  const accounts = (membersResult.result || []).flatMap((m: any) => m[4] || m.accounts || []);
  const moneyFlowResult = await runQuery(RING_MONEY_FLOW, { ring_accounts: accounts });

  // Get shared entities
  const [sharedDevicesResult, sharedIPsResult] = await Promise.all([
    runQuery(RING_SHARED_ENTITIES, { ring_member_ids: ring.memberIds }),
    runQuery(RING_SHARED_IPS, { ring_member_ids: ring.memberIds }),
  ]);

  return {
    ring: {
      id: ring.id,
      name: ring.name,
      size: ring.size,
      memberIds: ring.memberIds,
      memberNames: ring.memberNames,
      sharedDevices: ring.sharedDevices,
      sharedIPs: ring.sharedIPs,
      moneyFlowEdges: ring.moneyFlowEdges,
    },
    leader,
    identityMatches: {
      dual: filterToRing(dualResult.result || []),
      device: filterToRing(deviceResult.result || []),
      ip: filterToRing(ipResult.result || []),
    },
    moneyFlow: moneyFlowResult.result || [],
    members: membersResult.result || [],
  };
}

function buildPrompt(evidence: GraphEvidence): string {
  const { ring, leader, identityMatches, moneyFlow, members } = evidence;

  const dualMatches = identityMatches.dual.map((m: any) => 
    `${m[1] || m.person_a} (${m[0] || m.person_a_id}) ↔ ${m[3] || m.person_b} (${m[2] || m.person_b_id}) via device ${m[4] || m.shared_device} + IP ${m[5] || m.shared_ip}`
  ).join('\n- ') || 'None';

  const deviceMatches = identityMatches.device.map((m: any) => 
    `Device ${m[0] || m.device}: ${(m[1] || m.linked_suspects || []).join(', ')}`
  ).join('\n- ') || 'None';

  const ipMatches = identityMatches.ip.map((m: any) => 
    `IP ${m[0] || m.ip}: ${(m[1] || m.linked_suspects || []).join(', ')}`
  ).join('\n- ') || 'None';

  const moneyTrail = moneyFlow.map((m: any) => 
    `${m[0] || m.source} → ${m[1] || m.target}: ${m[2] || m.tx_count} txs, $${Number(m[3] || m.total_amount || 0).toLocaleString()}`
  ).join('\n- ') || 'None';

  const memberList = members.map((m: any) => 
    `${m[1] || m.name} (${m[0] || m.id}): Devices: ${(m[3] || m.devices || []).join(', ') || 'none'}; IPs: ${(m[4] || m.ips || []).join(', ') || 'none'}; Accounts: ${(m[5] || m.accounts || []).join(', ') || 'none'}`
  ).join('\n- ') || 'None';

  return `You are a financial crime analyst. Based on the following graph database evidence, write a structured Investigation Brief.

GRAPH EVIDENCE:
- Fraud ring detected via Weakly Connected Components: ${ring.name} (${ring.size} members)
- Ring members: ${ring.memberNames.join(', ')}
- Shared devices (2+ members): ${ring.sharedDevices.join(', ') || 'none'}
- Shared IPs (2+ members): ${ring.sharedIPs.join(', ') || 'none'}
- Money flow edges within ring: ${ring.moneyFlowEdges}
- Central suspect identified via ${leader.method}: ${leader.leaderName} (score: ${leader.score.toFixed(4)})
- Identity resolution matches (shared device + IP):
- ${dualMatches}
- Shared device matches:
- ${deviceMatches}
- Shared IP matches:
- ${ipMatches}
- Money trail (aggregate):
- ${moneyTrail}
- Member details:
- ${memberList}

OUTPUT FORMAT:
## Investigation Brief — Case ${ring.name.toUpperCase()}
### Executive Summary (2-3 sentences)
### Primary Suspect (name, ${leader.method} score, reasoning)
### Evidence Chain (numbered list of transactions/connections)
### Identity Resolution Flags (suspected duplicate identities)
### Risk Assessment (LOW/MEDIUM/HIGH/CRITICAL with justification)
### Recommended Action (1-2 sentences)
### Data Sources (list the exact Cypher queries used — verbatim)

DATA SOURCES (exact Cypher queries):
1. Ring Isolation: Weakly Connected Components via Cypher subgraph extraction + Union-Find clustering
2. Ringleader Detection: Degree centrality on ring subgraph
3. Identity Resolution (Dual): MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person), (a)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b) WHERE id(a) < id(b)
4. Shared Device Detection: MATCH (a:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(b:Person) WHERE id(a) < id(b)
5. Shared IP Detection: MATCH (a:Person)-[:LOGGED_FROM]->(ip:IP)<-[:LOGGED_FROM]-(b:Person) WHERE id(a) < id(b)
6. Ring Members: MATCH (p:Person) WHERE p.id IN \$ring_member_ids OPTIONAL MATCH (p)-[:USES_DEVICE]->(d:Device) OPTIONAL MATCH (p)-[:LOGGED_FROM]->(ip:IP) OPTIONAL MATCH (p)-[:OWNS]->(a:BankAccount)
7. Ring Money Flow: MATCH (src:BankAccount)-[:TRANSFERRED_TO]->(dst:BankAccount) WHERE src.number IN \$ring_accounts OR dst.number IN \$ring_accounts
8. Ring Shared Entities: MATCH (p:Person)-[:USES_DEVICE]->(d:Device) WHERE p.id IN \$ring_member_ids WITH d, count(DISTINCT p) AS person_count WHERE person_count >= 2
9. Ring Shared IPs: MATCH (p:Person)-[:LOGGED_FROM]->(ip:IP) WHERE p.id IN \$ring_member_ids WITH ip, count(DISTINCT p) AS person_count WHERE person_count >= 2`;
}

export async function POST(request: NextRequest) {
  try {
    const { ringId } = await request.json();

    if (!ringId) {
      return NextResponse.json({ error: 'ringId required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'LLM not configured', 
        message: 'Set OPENAI_API_KEY to enable AI Investigation Brief' 
      }, { status: 503 });
    }

    // Collect graph evidence
    const evidence = await collectGraphEvidence(ringId);

    // Build prompt
    const prompt = buildPrompt(evidence);

    // Call LLM
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a financial crime analyst. Write structured investigation briefs with precise source attribution.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const brief = completion.choices[0]?.message?.content || 'Failed to generate brief';

    return NextResponse.json({
      ringId,
      brief,
      evidence: {
        ring: evidence.ring,
        leader: evidence.leader,
        identityMatchCounts: {
          dual: evidence.identityMatches.dual.length,
          device: evidence.identityMatches.device.length,
          ip: evidence.identityMatches.ip.length,
        },
        moneyFlowCount: evidence.moneyFlow.length,
        memberCount: evidence.members.length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ 
      error: 'Generation failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}