import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Code,
  FileText,
  Box,
  Copy,
  Check,
  ExternalLink,
  Play,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Key,
  Github,
  RefreshCw,
  Layers,
  ShieldCheck,
  ArrowRight,
  Download,
  FileCode2,
  Zap,
  Info,
  Bug,
  Cpu,
  RotateCcw,
  Wand2,
  CheckCircle,
  XCircle,
  Clock,
  Flame,
  GitCompare
} from 'lucide-react';
import DiffViewer from './DiffViewer';

export default function App() {
  const [issueUrl, setIssueUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Editable Code State
  const [sourceCode, setSourceCode] = useState('');
  const [testCode, setTestCode] = useState('');
  const [initialSourceCode, setInitialSourceCode] = useState('');
  const [patchCode, setPatchCode] = useState('');
  const [activeTab, setActiveTab] = useState('target_module'); // 'target_module', 'test_repro', 'preflight_md', 'devcontainer', 'terminal'

  // Execution Results
  const [executionResult, setExecutionResult] = useState(null);

  const [copiedKey, setCopiedKey] = useState(null);
  const [samples, setSamples] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('preflight_gemini_key') || '');
  const [githubToken, setGithubToken] = useState(localStorage.getItem('preflight_gh_token') || '');
  const [backendStatus, setBackendStatus] = useState('checking');

  const terminalRef = useRef(null);

  // Load curated sample issues
  useEffect(() => {
    fetch('/samples')
      .then(res => res.json())
      .then(data => {
        setSamples(data);
        setBackendStatus('connected');
      })
      .catch(() => {
        setBackendStatus('offline');
        setSamples([
          {
            id: 'requests-chunked',
            title: 'Streaming chunked uploads fail when body is a generator yielding bytes',
            repo: 'psf/requests',
            issue_number: 5491,
            url: 'https://github.com/psf/requests/issues/5491',
            tag: 'Python / Networking'
          },
          {
            id: 'flask-subdomain',
            title: "Blueprint url_value_preprocessor doesn't receive subdomain params",
            repo: 'pallets/flask',
            issue_number: 4523,
            url: 'https://github.com/pallets/flask/issues/4523',
            tag: 'Web / Routing'
          },
          {
            id: 'httpx-redirect-auth',
            title: 'Authorization header stripped prematurely on same-origin redirect',
            repo: 'encode/httpx',
            issue_number: 1230,
            url: 'https://github.com/encode/httpx/issues/1230',
            tag: 'Async / HTTP'
          },
          {
            id: 'fastapi-query-list',
            title: 'Query parameter with List[str] and default factory yields empty tuple',
            repo: 'fastapi/fastapi',
            issue_number: 3112,
            url: 'https://github.com/fastapi/fastapi/issues/3112',
            tag: 'API / Validation'
          }
        ]);
      });
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + Enter to run test
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (result && !executing) {
          e.preventDefault();
          handleExecuteTest();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, executing, testCode, sourceCode]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveKeys = () => {
    localStorage.setItem('preflight_gemini_key', geminiKey);
    localStorage.setItem('preflight_gh_token', githubToken);
    setShowConfig(false);
  };

  const downloadFile = (filename, content) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleAnalyze = async (urlToAnalyze) => {
    const targetUrl = urlToAnalyze || issueUrl;
    if (!targetUrl.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setExecutionResult(null);

    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_url: targetUrl.trim(),
          gemini_api_key: geminiKey || undefined,
          github_token: githubToken || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setSourceCode(data.source_code || '');
      setInitialSourceCode(data.source_code || '');
      setPatchCode(data.patch_code || '');
      setTestCode(data.test_repro || '');
      setActiveTab('target_module');
      setBackendStatus('connected');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to analyze repository. Check connection or API keys.');
    } finally {
      setLoading(false);
    }
  };

  // Run the code live inside the sandbox
  const handleExecuteTest = async () => {
    if (!result) return;
    setExecuting(true);

    try {
      const res = await fetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_code: testCode,
          source_code: sourceCode,
          target_filename: result.target_filename || 'target_module.py'
        })
      });

      if (!res.ok) {
        throw new Error(`Execution error (${res.status})`);
      }

      const execData = await res.json();
      setExecutionResult(execData);

      // Auto-scroll terminal into view smoothly
      setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setExecutionResult({
        status: 'error',
        exit_code: 1,
        stdout: '',
        stderr: err.message,
        duration_ms: 0,
        phase: '⚠️ EXECUTION ERROR',
        summary_line: err.message
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleApplyPatch = () => {
    if (patchCode) {
      setSourceCode(patchCode);
    }
  };

  const handleResetCode = () => {
    setSourceCode(initialSourceCode);
    if (result) {
      setTestCode(result.test_repro);
    }
    setExecutionResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="h-5 w-5 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  PreFlight Sandbox
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Interactive DevTool
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Automated Execution Layer for First-Mile Open-Source Contributions
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50 text-slate-300">
              <span className={`h-2 w-2 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="hidden md:inline">{backendStatus === 'connected' ? 'Pytest Sandbox Ready' : 'Connecting...'}</span>
            </div>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
              title="Configure API Keys"
            >
              <Key className="h-3.5 w-3.5 text-slate-400" />
              <span>API Keys</span>
            </button>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition p-1.5"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* API Key Modal / Dropdown */}
        {showConfig && (
          <div className="border-t border-slate-800 bg-slate-900/95 px-4 py-4 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-emerald-400" /> Optional Custom API Keys
                </h4>
                <button
                  onClick={() => setShowConfig(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs text-slate-400">
                You can leave these blank if you already configured them in your backend <code className="text-emerald-400">.env</code>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Gemini API Key</label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">GitHub Personal Token</label>
                  <input
                    type="password"
                    placeholder="ghp_..."
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSaveKeys}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold px-4 py-1.5 rounded-lg transition"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>AI Automated Execution Layer &bull; Live Code Editing & Testing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Crush the <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">First-Mile Wall</span> in Open Source
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Paste any GitHub issue URL. PreFlight pinpoints the defect, loads editable target code with a failing <code className="text-rose-400 font-mono">test_repro.py</code> (RED phase), lets you patch the code directly in the sandbox, and run tests live to confirm GREEN!
          </p>
        </div>

        {/* Input Bar */}
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyze();
            }}
            className="relative flex items-center"
          >
            <div className="absolute left-4 text-slate-500 flex items-center pointer-events-none">
              <Github className="h-5 w-5" />
            </div>
            <input
              type="url"
              required
              value={issueUrl}
              onChange={(e) => setIssueUrl(e.target.value)}
              placeholder="https://github.com/owner/repository/issues/123"
              className="w-full pl-12 pr-40 py-4 rounded-2xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xl transition"
            />
            <button
              type="submit"
              disabled={loading || !issueUrl.trim()}
              className="absolute right-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Launch Sandbox</span>
                </>
              )}
            </button>
          </form>

          {/* Sample Issues Pills */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-500 font-medium mr-1">Quick Demos:</span>
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setIssueUrl(s.url);
                  handleAnalyze(s.url);
                }}
                className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-emerald-400 transition flex items-center gap-1.5"
              >
                <Bug className="h-3 w-3 text-emerald-400" />
                <span className="font-mono text-[11px] font-semibold">{s.repo}#{s.issue_number}</span>
                <span className="text-slate-500 hidden sm:inline">({s.tag})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="max-w-3xl mx-auto p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
            <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold block mb-0.5">Analysis Interrupted</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading Skeleton / Live Progress */}
        {loading && (
          <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 text-center">
            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
              <Cpu className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Running Static & Semantic PreFlight Triage</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Querying GitHub tree &bull; Isolating target function slices &bull; Preparing interactive test-driven sandbox
              </p>
            </div>
            <div className="w-64 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-1/2 rounded-full animate-pulse mx-auto" />
            </div>
          </div>
        )}

        {/* Results Workspace */}
        {result && !loading && (
          <div className="space-y-6 animate-fadeIn">
            {/* Mission Briefing Card */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      {result.repo_full_name} #{result.issue_number}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      Author: @{result.author}
                    </span>
                    {result.labels.map((lbl, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {lbl}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {result.issue_title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={result.issue_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                </div>
              </div>

              {/* Summary Callout */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-sm text-slate-300 leading-relaxed flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-semibold mr-1.5">PreFlight Triage Summary:</strong>
                  {result.summary}
                </div>
              </div>

              {/* Pinpointed Target Files Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <FileCode2 className="h-3.5 w-3.5 text-amber-400" /> Target Slice Files:
                </span>
                {result.target_files.map((file, i) => (
                  <span
                    key={i}
                    className="font-mono px-2.5 py-1 rounded-md bg-slate-800/80 border border-amber-500/30 text-amber-300 font-medium"
                  >
                    {file}
                  </span>
                ))}
              </div>
            </div>

            {/* Interactive Sandbox Execution Toolbar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Live Execution Sandbox</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium">
                      Python 3.14 + Pytest
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Edit the code directly below, then click Run to test in the isolated container sandbox.
                  </p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {patchCode && (
                  <button
                    onClick={handleApplyPatch}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition"
                    title="Load proposed solution code to test GREEN phase"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Apply Suggested Patch</span>
                  </button>
                )}

                <button
                  onClick={handleResetCode}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Reset code back to initial buggy state"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Code</span>
                </button>

                <button
                  onClick={handleExecuteTest}
                  disabled={executing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
                >
                  {executing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Executing Sandbox...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Run Test in Sandbox</span>
                      <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-slate-950/30 rounded border border-slate-950/20 text-slate-900 font-mono">
                        ⌘↵
                      </kbd>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Terminal Output Panel (When executed) */}
            {executionResult && (
              <div ref={terminalRef} className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl animate-fadeIn">
                <div className={`p-4 border-b flex items-center justify-between ${
                  executionResult.status === 'passed'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : executionResult.status === 'failed'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}>
                  <div className="flex items-center space-x-2.5">
                    {executionResult.status === 'passed' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-sm font-mono tracking-tight mr-2">
                        {executionResult.phase}
                      </span>
                      <span className="text-xs text-slate-300 hidden sm:inline">
                        {executionResult.summary_line}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {executionResult.duration_ms}ms
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      exit: {executionResult.exit_code}
                    </span>
                  </div>
                </div>

                <div className="p-4 font-mono text-xs overflow-x-auto text-slate-200 bg-slate-950/95 max-h-72 overflow-y-auto">
                  <div className="text-slate-500 text-[11px] mb-2 select-none">
                    $ {result?.target_filename?.endsWith('.js') ? 'node --test test_repro.test.js' : 'pytest -v --no-header test_repro.py'}
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {executionResult.stdout || executionResult.stderr || "(No output captured)"}
                  </pre>
                </div>
              </div>
            )}

            {/* Artifacts Tabs & Code Editor */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
              {/* Tab Navigation */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 px-4 py-2 bg-slate-950/60">
                <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1">
                  
                  {/* Target Source File (Editable) */}
                  <button
                    onClick={() => setActiveTab('target_module')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                      activeTab === 'target_module'
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <FileCode2 className="h-4 w-4 text-amber-400" />
                    <span>{result?.target_filename || 'target_module.py'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">Editable</span>
                  </button>

                  {/* Reproduction Test File (Editable) */}
                  <button
                    onClick={() => setActiveTab('test_repro')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                      activeTab === 'test_repro'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                    <span>{result?.target_filename?.endsWith('.js') ? 'test_repro.test.js' : 'test_repro.py'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono uppercase">RED</span>
                  </button>

                  {/* Git Diff Viewer */}
                  <button
                    onClick={() => setActiveTab('git_diff')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                      activeTab === 'git_diff'
                        ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <GitCompare className="h-4 w-4 text-purple-400" />
                    <span>Git Diff</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">Diff</span>
                  </button>

                  {/* PREFLIGHT.md */}
                  <button
                    onClick={() => setActiveTab('preflight_md')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                      activeTab === 'preflight_md'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>PREFLIGHT.md</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">Dossier</span>
                  </button>

                  {/* DevContainer */}
                  <button
                    onClick={() => setActiveTab('devcontainer')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                      activeTab === 'devcontainer'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Box className="h-4 w-4" />
                    <span>devcontainer.json</span>
                  </button>

                  {/* TDD Blueprint */}
                  <button
                    onClick={() => setActiveTab('terminal')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                      activeTab === 'terminal'
                        ? 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Terminal className="h-4 w-4" />
                    <span>CLI Workflow</span>
                  </button>
                </div>

                {/* Actions (Copy & Download) */}
                <div className="flex items-center space-x-2 py-1">
                  {activeTab === 'target_module' && (
                    <>
                      <button
                        onClick={() => handleCopy(sourceCode, 'target_module')}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        {copiedKey === 'target_module' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === 'target_module' ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                      <button
                        onClick={() => downloadFile(result?.target_filename || 'target_module.py', sourceCode)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </>
                  )}

                  {activeTab === 'test_repro' && (
                    <>
                      <button
                        onClick={() => handleCopy(testCode, 'test_repro')}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        {copiedKey === 'test_repro' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === 'test_repro' ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                      <button
                        onClick={() => downloadFile(result?.target_filename?.endsWith('.js') ? 'test_repro.test.js' : 'test_repro.py', testCode)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </>
                  )}

                  {activeTab === 'preflight_md' && (
                    <>
                      <button
                        onClick={() => handleCopy(result.preflight_md, 'preflight_md')}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        {copiedKey === 'preflight_md' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === 'preflight_md' ? 'Copied!' : 'Copy Markdown'}</span>
                      </button>
                      <button
                        onClick={() => downloadFile('PREFLIGHT.md', result.preflight_md)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </>
                  )}

                  {activeTab === 'devcontainer' && (
                    <>
                      <button
                        onClick={() => handleCopy(result.devcontainer_json, 'devcontainer')}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        {copiedKey === 'devcontainer' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === 'devcontainer' ? 'Copied!' : 'Copy JSON'}</span>
                      </button>
                      <button
                        onClick={() => downloadFile('devcontainer.json', result.devcontainer_json)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tab Editor Views */}
              <div className="p-4 sm:p-6 bg-slate-950 font-mono text-xs sm:text-sm">
                
                {/* 1. Target Module (Editable Code) */}
                {activeTab === 'target_module' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        <FileCode2 className="h-4 w-4 text-amber-400" />
                        <span className="font-semibold text-amber-300">Target Implementation Slice (Editable)</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Edit code here or click <button onClick={handleApplyPatch} className="text-indigo-400 underline hover:text-indigo-300 font-semibold">Apply Suggested Patch</button>, then run test
                      </span>
                    </div>

                    <div className="relative rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden focus-within:border-emerald-500/50 transition">
                      <textarea
                        value={sourceCode}
                        onChange={(e) => setSourceCode(e.target.value)}
                        rows={18}
                        spellCheck="false"
                        className="w-full bg-transparent p-4 text-emerald-300 font-mono text-xs sm:text-sm focus:outline-none resize-y leading-relaxed selection:bg-emerald-500/30 selection:text-white"
                        placeholder="# Write or edit target Python module code..."
                      />
                    </div>
                  </div>
                )}

                {/* 2. Reproduction Test (Editable Code) */}
                {activeTab === 'test_repro' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />
                        <span className="font-semibold text-rose-300">Reproduction Test Suite (Editable Pytest Script)</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Imports from <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">target_module</code>
                      </span>
                    </div>

                    <div className="relative rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden focus-within:border-rose-500/50 transition">
                      <textarea
                        value={testCode}
                        onChange={(e) => setTestCode(e.target.value)}
                        rows={18}
                        spellCheck="false"
                        className="w-full bg-transparent p-4 text-rose-200 font-mono text-xs sm:text-sm focus:outline-none resize-y leading-relaxed selection:bg-rose-500/30 selection:text-white"
                        placeholder="# Write or edit reproduction pytest tests..."
                      />
                    </div>
                  </div>
                )}

                {/* Git Diff View */}
                {activeTab === 'git_diff' && (
                  <DiffViewer
                    originalCode={sourceCode}
                    patchCode={patchCode}
                    unifiedDiffText={result?.unified_diff}
                    rootCause={result?.root_cause_explanation}
                    remediation={result?.remediation_explanation}
                    targetFilename={result?.target_filename || 'target_module.py'}
                    onApplyPatch={handleApplyPatch}
                  />
                )}

                {/* 4. PREFLIGHT.md */}
                {activeTab === 'preflight_md' && (
                  <div className="space-y-4 font-sans text-sm text-slate-200">
                    <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      {result.preflight_md}
                    </pre>
                  </div>
                )}

                {/* 4. DevContainer */}
                {activeTab === 'devcontainer' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400 text-xs font-sans">
                      <span className="font-semibold text-indigo-300">Target Path: .devcontainer/devcontainer.json</span>
                      <span>Zero Host Machine Pollution</span>
                    </div>
                    <pre className="text-slate-200 leading-relaxed overflow-x-auto whitespace-pre bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      {result.devcontainer_json}
                    </pre>
                  </div>
                )}

                {/* 5. Terminal CLI Blueprint */}
                {activeTab === 'terminal' && (
                  <div className="space-y-4 font-sans">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400 text-xs">
                      <span className="font-semibold text-amber-300">Local Terminal Reproduction Workflow</span>
                      <button
                        onClick={() => handleCopy(result.terminal_commands.join('\n'), 'all_terminal')}
                        className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1"
                      >
                        {copiedKey === 'all_terminal' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>Copy All Commands</span>
                      </button>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      {result.terminal_commands.map((cmd, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition group"
                        >
                          <div className="flex items-center space-x-3 overflow-x-auto mr-3">
                            <span className="text-slate-600 select-none">$</span>
                            <span className={`${cmd.startsWith('#') ? 'text-slate-500 italic' : 'text-emerald-300'}`}>
                              {cmd}
                            </span>
                          </div>
                          {!cmd.startsWith('#') && (
                            <button
                              onClick={() => handleCopy(cmd, `cmd_${i}`)}
                              className="text-slate-500 hover:text-white p-1 rounded transition opacity-60 group-hover:opacity-100 flex-shrink-0"
                              title="Copy command"
                            >
                              {copiedKey === `cmd_${i}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Micro-Architecture Highlights Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>1. RED: Failing Repro</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Confirms bug existence deterministically before writing a single line of production code.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>2. GREEN: Live Patching</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Apply fix directly in the browser editor and run tests to immediately verify the green phase.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  <span>3. REFACTOR: Zero Host Pollution</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Test and submit PR directly inside an isolated DevContainer or GitHub Codespace.
                </p>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 mt-12 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400 font-semibold">PreFlight Sandbox</span>
            <span>&bull; Hackathon Project: AI to Build Developer Tools</span>
          </div>
          <div>
            Built with FastAPI, Google GenAI SDK, React 18, Vite & Tailwind CSS
          </div>
        </div>
      </footer>
    </div>
  );
}
