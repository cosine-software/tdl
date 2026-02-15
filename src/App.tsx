import { useCallback, useRef, useState } from 'react';
import { TdlEditor } from './components/TdlEditor';
import { ProblemsPanel } from './components/ProblemsPanel';
import { DocumentOutline } from './components/DocumentOutline';
import { ExportImportToolbar } from './components/ExportImportToolbar';
import { TsdfVisualization } from './components/TsdfVisualization';
import { useAppStore } from './store/appStore';
import { detectFormat, importAuto } from './engine/importer';

export default function App() {
  const [bottomTab, setBottomTab] = useState<'problems' | 'tsdf'>('problems');
  const [dragging, setDragging] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const setSource = useAppStore((s) => s.setSource);

  // Track nested dragenter/dragleave with a counter
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (dragCountRef.current === 1) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCountRef.current = 0;

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const content = await file.text();
    const format = detectFormat(content);

    if (format === 'tdl') {
      setSource(content);
      setImportWarnings([]);
    } else {
      const result = importAuto(content);
      if (result.source) {
        setSource(result.source);
      }
      setImportWarnings(result.warnings);
    }
  }, [setSource]);

  return (
    <div
      className="h-screen w-screen flex flex-col bg-zinc-900 text-zinc-100 overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700 shrink-0">
        <div className="flex items-center gap-3">
          <a href={import.meta.env.BASE_URL} className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity">
            <span className="text-blue-400">TDL</span> Config Editor
          </a>
          <span className="text-xs text-zinc-500 bg-zinc-700 px-2 py-0.5 rounded">
            Link 16 / Link 22
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <ExportImportToolbar />
          <span className="border-l border-zinc-700 h-4 mx-1" />
          <span>⚠️ Training / Configuration Tool Only — No Classified Data</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-zinc-700 overflow-y-auto bg-zinc-850 shrink-0">
          <DocumentOutline />
        </aside>

        {/* Editor */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Editor area */}
          <div className="flex-1 overflow-hidden">
            <TdlEditor />
          </div>

          {/* Bottom panel with tabs */}
          <div className="h-52 border-t border-zinc-700 shrink-0 overflow-hidden flex flex-col">
            {/* Tab bar */}
            <div className="flex items-center gap-0 bg-zinc-800 border-b border-zinc-700 shrink-0">
              <button
                onClick={() => setBottomTab('problems')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  bottomTab === 'problems'
                    ? 'text-zinc-100 border-b-2 border-blue-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Problems
              </button>
              <button
                onClick={() => setBottomTab('tsdf')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  bottomTab === 'tsdf'
                    ? 'text-zinc-100 border-b-2 border-blue-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                TSDF Budget
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {bottomTab === 'problems' ? <ProblemsPanel /> : <TsdfVisualization />}
            </div>
          </div>
        </main>
      </div>
      {/* Drag-and-drop overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-zinc-900/80 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-blue-400 rounded-2xl px-12 py-10 text-center">
            <div className="text-3xl mb-2">📄</div>
            <div className="text-blue-400 font-semibold text-lg">Drop file to import</div>
            <div className="text-zinc-500 text-xs mt-1">JSON, XML, CSV, or TDL</div>
          </div>
        </div>
      )}

      {/* Drop import warnings toast */}
      {importWarnings.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-amber-900/90 border border-amber-700 text-amber-200 rounded-lg p-3 max-w-sm text-xs shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">Import Warnings</span>
            <button
              onClick={() => setImportWarnings([])}
              className="text-amber-400 hover:text-amber-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <ul className="list-disc list-inside space-y-0.5">
            {importWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
