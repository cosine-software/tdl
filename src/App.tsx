import { useState } from 'react';
import { TdlEditor } from './components/TdlEditor';
import { ProblemsPanel } from './components/ProblemsPanel';
import { DocumentOutline } from './components/DocumentOutline';
import { ExportImportToolbar } from './components/ExportImportToolbar';
import { TsdfVisualization } from './components/TsdfVisualization';

export default function App() {
  const [bottomTab, setBottomTab] = useState<'problems' | 'tsdf'>('problems');

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-900 text-zinc-100 overflow-hidden">
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
    </div>
  );
}
