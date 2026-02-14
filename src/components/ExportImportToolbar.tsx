import { useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { exportToJson, exportToXml } from '../engine/exporter';
import { importAuto, detectFormat } from '../engine/importer';

type ExportFormat = 'json' | 'xml';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportImportToolbar() {
  const ast = useAppStore((s) => s.ast);
  const setSource = useAppStore((s) => s.setSource);
  const source = useAppStore((s) => s.source);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const handleExport = (format: ExportFormat) => {
    if (!ast) return;
    setShowExportMenu(false);

    if (format === 'json') {
      const output = exportToJson(ast);
      downloadFile(output, 'tdl-config.json', 'application/json');
    } else {
      const output = exportToXml(ast);
      downloadFile(output, 'tdl-config.xml', 'application/xml');
    }
  };

  const handleDownloadTdl = () => {
    downloadFile(source, 'config.tdl', 'text/plain');
    setShowExportMenu(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    // Reset input so the same file can be re-imported
    e.target.value = '';
  };

  return (
    <div className="relative flex items-center gap-1">
      {/* Import */}
      <button
        onClick={handleImportClick}
        className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
        title="Import from JSON, XML, CSV, or TDL file"
      >
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.xml,.csv,.tdl,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Export dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="px-2 py-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
          title="Export configuration"
        >
          Export ▾
        </button>
        {showExportMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowExportMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px]">
              <button
                onClick={handleDownloadTdl}
                className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
              >
                Download .tdl
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                disabled={!ast}
              >
                Export as JSON
              </button>
              <button
                onClick={() => handleExport('xml')}
                className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                disabled={!ast}
              >
                Export as XML
              </button>
            </div>
          </>
        )}
      </div>

      {/* Import warnings toast */}
      {importWarnings.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-amber-900/90 border border-amber-700 text-amber-200 rounded-lg p-3 max-w-sm text-xs shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">Import Warnings</span>
            <button
              onClick={() => setImportWarnings([])}
              className="text-amber-400 hover:text-amber-200"
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
