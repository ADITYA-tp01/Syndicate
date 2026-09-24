import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/falkordb';
import { RING_MEMBERS, RING_MONEY_FLOW, RING_SHARED_ENTITIES, RING_SHARED_IPS } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const memberIds = searchParams.get('memberIds')?.split(',').filter(Boolean) || [];

  if (memberIds.length === 0) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  try {
    // Get members with their devices, IPs, accounts
    const membersResult = await runQuery(RING_MEMBERS, { ring_member_ids: memberIds });
    
    // Get money flow
    const accounts = (membersResult.result || []).flatMap((m: any) => m[4] || m.accounts || []);
    const moneyResult = await runQuery(RING_MONEY_FLOW, { ring_accounts: accounts });

    // Get shared devices
    const sharedDevicesResult = await runQuery(RING_SHARED_ENTITIES, { ring_member_ids: memberIds });

    // Get shared IPs
    const sharedIPsResult = await runQuery(RING_SHARED_IPS, { ring_member_ids: memberIds });

    // Build Cytoscape elements
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeSet = new Set<string>();

    // Color by ring (Alpha=amber, Beta=red, Gamma=purple)
    const ringColors: Record<string, string> = {
      alpha_: 'ring-alpha',
      beta_: 'ring-beta',
      gamma_: 'ring-gamma',
    };

    function getRingClass(prefix: string) {
      for (const [key, cls] of Object.entries(ringColors)) {
        if (prefix.startsWith(key)) return cls;
      }
      return '';
    }

    // Add members
    for (const row of membersResult.result || []) {
      const id = row[0] || row.id;
      const name = row[1] || row.name;
      const devices = row[3] || row.devices || [];
      const ips = row[4] || row.ips || [];
      const accts = row[5] || row.accounts || [];

      const ringClass = getRingClass(id);

      if (!nodeSet.has(id)) {
        nodeSet.add(id);
        nodes.push({
          data: { id, label: name, type: 'Person' },
          classes: `person ${ringClass}`,
        });
      }

      // Add devices
      for (const dev of devices) {
        if (!nodeSet.has(dev)) {
          nodeSet.add(dev);
          nodes.push({
            data: { id: dev, label: dev, type: 'Device' },
            classes: 'device',
          });
        }
        edges.push({
          data: { id: `e-${id}-${dev}`, source: id, target: dev, type: 'USES_DEVICE' },
          classes: 'device',
        });
      }

      // Add IPs
      for (const ip of ips) {
        if (!nodeSet.has(ip)) {
          nodeSet.add(ip);
          nodes.push({
            data: { id: ip, label: ip, type: 'IP' },
            classes: 'ip',
          });
        }
        edges.push({
          data: { id: `e-${id}-${ip}`, source: id, target: ip, type: 'LOGGED_FROM' },
          classes: 'ip',
        });
      }

      // Add accounts
      for (const acct of accts) {
        if (!nodeSet.has(acct)) {
          nodeSet.add(acct);
          nodes.push({
            data: { id: acct, label: acct, type: 'BankAccount' },
            classes: 'account',
          });
        }
        edges.push({
          data: { id: `e-${id}-${acct}`, source: id, target: acct, type: 'OWNS' },
          classes: 'owns',
        });
      }
    }

    // Add money flow edges
    for (const row of moneyResult.result || []) {
      const src = row[0] || row.source;
      const dst = row[1] || row.target;
      const amount = row[3] || row.total_amount;

      if (nodeSet.has(src) && nodeSet.has(dst)) {
        edges.push({
          data: { id: `e-${src}-${dst}-tx`, source: src, target: dst, amount: amount || 0, type: 'TRANSFERRED_TO' },
          classes: 'transfer',
        });
      }
    }

    // Add shared device indicator nodes (optional visual)
    for (const row of sharedDevicesResult.result || []) {
      const dev = row[0] || row.device;
      if (nodeSet.has(dev)) {
        // Already added, could add a special class
      }
    }

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error('Ring subgraph error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}