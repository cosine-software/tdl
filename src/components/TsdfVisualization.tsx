import { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { NetworkDeclaration, NetDeclaration } from '../engine/types';

// ─── TSDF Data Extraction ─────────────────────────────────────────────────

interface NetTsdf {
  netName: string;
  tsdf: number;
  stacked: boolean;
  stackingLevel: number;
  color: string;
}

interface TerminalTsdf {
  terminalName: string;
  nets: NetTsdf[];
  totalTsdf: number;
  overcommitted: boolean;
}

interface NetworkTsdf {
  networkName: string;
  terminals: TerminalTsdf[];
  totalNetworkTsdf: number;
}

// Distinct colors for net segments
const NET_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ec4899', // pink
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // purple
];

function getProp(net: NetDeclaration, key: string): unknown {
  const p = net.properties.find((prop) => prop.key === key);
  if (!p) return undefined;
  const v = p.value;
  switch (v.type) {
    case 'percent':
    case 'number':
      return v.value;
    case 'boolean':
      return v.value;
    case 'array':
      return v.value;
    case 'identifier':
    case 'string':
      return v.value;
    default:
      return undefined;
  }
}

function extractTsdfData(network: NetworkDeclaration, colorOffset: number): NetworkTsdf | null {
  // Only Link 16 networks have TSDF
  const linkProp = network.properties.find((p) => p.key === 'link');
  if (!linkProp || (linkProp.value.type === 'identifier' && linkProp.value.value !== 'Link16')) {
    return null;
  }

  // No nets = nothing to visualise
  if (network.nets.length === 0) return null;

  // Build a map of terminal → nets with TSDF allocations
  const terminalMap = new Map<string, NetTsdf[]>();

  // Initialize from declared terminals
  for (const t of network.terminals) {
    terminalMap.set(t.name, []);
  }

  // For stacked nets, group by stacking_level
  const stackGroups = new Map<number, NetDeclaration[]>();

  for (let i = 0; i < network.nets.length; i++) {
    const net = network.nets[i]!;
    const tsdf = getProp(net, 'tsdf') as number | undefined;
    if (tsdf === undefined) continue;

    const stacked = (getProp(net, 'stacked') as boolean) ?? false;
    const stackingLevel = (getProp(net, 'stacking_level') as number) ?? 0;
    const participants = (getProp(net, 'participants') as string[]) ?? [];
    const color = NET_COLORS[(i + colorOffset) % NET_COLORS.length]!;

    const netTsdf: NetTsdf = {
      netName: net.name,
      tsdf,
      stacked,
      stackingLevel,
      color,
    };

    if (stacked) {
      if (!stackGroups.has(stackingLevel)) {
        stackGroups.set(stackingLevel, []);
      }
      stackGroups.get(stackingLevel)!.push(net);
    }

    for (const pName of participants) {
      if (!terminalMap.has(pName)) {
        terminalMap.set(pName, []);
      }
      terminalMap.get(pName)!.push(netTsdf);
    }
  }

  // Calculate effective TSDF per terminal
  // Stacked nets at the same level share slots, so only the max TSDF counts
  const terminals: TerminalTsdf[] = [];

  for (const [terminalName, nets] of terminalMap) {
    if (nets.length === 0) continue;

    // Group by stacking level for stacked nets
    const stackedByLevel = new Map<number, NetTsdf[]>();
    let unstackedTotal = 0;

    for (const net of nets) {
      if (net.stacked) {
        if (!stackedByLevel.has(net.stackingLevel)) {
          stackedByLevel.set(net.stackingLevel, []);
        }
        stackedByLevel.get(net.stackingLevel)!.push(net);
      } else {
        unstackedTotal += net.tsdf;
      }
    }

    // For stacked nets, only the max TSDF at each level counts
    let stackedTotal = 0;
    for (const [, levelNets] of stackedByLevel) {
      stackedTotal += Math.max(...levelNets.map((n) => n.tsdf));
    }

    const totalTsdf = unstackedTotal + stackedTotal;

    terminals.push({
      terminalName,
      nets,
      totalTsdf,
      overcommitted: totalTsdf > 100,
    });
  }

  // Sort: overcommitted first, then by total TSDF descending
  terminals.sort((a, b) => {
    if (a.overcommitted !== b.overcommitted) return a.overcommitted ? -1 : 1;
    return b.totalTsdf - a.totalTsdf;
  });

  const totalNetworkTsdf = network.nets.reduce((sum, net) => {
    const t = getProp(net, 'tsdf') as number | undefined;
    return sum + (t ?? 0);
  }, 0);

  return { networkName: network.name, terminals, totalNetworkTsdf };
}

// ─── Component ────────────────────────────────────────────────────────────

function TsdfBar({ terminal, maxTsdf }: { terminal: TerminalTsdf; maxTsdf: number }) {
  const barMax = Math.max(maxTsdf, 100);
  const widthPercent = Math.min((terminal.totalTsdf / barMax) * 100, 100);
  const overflowPercent = terminal.totalTsdf > 100
    ? Math.min(((terminal.totalTsdf - 100) / barMax) * 100, 100 - widthPercent)
    : 0;

  return (
    <div className="flex items-center gap-2 group">
      {/* Terminal name */}
      <div className="w-28 text-right text-xs text-zinc-400 truncate shrink-0" title={terminal.terminalName}>
        {terminal.terminalName}
      </div>

      {/* Bar area */}
      <div className="flex-1 relative h-5">
        {/* Background track */}
        <div className="absolute inset-0 bg-zinc-800 rounded-sm" />

        {/* 100% threshold line */}
        <div
          className="absolute top-0 bottom-0 w-px bg-zinc-500 z-10"
          style={{ left: `${(100 / barMax) * 100}%` }}
          title="100% budget limit"
        />

        {/* Net segments */}
        <div className="absolute inset-y-0 left-0 flex rounded-sm overflow-hidden">
          {terminal.nets.map((net, i) => {
            const segWidth = (net.tsdf / barMax) * 100;
            return (
              <div
                key={`${net.netName}-${i}`}
                className="h-full relative group/seg"
                style={{
                  width: `${segWidth}%`,
                  minWidth: segWidth > 0 ? '2px' : '0',
                  backgroundColor: net.color,
                  opacity: net.stacked ? 0.7 : 1,
                }}
                title={`${net.netName}: ${net.tsdf}%${net.stacked ? ' (stacked)' : ''}`}
              >
                {/* Stacked indicator */}
                {net.stacked && (
                  <div className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Overcommitted overlay */}
        {terminal.overcommitted && (
          <div
            className="absolute top-0 bottom-0 rounded-sm"
            style={{
              left: `${(100 / barMax) * 100}%`,
              width: `${overflowPercent}%`,
              backgroundColor: 'rgba(239, 68, 68, 0.4)',
              borderLeft: '2px solid #ef4444',
            }}
          />
        )}
      </div>

      {/* TSDF value */}
      <div className={`w-14 text-right text-xs font-mono shrink-0 ${
        terminal.overcommitted
          ? 'text-red-400 font-bold'
          : terminal.totalTsdf > 90
            ? 'text-amber-400'
            : 'text-zinc-400'
      }`}>
        {terminal.totalTsdf}%
      </div>
    </div>
  );
}

function NetworkTsdfChart({ data }: { data: NetworkTsdf }) {
  const maxTsdf = Math.max(...data.terminals.map((t) => t.totalTsdf), 100);
  const overcommittedCount = data.terminals.filter((t) => t.overcommitted).length;

  // Collect unique net names for legend
  const netLegend = new Map<string, string>();
  for (const t of data.terminals) {
    for (const n of t.nets) {
      if (!netLegend.has(n.netName)) {
        netLegend.set(n.netName, n.color);
      }
    }
  }

  return (
    <div className="mb-4 last:mb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-200">{data.networkName}</span>
          <span className="text-xs text-zinc-500">
            Network total: {data.totalNetworkTsdf}%
          </span>
        </div>
        {overcommittedCount > 0 && (
          <span className="text-xs text-red-400 font-medium">
            {overcommittedCount} terminal{overcommittedCount > 1 ? 's' : ''} overcommitted
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-2">
        {[...netLegend.entries()].map(([name, color]) => (
          <div key={name} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs text-zinc-500">{name}</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div className="space-y-1">
        {data.terminals.map((terminal) => (
          <TsdfBar key={terminal.terminalName} terminal={terminal} maxTsdf={maxTsdf} />
        ))}
      </div>
    </div>
  );
}

export function TsdfVisualization() {
  const ast = useAppStore((s) => s.ast);

  const tsdfData = useMemo(() => {
    if (!ast) return [];
    let colorOffset = 0;
    const results: NetworkTsdf[] = [];
    for (const network of ast.networks) {
      const data = extractTsdfData(network, colorOffset);
      if (data) {
        results.push(data);
        colorOffset += network.nets.length;
      }
    }
    return results;
  }, [ast]);

  if (tsdfData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-zinc-600">
        No Link 16 nets with TSDF allocations
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          TSDF Budget
        </span>
        <span className="text-xs text-zinc-600">Time Slot Duty Factor per terminal</span>
      </div>
      {tsdfData.map((data) => (
        <NetworkTsdfChart key={data.networkName} data={data} />
      ))}
    </div>
  );
}
