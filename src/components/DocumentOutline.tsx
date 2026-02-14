import { useAppStore } from '../store/appStore';
import type { NetworkDeclaration, TerminalDeclaration, NetDeclaration, SourceSpan } from '../engine/types';

export function DocumentOutline() {
  const ast = useAppStore((s) => s.ast);
  const reveal = useAppStore((s) => s.setRevealSpan);

  if (!ast || ast.networks.length === 0) {
    return (
      <div className="p-3 text-zinc-500 text-sm italic">
        No networks defined
      </div>
    );
  }

  return (
    <div className="text-sm text-zinc-300">
      <div className="px-3 py-1.5 border-b border-zinc-700 bg-zinc-800 font-semibold text-zinc-200">
        OUTLINE
      </div>
      <div className="p-1">
        {ast.networks.map((network, i) => (
          <NetworkNode key={i} network={network} onReveal={reveal} />
        ))}
      </div>
    </div>
  );
}

function NetworkNode({ network, onReveal }: { network: NetworkDeclaration; onReveal: (span: SourceSpan) => void }) {
  const linkType = network.properties.find((p) => p.key === 'link');
  const linkLabel = linkType?.value.type === 'identifier' ? linkType.value.value : '';

  return (
    <div>
      <div onClick={() => onReveal(network.span)} className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-zinc-700/50 rounded cursor-pointer">
        <span className="text-purple-400 text-xs">⬡</span>
        <span className="font-medium">{network.name}</span>
        <span className="text-zinc-500 text-xs">{linkLabel}</span>
      </div>

      <div className="pl-4">
        {network.terminals.map((t, i) => (
          <TerminalNode key={i} terminal={t} onReveal={onReveal} />
        ))}
        {network.nets.map((n, i) => (
          <NetNode key={i} net={n} onReveal={onReveal} />
        ))}
        {network.subnetworks.map((s, i) => (
          <div key={i} onClick={() => onReveal(s.span)} className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-zinc-700/50 rounded cursor-pointer">
            <span className="text-teal-400 text-xs">◆</span>
            <span>{s.name}</span>
            <span className="text-zinc-500 text-xs">subnetwork</span>
          </div>
        ))}
        {network.messages && (
          <div onClick={() => onReveal(network.messages!.span)} className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-zinc-700/50 rounded cursor-pointer">
            <span className="text-amber-400 text-xs">✉</span>
            <span>Messages</span>
            <span className="text-zinc-500 text-xs">({network.messages.entries.length})</span>
          </div>
        )}
        {network.filters && (
          <div onClick={() => onReveal(network.filters!.span)} className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-zinc-700/50 rounded cursor-pointer">
            <span className="text-cyan-400 text-xs">⚡</span>
            <span>Filters</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TerminalNode({ terminal, onReveal }: { terminal: TerminalDeclaration; onReveal: (span: SourceSpan) => void }) {
  const role = terminal.properties.find((p) => p.key === 'role');
  const roleLabel = role?.value.type === 'identifier' ? role.value.value : '';
  const isNCS = roleLabel === 'NetControlStation';

  return (
    <div onClick={() => onReveal(terminal.span)} className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-zinc-700/50 rounded cursor-pointer">
      <span className={`text-xs ${isNCS ? 'text-yellow-400' : 'text-blue-400'}`}>
        {isNCS ? '★' : '●'}
      </span>
      <span>{terminal.name}</span>
      <span className="text-zinc-500 text-xs">{roleLabel}</span>
    </div>
  );
}

function NetNode({ net, onReveal }: { net: NetDeclaration; onReveal: (span: SourceSpan) => void }) {
  const npg = net.properties.find((p) => p.key === 'npg');
  const npgLabel = npg?.value.type === 'identifier' ? npg.value.value : '';
  const tsdf = net.properties.find((p) => p.key === 'tsdf');
  const tsdfLabel = tsdf?.value.type === 'percent' ? `${tsdf.value.value}%` : '';

  return (
    <div onClick={() => onReveal(net.span)} className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-zinc-700/50 rounded cursor-pointer">
      <span className="text-green-400 text-xs">◇</span>
      <span>{net.name}</span>
      <span className="text-zinc-500 text-xs">{npgLabel}</span>
      {tsdfLabel && <span className="text-zinc-600 text-xs">{tsdfLabel}</span>}
    </div>
  );
}
