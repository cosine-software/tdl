import { useAppStore } from '../store/appStore';
import type { Diagnostic } from '../engine/types';

export function ProblemsPanel() {
  const diagnostics = useAppStore((s) => s.diagnostics);
  const selectedProblemIndex = useAppStore((s) => s.selectedProblemIndex);
  const selectProblem = useAppStore((s) => s.selectProblem);

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');
  const infos = diagnostics.filter((d) => d.severity === 'info' || d.severity === 'hint');

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-zinc-300 text-sm">
      {/* Header */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-zinc-700 bg-zinc-800 shrink-0">
        <span className="font-semibold text-zinc-200">PROBLEMS</span>
        <span className="flex items-center gap-1">
          <span className="text-red-400">⬤</span>
          <span>{errors.length}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-yellow-400">⬤</span>
          <span>{warnings.length}</span>
        </span>
        {infos.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-blue-400">⬤</span>
            <span>{infos.length}</span>
          </span>
        )}
        {diagnostics.length === 0 && (
          <span className="text-green-400 text-xs">✓ No problems</span>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {diagnostics.map((diag, index) => (
          <ProblemRow
            key={index}
            diagnostic={diag}
            index={index}
            isSelected={selectedProblemIndex === index}
            onSelect={() => selectProblem(index)}
          />
        ))}
      </div>
    </div>
  );
}

function ProblemRow({
  diagnostic,
  index: _index,
  isSelected,
  onSelect,
}: {
  diagnostic: Diagnostic;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const icon =
    diagnostic.severity === 'error' ? '🔴' :
    diagnostic.severity === 'warning' ? '🟡' :
    diagnostic.severity === 'info' ? '🔵' : '💡';

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-1 hover:bg-zinc-700/50 flex items-start gap-2 cursor-pointer border-l-2 ${
        isSelected ? 'bg-zinc-700/50 border-l-blue-400' : 'border-l-transparent'
      }`}
    >
      <span className="shrink-0 mt-0.5 text-xs">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="truncate">{diagnostic.message}</div>
        <div className="flex gap-2 text-xs text-zinc-500 mt-0.5">
          <span>Ln {diagnostic.span.line}, Col {diagnostic.span.column}</span>
          {diagnostic.rule && <span className="text-zinc-600">[{diagnostic.rule}]</span>}
          {diagnostic.specRef && (
            <span className="text-zinc-500 italic">{diagnostic.specRef}</span>
          )}
        </div>
      </div>
    </button>
  );
}
