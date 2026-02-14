import { useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useAppStore } from '../store/appStore';
import {
  tdlLanguageDefinition,
  tdlLanguageConfig,
  createCompletionProvider,
  createHoverProvider,
} from '../editor';

let languageRegistered = false;

export function TdlEditor() {
  const source = useAppStore((s) => s.source);
  const diagnostics = useAppStore((s) => s.diagnostics);
  const setSource = useAppStore((s) => s.setSource);
  const selectedProblemIndex = useAppStore((s) => s.selectedProblemIndex);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register TDL language (once)
    if (!languageRegistered) {
      monaco.languages.register({ id: 'tdl' });
      monaco.languages.setMonarchTokensProvider('tdl', tdlLanguageDefinition);
      monaco.languages.setLanguageConfiguration('tdl', tdlLanguageConfig);
      monaco.languages.registerCompletionItemProvider('tdl', createCompletionProvider());
      monaco.languages.registerHoverProvider('tdl', createHoverProvider());
      languageRegistered = true;
    }

    // Editor options
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      automaticLayout: true,
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true },
    });
  }, []);

  const handleEditorChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined) {
        setSource(value);
      }
    },
    [setSource],
  );

  // Update diagnostics markers
  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const markers: editor.IMarkerData[] = diagnostics.map((d) => ({
      severity:
        d.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : d.severity === 'warning'
            ? monaco.MarkerSeverity.Warning
            : d.severity === 'info'
              ? monaco.MarkerSeverity.Info
              : monaco.MarkerSeverity.Hint,
      message: d.specRef ? `${d.message}\n\n[${d.specRef}]` : d.message,
      startLineNumber: d.span.line,
      startColumn: d.span.column,
      endLineNumber: d.span.line,
      endColumn: d.span.column + Math.max(d.span.length, 1),
      source: d.rule ? `tdl: ${d.rule}` : 'tdl',
    }));

    monaco.editor.setModelMarkers(model, 'tdl', markers);
  }, [diagnostics]);

  // Navigate to selected problem
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || selectedProblemIndex === null) return;

    const diag = diagnostics[selectedProblemIndex];
    if (diag) {
      editor.revealLineInCenter(diag.span.line);
      editor.setPosition({ lineNumber: diag.span.line, column: diag.span.column });
      editor.focus();
    }
  }, [selectedProblemIndex, diagnostics]);

  // Navigate to span requested by outline / other UI
  const revealSpan = useAppStore((s) => s.revealSpan);
  const setRevealSpan = useAppStore((s) => s.setRevealSpan);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !revealSpan) return;

    editor.revealLineInCenter(revealSpan.line);
    editor.setPosition({ lineNumber: revealSpan.line, column: revealSpan.column });
    editor.focus();
    setRevealSpan(null);
  }, [revealSpan, setRevealSpan]);

  return (
    <Editor
      height="100%"
      language="tdl"
      theme="vs-dark"
      value={source}
      onMount={handleEditorMount}
      onChange={handleEditorChange}
      loading={<div className="flex items-center justify-center h-full text-zinc-500">Loading editor...</div>}
    />
  );
}
