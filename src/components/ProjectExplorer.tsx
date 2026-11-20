import { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2, FolderTree } from 'lucide-react';
import type { ProjectFileItem } from '../types/assistant';

interface ProjectExplorerProps {
  files: ProjectFileItem[];
  loading: boolean;
  error: string | null;
  onDownloadZip: () => void;
  downloadingZip: boolean;
}

const CATEGORY_LABELS: Record<ProjectFileItem['category'], string> = {
  gradle: 'Gradle & Build',
  manifest: 'AndroidManifest',
  'kotlin-core': 'Kotlin Core & Safety',
  'kotlin-ui': 'Jetpack Compose UI',
  resources: 'XML Resources (EN & BN)',
  tests: 'Kotlin Unit Tests',
  backend: 'Secure Gemini Backend',
  docs: 'Guides & README',
};

export function ProjectExplorer({
  files,
  loading,
  error,
  onDownloadZip,
  downloadingZip,
}: ProjectExplorerProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProjectFileItem['category']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<string>(
    'android/app/src/main/java/com/sifatagent/app/domain/safety/ActionValidator.kt'
  );
  const [copied, setCopied] = useState(false);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return files.filter((file) => {
      if (categoryFilter !== 'all' && file.category !== categoryFilter) return false;
      if (q && !file.path.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [files, categoryFilter, searchQuery]);

  const activeFile = useMemo(() => {
    return (
      files.find((f) => f.path === selectedPath) ??
      filteredFiles[0] ??
      files[0] ??
      null
    );
  }, [files, filteredFiles, selectedPath]);

  const handleCopy = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1525] p-8 text-sm text-slate-600 dark:text-slate-400">
        Loading Android Studio project files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-6 text-sm text-red-700 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Android Studio Project & Secure Backend
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Complete Kotlin, Jetpack Compose Material 3, AccessibilityService, Gradle, and Node.js Gemini proxy sources ({files.length} files).
          </p>
        </div>

        <button
          type="button"
          onClick={onDownloadZip}
          disabled={downloadingZip}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{downloadingZip ? 'Preparing Archive...' : 'Download Android Project (.zip)'}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            categoryFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-[#151F35] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          All Files ({files.length})
        </button>
        {(Object.keys(CATEGORY_LABELS) as Array<ProjectFileItem['category']>).map((cat) => {
          const count = files.filter((f) => f.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-[#151F35] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1525] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <label htmlFor="project-file-search" className="sr-only">
              Filter project files
            </label>
            <input
              id="project-file-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files (e.g. Accessibility, Gradle)..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#070B14] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
            {filteredFiles.map((file) => {
              const selected = activeFile?.path === file.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full text-left px-3.5 py-2.5 min-h-[44px] flex items-center justify-between gap-2 transition-colors ${
                    selected
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-slate-50 dark:hover:bg-[#151F35] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileCode2 className="w-4 h-4 shrink-0 opacity-70" />
                    <span className="text-xs font-mono truncate">{file.path}</span>
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                    {file.lineCount}L
                  </span>
                </button>
              );
            })}
            {filteredFiles.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No files match "{searchQuery}".
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1525] flex flex-col overflow-hidden">
          {activeFile ? (
            <>
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderTree className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
                    {activeFile.path}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 max-h-[540px] overflow-auto text-xs leading-relaxed font-mono text-slate-800 dark:text-slate-200 bg-slate-50/60 dark:bg-[#070B14]">
                <code>{activeFile.content}</code>
              </pre>
            </>
          ) : (
            <div className="p-8 text-sm text-slate-500">Select a file to inspect its source.</div>
          )}
        </div>
      </div>
    </div>
  );
}
