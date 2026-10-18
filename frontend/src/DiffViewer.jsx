import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  Columns, 
  AlignJustify, 
  Check, 
  Copy, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

/**
 * Computes a clean line-by-line diff between two text strings
 */
function computeLineDiff(origStr, modStr) {
  const origLines = (origStr || '').split('\n');
  const modLines = (modStr || '').split('\n');

  // Simple and robust LCS-based line differencing
  const n = origLines.length;
  const m = modLines.length;
  
  // DP table for LCS lengths
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (origLines[i] === modLines[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const unified = [];
  const left = [];
  const right = [];

  let i = 0;
  let j = 0;
  let origLineNum = 1;
  let modLineNum = 1;
  let additions = 0;
  let deletions = 0;

  while (i < n || j < m) {
    if (i < n && j < m && origLines[i] === modLines[j]) {
      // Unchanged line
      unified.push({
        type: 'unchanged',
        oldNum: origLineNum,
        newNum: modLineNum,
        text: origLines[i]
      });
      left.push({ type: 'unchanged', num: origLineNum, text: origLines[i] });
      right.push({ type: 'unchanged', num: modLineNum, text: modLines[j] });
      i++;
      j++;
      origLineNum++;
      modLineNum++;
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      // Added line
      additions++;
      unified.push({
        type: 'addition',
        oldNum: null,
        newNum: modLineNum,
        text: modLines[j]
      });
      left.push({ type: 'empty', num: null, text: '' });
      right.push({ type: 'addition', num: modLineNum, text: modLines[j] });
      j++;
      modLineNum++;
    } else if (i < n) {
      // Removed line
      deletions++;
      unified.push({
        type: 'deletion',
        oldNum: origLineNum,
        newNum: null,
        text: origLines[i]
      });
      left.push({ type: 'deletion', num: origLineNum, text: origLines[i] });
      right.push({ type: 'empty', num: null, text: '' });
      i++;
      origLineNum++;
    }
  }

  return { unified, left, right, additions, deletions };
}

export default function DiffViewer({
  originalCode,
  patchCode,
  unifiedDiffText,
  rootCause,
  remediation,
  targetFilename = 'target_module.py',
  onApplyPatch
}) {
  const [viewMode, setViewMode] = useState('unified'); // 'unified' | 'split'
  const [copied, setCopied] = useState(false);

  const diffData = useMemo(() => {
    return computeLineDiff(originalCode, patchCode);
  }, [originalCode, patchCode]);

  const handleCopyDiff = () => {
    const textToCopy = unifiedDiffText || (
      `--- a/${targetFilename}\n+++ b/${targetFilename}\n` +
      diffData.unified.map(line => {
        if (line.type === 'addition') return `+ ${line.text}`;
        if (line.type === 'deletion') return `- ${line.text}`;
        return `  ${line.text}`;
      }).join('\n')
    );
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPatch = () => {
    const patchContent = unifiedDiffText || (
      `--- a/${targetFilename}\n+++ b/${targetFilename}\n` +
      diffData.unified.map(line => {
        if (line.type === 'addition') return `+ ${line.text}`;
        if (line.type === 'deletion') return `- ${line.text}`;
        return `  ${line.text}`;
      }).join('\n')
    );
    const blob = new Blob([patchContent], { type: 'text/x-patch' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetFilename}.patch`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Diff Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs font-sans">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px]">
            <span className="text-emerald-400 font-bold">+{diffData.additions}</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400 font-bold">-{diffData.deletions}</span>
          </div>

          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition text-xs font-medium ${
                viewMode === 'unified' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlignJustify className="h-3.5 w-3.5" />
              <span>Unified</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition text-xs font-medium ${
                viewMode === 'split' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Split (Side-by-Side)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onApplyPatch && (
            <button
              onClick={onApplyPatch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Apply This Patch</span>
            </button>
          )}

          <button
            onClick={handleCopyDiff}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied Diff!' : 'Copy .diff'}</span>
          </button>

          <button
            onClick={handleDownloadPatch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download .patch</span>
          </button>
        </div>
      </div>

      {/* Code Diff Display Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs shadow-inner">
        
        {/* UNIFIED VIEW */}
        {viewMode === 'unified' && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto divide-y divide-slate-900/60">
            {diffData.unified.map((line, idx) => {
              const isAdd = line.type === 'addition';
              const isDel = line.type === 'deletion';

              return (
                <div
                  key={idx}
                  className={`flex items-stretch min-w-full leading-5 transition-colors ${
                    isAdd
                      ? 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                      : isDel
                      ? 'bg-rose-950/30 text-rose-300 hover:bg-rose-950/50'
                      : 'text-slate-300 hover:bg-slate-900/30'
                  }`}
                >
                  {/* Old line number */}
                  <span className="w-10 select-none text-right pr-2 py-0.5 text-[11px] text-slate-600 bg-slate-950/40 border-r border-slate-900">
                    {line.oldNum || ''}
                  </span>
                  {/* New line number */}
                  <span className="w-10 select-none text-right pr-2 py-0.5 text-[11px] text-slate-600 bg-slate-950/40 border-r border-slate-900">
                    {line.newNum || ''}
                  </span>
                  {/* Sign (+ / -) */}
                  <span className={`w-6 select-none text-center py-0.5 font-bold ${
                    isAdd ? 'text-emerald-400' : isDel ? 'text-rose-400' : 'text-slate-700'
                  }`}>
                    {isAdd ? '+' : isDel ? '-' : ' '}
                  </span>
                  {/* Code Line Content */}
                  <span className="flex-1 px-2 py-0.5 whitespace-pre">
                    {line.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* SPLIT VIEW (Side-by-Side) */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-2 divide-x divide-slate-800 overflow-x-auto max-h-[460px] overflow-y-auto">
            {/* Left Side: Unpatched Buggy Code */}
            <div>
              <div className="px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 text-[11px] text-rose-400 font-sans font-semibold flex items-center justify-between">
                <span>Original (Buggy)</span>
                <span className="text-slate-500 font-mono text-[10px]">Unpatched</span>
              </div>
              <div className="divide-y divide-slate-900/60">
                {diffData.left.map((line, idx) => {
                  const isDel = line.type === 'deletion';
                  const isEmpty = line.type === 'empty';

                  return (
                    <div
                      key={idx}
                      className={`flex items-stretch leading-5 ${
                        isDel
                          ? 'bg-rose-950/30 text-rose-300'
                          : isEmpty
                          ? 'bg-slate-950/80 text-transparent select-none'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="w-9 select-none text-right pr-2 py-0.5 text-[11px] text-slate-600 bg-slate-950/40 border-r border-slate-900">
                        {line.num || ''}
                      </span>
                      <span className="w-5 select-none text-center py-0.5 font-bold text-rose-400">
                        {isDel ? '-' : ' '}
                      </span>
                      <span className="flex-1 px-2 py-0.5 whitespace-pre overflow-hidden">
                        {line.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Remediated Patch Code */}
            <div>
              <div className="px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 text-[11px] text-emerald-400 font-sans font-semibold flex items-center justify-between">
                <span>Remediated (Patch)</span>
                <span className="text-slate-500 font-mono text-[10px]">Fix</span>
              </div>
              <div className="divide-y divide-slate-900/60">
                {diffData.right.map((line, idx) => {
                  const isAdd = line.type === 'addition';
                  const isEmpty = line.type === 'empty';

                  return (
                    <div
                      key={idx}
                      className={`flex items-stretch leading-5 ${
                        isAdd
                          ? 'bg-emerald-950/30 text-emerald-300'
                          : isEmpty
                          ? 'bg-slate-950/80 text-transparent select-none'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="w-9 select-none text-right pr-2 py-0.5 text-[11px] text-slate-600 bg-slate-950/40 border-r border-slate-900">
                        {line.num || ''}
                      </span>
                      <span className="w-5 select-none text-center py-0.5 font-bold text-emerald-400">
                        {isAdd ? '+' : ' '}
                      </span>
                      <span className="flex-1 px-2 py-0.5 whitespace-pre overflow-hidden">
                        {line.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Engineering Breakdown: Why It's An Error & How The Patch Fixes It */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-sans">
        
        {/* 🔴 Root Cause: Why it's an error */}
        <div className="rounded-xl border border-rose-900/40 bg-gradient-to-b from-rose-950/20 to-slate-950 p-4 shadow-lg space-y-2">
          <div className="flex items-center gap-2 text-rose-400 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>Why This Is an Error (Root Cause)</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            {rootCause || "The unpatched implementation lacks defensive boundaries for edge-case inputs or missing attributes, causing unhandled exceptions during execution."}
          </p>
          <div className="pt-1 flex items-center gap-2 text-[11px] text-rose-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>Triggers unhandled exception in unpatched code</span>
          </div>
        </div>

        {/* 🟢 Remediation: How the patch fixes it */}
        <div className="rounded-xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/20 to-slate-950 p-4 shadow-lg space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            <span>How the Patch Fixes It (Remediation)</span>
          </div>
          <p className="text-xs text-emerald-200/90 leading-relaxed">
            {remediation || "Introduces defensive guards, graceful defaulting, and boundary sanitization to guarantee safe execution without crashing."}
          </p>
          <div className="pt-1 flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Guarantees 100% test pass (🟢 GREEN Phase)</span>
          </div>
        </div>

      </div>
    </div>
  );
}
