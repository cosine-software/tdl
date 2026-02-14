import { TdlEditor } from './components/TdlEditor';
import { ProblemsPanel } from './components/ProblemsPanel';
import { DocumentOutline } from './components/DocumentOutline';

export default function App() {
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

          {/* Problems panel */}
          <div className="h-48 border-t border-zinc-700 shrink-0 overflow-hidden">
            <ProblemsPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
