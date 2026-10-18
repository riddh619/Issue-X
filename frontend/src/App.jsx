import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
  Terminal, FileText, Box, Copy, Check, ExternalLink, Play,
  AlertCircle, Sparkles, Key, Github, RefreshCw, ShieldCheck,
  Download, FileCode2, Zap, Bug, Cpu, RotateCcw, Wand2,
  CheckCircle, XCircle, Clock, X, ArrowRight, Layers, Eye, Code2, Braces
} from 'lucide-react';

const StormScene = React.lazy(() => import('./StormScene'));

function BrandLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="brandGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c9aaff" />
          <stop offset="0.5" stopColor="#8399ff" />
          <stop offset="1" stopColor="#b3e1ff" />
        </linearGradient>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#c9aaff" />
          <stop offset="1" stopColor="#8399ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z"
        fill="url(#brandGrad)"
      />
      <circle cx="12" cy="12" r="2.8" fill="url(#coreGlow)" />
      <circle cx="12" cy="12" r="1.2" fill="#ffffff" />
    </svg>
  );
}

export default function App() {
  const [issueUrl, setIssueUrl]             = useState('');
  const [loading, setLoading]               = useState(false);
  const [executing, setExecuting]           = useState(false);
  const [error, setError]                   = useState(null);
  const [result, setResult]                 = useState(null);
  const [sourceCode, setSourceCode]         = useState('');
  const [testCode, setTestCode]             = useState('');
  const [initialSourceCode, setInitialSourceCode] = useState('');
  const [patchCode, setPatchCode]           = useState('');
  const [activeTab, setActiveTab]           = useState('target_module');
  const [executionResult, setExecutionResult] = useState(null);
  const [copiedKey, setCopiedKey]           = useState(null);
  const [samples, setSamples]               = useState([]);
  const [showConfig, setShowConfig]         = useState(false);
  const [geminiKey, setGeminiKey]           = useState(localStorage.getItem('preflight_gemini_key') || '');
  const [githubToken, setGithubToken]       = useState(localStorage.getItem('preflight_gh_token') || '');
  const [backendStatus, setBackendStatus]   = useState('checking');
  const [heroVisible, setHeroVisible]       = useState(false);
  const [cardsVisible, setCardsVisible]     = useState(false);
  const terminalRef = useRef(null);

  /* ── ease-in reveal ── */
  useEffect(() => {
    const t1 = setTimeout(() => setHeroVisible(true), 150);
    const t2 = setTimeout(() => setCardsVisible(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    fetch('/samples')
      .then(r => r.json())
      .then(data => { setSamples(data); setBackendStatus('connected'); })
      .catch(() => {
        setBackendStatus('offline');
        setSamples([
          { id: 'requests-chunked', repo: 'psf/requests', issue_number: 5491, url: 'https://github.com/psf/requests/issues/5491', tag: 'Python / Networking' },
          { id: 'flask-subdomain', repo: 'pallets/flask', issue_number: 4523, url: 'https://github.com/pallets/flask/issues/4523', tag: 'Web / Routing' },
          { id: 'httpx-redirect', repo: 'encode/httpx', issue_number: 1230, url: 'https://github.com/encode/httpx/issues/1230', tag: 'Async / HTTP' },
          { id: 'fastapi-query', repo: 'fastapi/fastapi', issue_number: 3112, url: 'https://github.com/fastapi/fastapi/issues/3112', tag: 'API / Validation' },
        ]);
      });
  }, []);

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && result && !executing) { e.preventDefault(); handleExecuteTest(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [result, executing, testCode, sourceCode]);

  const handleCopy = (text, key) => { navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000); };
  const handleSaveKeys = () => { localStorage.setItem('preflight_gemini_key', geminiKey); localStorage.setItem('preflight_gh_token', githubToken); setShowConfig(false); };
  const downloadFile = (fn, content) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' })); a.download = fn; document.body.appendChild(a); a.click(); document.body.removeChild(a); };

  const handleAnalyze = async (u) => {
    const target = u || issueUrl;
    if (!target.trim()) return;
    setLoading(true); setError(null); setResult(null); setExecutionResult(null);
    try {
      const res = await fetch('/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issue_url: target.trim(), gemini_api_key: geminiKey || undefined, github_token: githubToken || undefined }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Server ${res.status}`); }
      const data = await res.json();
      setResult(data); setSourceCode(data.source_code || ''); setInitialSourceCode(data.source_code || ''); setPatchCode(data.patch_code || ''); setTestCode(data.test_repro || ''); setActiveTab('target_module'); setBackendStatus('connected');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleExecuteTest = async () => {
    if (!result) return; setExecuting(true);
    try {
      const res = await fetch('/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test_code: testCode, source_code: sourceCode, target_filename: result.target_filename || 'target_module.py' }) });
      if (!res.ok) throw new Error(`Execution error (${res.status})`);
      const data = await res.json(); setExecutionResult(data);
      setTimeout(() => { if (terminalRef.current) terminalRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
    } catch (err) { setExecutionResult({ status: 'error', exit_code: 1, stdout: '', stderr: err.message, duration_ms: 0, phase: '⚠️ EXECUTION ERROR', summary_line: err.message }); }
    finally { setExecuting(false); }
  };

  const handleApplyPatch = () => { if (patchCode) setSourceCode(patchCode); };
  const handleResetCode = () => { setSourceCode(initialSourceCode); if (result) setTestCode(result.test_repro); setExecutionResult(null); };
  const passed = executionResult?.status === 'passed';

  /* ── Inline style helpers ── */
  const S = {
    page: { minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'Geist', 'Inter', system-ui, sans-serif", position: 'relative', overflow: 'hidden' },
    dot: { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', zIndex: 0 },
    nav: { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    navInner: { maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logoPill: { width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, rgba(201,170,255,0.18) 0%, rgba(131,153,255,0.08) 100%)', border: '1px solid rgba(201,170,255,0.30)', boxShadow: '0 0 18px rgba(201,170,255,0.18), inset 0 1px 1px rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    heroSection: { position: 'relative', textAlign: 'center', padding: '0 24px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    stormWrap: { position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' },
    heroContent: { position: 'relative', zIndex: 2, maxWidth: 680, transition: 'opacity 0.8s cubic-bezier(.22,1,.36,1), transform 0.8s cubic-bezier(.22,1,.36,1)' },
    pill: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, background: 'rgba(201,170,255,0.12)', border: '1px solid rgba(201,170,255,0.28)', fontSize: 11, fontWeight: 600, color: '#d8bfff', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 20, boxShadow: '0 0 16px rgba(201,170,255,0.18)' },
    h1: { fontSize: 'clamp(42px, 7vw, 72px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05, marginBottom: 22, color: '#fff', textShadow: '0 0 40px rgba(255,255,255,0.25), 0 2px 14px rgba(0,0,0,0.9)' },
    gradientText: { background: 'linear-gradient(135deg, #d8bfff 0%, #9cb0ff 50%, #c4e9ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 0 24px rgba(201,170,255,0.45))' },
    subtitleCard: { background: 'rgba(10, 10, 14, 0.80)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(201,170,255,0.22)', borderRadius: 16, padding: '16px 22px', maxWidth: 640, margin: '0 auto 32px', boxShadow: '0 12px 40px rgba(0,0,0,0.8), 0 0 24px rgba(201,170,255,0.12)' },
    subtitle: { fontSize: 15, color: '#f2f2fa', lineHeight: 1.75, margin: 0, textShadow: '0 0 16px rgba(255,255,255,0.30), 0 1px 4px rgba(0,0,0,0.9)' },
    codeInline: { fontFamily: "'Geist Mono', monospace", fontSize: 13, color: '#ffb3b3', background: 'rgba(255,179,179,0.15)', border: '1px solid rgba(255,179,179,0.30)', padding: '2px 8px', borderRadius: 5, fontWeight: 600, textShadow: '0 0 10px rgba(255,179,179,0.6)' },
    inputWrap: { position: 'relative', display: 'flex', alignItems: 'center', maxWidth: 600, margin: '0 auto', width: '100%', boxShadow: '0 12px 36px rgba(0,0,0,0.7), 0 0 20px rgba(201,170,255,0.08)' },
    input: { flex: 1, paddingLeft: 44, paddingRight: 150, paddingTop: 14, paddingBottom: 14, background: 'rgba(12,12,16,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, color: '#fff', fontFamily: "'Geist', sans-serif", fontSize: 13, outline: 'none', transition: 'all 0.2s', width: '100%' },
    launchBtn: { position: 'absolute', right: 5, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: 'none', background: '#fff', color: '#0a0a0a', transition: 'all 0.2s', boxShadow: '0 0 16px rgba(255,255,255,0.3)' },
    demoPill: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'rgba(15,15,20,0.80)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', color: '#bbb', fontSize: 11, cursor: 'pointer', fontFamily: "'Geist', sans-serif", transition: 'all 0.15s' },
    featureCard: { padding: 24, borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.25s ease', cursor: 'default' },
    featureIcon: (color, bg) => ({ width: 42, height: 42, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 16 }),
    glass: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' },
    badge: (bg, border, color) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: bg, border: `1px solid ${border}`, fontSize: 10, fontWeight: 600, color }),
    footer: { borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(16px)', padding: '16px 24px', position: 'relative', zIndex: 1 },
    ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#aaa', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: "'Geist', sans-serif", transition: 'all 0.15s' },
    tabBtn: (isActive, activeBg, activeBorder, activeColor) => ({
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
      background: isActive ? activeBg : 'transparent',
      border: isActive ? `1px solid ${activeBorder}` : '1px solid transparent',
      color: isActive ? activeColor : '#666',
      fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: "'Geist', sans-serif",
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    }),
  };

  const features = [
    { icon: <Bug size={19} />, color: '#c9aaff', bg: 'rgba(201,170,255,0.10)', title: 'Pinpoint Any Bug', desc: 'AI triage isolates the exact function slice responsible for the issue in any Python repo.' },
    { icon: <Terminal size={19} />, color: '#a8ffb0', bg: 'rgba(168,255,176,0.08)', title: 'Live Sandbox', desc: 'Edit source & tests in-browser. Run Pytest live in an isolated container — zero local setup.' },
    { icon: <Wand2 size={19} />, color: '#fdffbc', bg: 'rgba(253,255,188,0.08)', title: 'AI Patch Suggestions', desc: 'Get an AI-generated fix. Apply with one click and verify the fix turns tests GREEN.' },
    { icon: <Box size={19} />, color: '#b3e1ff', bg: 'rgba(179,225,255,0.08)', title: 'DevContainer Ready', desc: 'Ships a .devcontainer.json — open in GitHub Codespaces or VS Code instantly. Zero pollution.' },
  ];

  const tabs = [
    { key: 'target_module', label: 'target_module.py', icon: <FileCode2 size={11} />, bg: 'rgba(253,255,188,0.08)', border: 'rgba(253,255,188,0.18)', color: '#fdffbc', badge: 'Editable' },
    { key: 'test_repro',    label: 'test_repro.py',    icon: <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffb3b3', display: 'inline-block' }} />, bg: 'rgba(255,179,179,0.08)', border: 'rgba(255,179,179,0.18)', color: '#ffb3b3', badge: 'RED' },
    { key: 'preflight_md',  label: 'PREFLIGHT.md',     icon: <FileText size={11} />, bg: 'rgba(168,255,176,0.08)', border: 'rgba(168,255,176,0.18)', color: '#a8ffb0', badge: 'Dossier' },
    { key: 'devcontainer',  label: 'devcontainer.json', icon: <Braces size={11} />, bg: 'rgba(131,153,255,0.08)', border: 'rgba(131,153,255,0.18)', color: '#8399ff' },
    { key: 'terminal',      label: 'CLI Workflow',      icon: <Terminal size={11} />, bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)', color: '#ccc' },
  ];

  return (
    <div style={S.page}>
      <div style={S.dot} />

      {/* ── NAV ── */}
      <header style={S.nav}>
        <div style={S.navInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={S.logoPill}>
              <BrandLogo size={19} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: '#fff' }}>PreFlight Sandbox</span>
            <span style={S.badge('rgba(201,170,255,0.10)', 'rgba(201,170,255,0.22)', '#c9aaff')}>DevTool</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 13px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#aaa',
                fontSize: 11,
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(201,170,255,0.3)'; e.currentTarget.style.background = 'rgba(201,170,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <Github size={13} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO with STORM ── */}
      <section style={S.heroSection}>
        {/* Three.js Storm */}
        <div style={S.stormWrap}>
          <Suspense fallback={null}>
            <StormScene />
          </Suspense>
          {/* Subtle center vignette to guarantee 100% text legibility */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(10,10,10,0.65) 0%, rgba(10,10,10,0.25) 50%, #0a0a0a 75%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(transparent, #0a0a0a)', pointerEvents: 'none' }} />
        </div>

        {/* Hero Content — ease-in animation */}
        <div style={{ ...S.heroContent, opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(30px)' }}>
          <div style={S.pill}>
            <Sparkles size={10} />
            <span>AI Execution Layer · Live Code Testing</span>
          </div>

          <h1 style={S.h1}>
            Crush the{' '}
            <span style={S.gradientText}>First-Mile Wall</span>
            <br />in Open Source
          </h1>

          {/* Subtitle Card with glassmorphic backing & glowing text */}
          <div style={S.subtitleCard}>
            <p style={S.subtitle}>
              Paste any GitHub issue URL. PreFlight pinpoints the defect, loads editable target code with a failing{' '}
              <code style={S.codeInline}>test_repro.py</code>{' '}
              (<span style={{ color: '#ff9999', fontWeight: 700, textShadow: '0 0 10px rgba(255,120,120,0.8)' }}>RED phase</span>), lets you patch the code directly, and run tests live to confirm{' '}
              <span style={{ color: '#a8ffb0', fontWeight: 800, textShadow: '0 0 14px rgba(168, 255, 176, 0.9), 0 0 28px rgba(168, 255, 176, 0.5)' }}>GREEN!</span>
            </p>
          </div>

          <form onSubmit={e => { e.preventDefault(); handleAnalyze(); }} style={S.inputWrap}>
            <div style={{ position: 'absolute', left: 15, color: '#888', pointerEvents: 'none', display: 'flex' }}><Github size={16} /></div>
            <input
              type="url" required value={issueUrl}
              onChange={e => setIssueUrl(e.target.value)}
              placeholder="https://github.com/owner/repository/issues/123"
              style={S.input}
              onFocus={e => { e.target.style.borderColor = 'rgba(201,170,255,0.40)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,170,255,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.14)'; e.target.style.boxShadow = 'none'; }}
            />
            <button type="submit" disabled={loading || !issueUrl.trim()} style={{ ...S.launchBtn, opacity: loading || !issueUrl.trim() ? 0.4 : 1 }}>
              {loading ? <><RefreshCw size={12} className="animate-spin" />Analyzing...</> : <><Play size={12} fill="currentColor" />Launch Sandbox</>}
            </button>
          </form>

          {samples.length > 0 && (
            <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>Quick demos:</span>
              {samples.map(s => (
                <button key={s.id} onClick={() => { setIssueUrl(s.url); handleAnalyze(s.url); }} style={S.demoPill}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(201,170,255,0.35)'; e.currentTarget.style.background = 'rgba(201,170,255,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.background = 'rgba(15,15,20,0.80)'; }}
                >
                  <Bug size={10} color="#c9aaff" /><span style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: '#eee' }}>{s.repo}#{s.issue_number}</span><span style={{ color: '#888' }}>({s.tag})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURES ── */}
      {!result && !loading && !error && (
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 80px', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14,
            transition: 'opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1)',
            opacity: cardsVisible ? 1 : 0, transform: cardsVisible ? 'translateY(0)' : 'translateY(24px)',
          }}>
            {features.map((f, i) => (
              <div key={i} style={{ ...S.featureCard, transitionDelay: `${i * 80}ms` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,170,255,0.18)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={S.featureIcon(f.color, f.bg)}>{f.icon}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: '#777', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px', position: 'relative', zIndex: 1 }}>

        {error && (
          <div className="animate-fadeIn" style={{ maxWidth: 680, margin: '0 auto 24px', padding: '13px 16px', borderRadius: 12, background: 'rgba(255,179,179,0.06)', border: '1px solid rgba(255,179,179,0.16)', display: 'flex', gap: 10, color: '#ffb3b3' }}>
            <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <div><strong style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Analysis Failed</strong><span style={{ fontSize: 11 }}>{error}</span></div>
          </div>
        )}

        {loading && (
          <div className="animate-fadeIn" style={{ ...S.glass, maxWidth: 520, margin: '0 auto 32px', padding: '36px 28px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(201,170,255,0.08)', border: '1px solid rgba(201,170,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }} className="animate-glow">
              <Cpu size={22} color="#c9aaff" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Running PreFlight Triage</h3>
            <p style={{ fontSize: 11, color: '#666', marginBottom: 20 }}>Querying GitHub · Isolating target slices · Preparing sandbox</p>
            <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '60%', background: 'linear-gradient(90deg, #c9aaff, #8399ff)', borderRadius: 1, animation: 'shimmer 2s linear infinite', backgroundSize: '200% auto' }} />
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Issue Card */}
            <div style={{ ...S.glass, padding: '20px 22px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    <span style={S.badge('rgba(201,170,255,0.10)', 'rgba(201,170,255,0.20)', '#c9aaff')}>{result.repo_full_name} #{result.issue_number}</span>
                    <span style={S.badge('rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)', '#888')}>@{result.author}</span>
                    {result.labels.map((l, i) => <span key={i} style={S.badge('rgba(131,153,255,0.08)', 'rgba(131,153,255,0.18)', '#8399ff')}>{l}</span>)}
                  </div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{result.issue_title}</h2>
                </div>
                <a href={result.issue_url} target="_blank" rel="noreferrer" style={{ ...S.ghostBtn, textDecoration: 'none', flexShrink: 0 }}>View on GitHub <ExternalLink size={10} /></a>
              </div>
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(168,255,176,0.04)', border: '1px solid rgba(168,255,176,0.10)', borderRadius: 10, display: 'flex', gap: 10 }}>
                <ShieldCheck size={14} color="#a8ffb0" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.65 }}><strong style={{ color: '#ddd' }}>Triage: </strong>{result.summary}</div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}><FileCode2 size={10} color="#fdffbc" />Target:</span>
                {result.target_files.map((f, i) => <span key={i} style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'rgba(253,255,188,0.06)', border: '1px solid rgba(253,255,188,0.15)', color: '#fdffbc' }}>{f}</span>)}
              </div>
            </div>

            {/* Toolbar */}
            <div style={{ ...S.glass, padding: '14px 18px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(168,255,176,0.06)', border: '1px solid rgba(168,255,176,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Terminal size={16} color="#a8ffb0" /></div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>Live Sandbox</span>
                    <span style={S.badge('rgba(168,255,176,0.08)', 'rgba(168,255,176,0.16)', '#a8ffb0')}>Python 3.14 · Pytest</span>
                  </div>
                  <p style={{ fontSize: 10, color: '#555', margin: 0 }}>Edit code below, then click Run.</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {patchCode && <button onClick={handleApplyPatch} style={{ ...S.ghostBtn, color: '#8399ff' }}><Wand2 size={11} />Apply Patch</button>}
                <button onClick={handleResetCode} style={S.ghostBtn}><RotateCcw size={11} />Reset</button>
                <button onClick={handleExecuteTest} disabled={executing} style={{ ...S.launchBtn, position: 'relative', right: 'auto', opacity: executing ? 0.5 : 1 }}>
                  {executing ? <><RefreshCw size={12} className="animate-spin" />Running...</> : <><Play size={12} fill="currentColor" />Run Test<kbd style={{ marginLeft: 6, fontSize: 9, opacity: 0.5 }}>⌘↵</kbd></>}
                </button>
              </div>
            </div>

            {/* Terminal Output */}
            {executionResult && (
              <div ref={terminalRef} className="animate-fadeIn" style={{ borderRadius: 18, overflow: 'hidden', border: `1px solid ${passed ? 'rgba(168,255,176,0.15)' : 'rgba(255,179,179,0.15)'}`, background: '#080808' }}>
                <div style={{ padding: '11px 16px', borderBottom: `1px solid ${passed ? 'rgba(168,255,176,0.10)' : 'rgba(255,179,179,0.10)'}`, background: passed ? 'rgba(168,255,176,0.04)' : 'rgba(255,179,179,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {passed ? <CheckCircle size={14} color="#a8ffb0" /> : <XCircle size={14} color="#ffb3b3" />}
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, fontWeight: 700, color: passed ? '#a8ffb0' : '#ffb3b3' }}>{executionResult.phase}</span>
                    <span style={{ fontSize: 10, color: '#666' }}>{executionResult.summary_line}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#555', fontFamily: "'Geist Mono', monospace" }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{executionResult.duration_ms}ms</span>
                    <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>exit:{executionResult.exit_code}</span>
                  </div>
                </div>
                <div style={{ padding: 14, fontFamily: "'Geist Mono', monospace", fontSize: 11, lineHeight: 1.7, maxHeight: 260, overflowY: 'auto', color: '#ccc' }}>
                  <div style={{ color: '#444', fontSize: 10, marginBottom: 6 }}>$ pytest -v --no-header test_repro.py</div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{executionResult.stdout || executionResult.stderr || '(No output)'}</pre>
                </div>
              </div>
            )}

            {/* Code Editor */}
            <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: '#080808' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '5px 10px', background: 'rgba(255,255,255,0.015)', flexWrap: 'wrap', gap: 4 }}>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)} style={S.tabBtn(activeTab === t.key, t.bg, t.border, t.color)}>
                      {t.icon}<span>{t.label}</span>{t.badge && <span style={{ fontSize: 8, opacity: 0.7 }}>{t.badge}</span>}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['target_module', 'test_repro', 'preflight_md', 'devcontainer'].includes(activeTab) && (
                    <>
                      <button onClick={() => handleCopy(activeTab === 'target_module' ? sourceCode : activeTab === 'test_repro' ? testCode : activeTab === 'preflight_md' ? result.preflight_md : result.devcontainer_json, activeTab)} style={S.ghostBtn}>
                        {copiedKey === activeTab ? <Check size={10} color="#a8ffb0" /> : <Copy size={10} />}<span>{copiedKey === activeTab ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <button onClick={() => downloadFile(activeTab === 'target_module' ? 'target_module.py' : activeTab === 'test_repro' ? 'test_repro.py' : activeTab === 'preflight_md' ? 'PREFLIGHT.md' : 'devcontainer.json', activeTab === 'target_module' ? sourceCode : activeTab === 'test_repro' ? testCode : activeTab === 'preflight_md' ? result.preflight_md : result.devcontainer_json)} style={S.ghostBtn}>
                        <Download size={10} /><span>Download</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ minHeight: 300 }}>
                {activeTab === 'target_module' && (
                  <div>
                    <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#fdffbc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><FileCode2 size={10} />Target Slice (Editable)</span>
                      <button onClick={handleApplyPatch} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#8399ff', textDecoration: 'underline', fontFamily: "'Geist', sans-serif" }}>Apply Patch</button>
                    </div>
                    <textarea value={sourceCode} onChange={e => setSourceCode(e.target.value)} rows={22} spellCheck="false"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Geist Mono', monospace", fontSize: 11.5, lineHeight: 1.7, color: '#a8ffd0', resize: 'vertical', padding: 14 }}
                      placeholder="# Python module code..." />
                  </div>
                )}
                {activeTab === 'test_repro' && (
                  <div>
                    <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: '#ffb3b3', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffb3b3', display: 'inline-block' }} />Test Suite (Editable)</span>
                    </div>
                    <textarea value={testCode} onChange={e => setTestCode(e.target.value)} rows={22} spellCheck="false"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Geist Mono', monospace", fontSize: 11.5, lineHeight: 1.7, color: '#ffc8c8', resize: 'vertical', padding: 14 }}
                      placeholder="# Pytest tests..." />
                  </div>
                )}
                {activeTab === 'preflight_md' && (
                  <div style={{ padding: 18 }}><pre style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11.5, color: '#aaa', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{result.preflight_md}</pre></div>
                )}
                {activeTab === 'devcontainer' && (
                  <div style={{ padding: 18 }}><pre style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11.5, color: '#aaa', lineHeight: 1.7, margin: 0, whiteSpace: 'pre' }}>{result.devcontainer_json}</pre></div>
                )}
                {activeTab === 'terminal' && (
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fdffbc' }}>Terminal Workflow</span>
                      <button onClick={() => handleCopy(result.terminal_commands.join('\n'), 'all_terminal')} style={S.ghostBtn}>
                        {copiedKey === 'all_terminal' ? <Check size={10} color="#a8ffb0" /> : <Copy size={10} />}<span>Copy All</span>
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {result.terminal_commands.map((cmd, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflow: 'hidden', flex: 1 }}>
                            <span style={{ color: '#444', fontFamily: "'Geist Mono', monospace", fontSize: 10 }}>$</span>
                            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: cmd.startsWith('#') ? '#555' : '#a8ffb0', fontStyle: cmd.startsWith('#') ? 'italic' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cmd}</span>
                          </div>
                          {!cmd.startsWith('#') && <button onClick={() => handleCopy(cmd, `cmd_${i}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 3, flexShrink: 0 }}>{copiedKey === `cmd_${i}` ? <Check size={11} color="#a8ffb0" /> : <Copy size={11} />}</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TDD Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginTop: 4 }}>
              {[
                { step: '01', title: 'RED — Failing Repro', color: '#ffb3b3', desc: 'Confirms bug existence before writing any production code.' },
                { step: '02', title: 'GREEN — Live Patching', color: '#a8ffb0', desc: 'Apply fix in-browser and run tests to verify the green phase.' },
                { step: '03', title: 'REFACTOR — Clean Ship', color: '#8399ff', desc: 'Submit PR inside an isolated DevContainer. Zero host pollution.' },
              ].map(c => (
                <div key={c.step} style={{ ...S.glass, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 26, fontWeight: 800, color: c.color, opacity: 0.06, fontFamily: "'Geist Mono', monospace" }}>{c.step}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.title}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#666', lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={S.footer}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, rgba(201,170,255,0.18) 0%, rgba(131,153,255,0.08) 100%)', border: '1px solid rgba(201,170,255,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BrandLogo size={12} /></div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#999' }}>PreFlight Sandbox</span>
            <span style={{ fontSize: 11, color: '#555' }}>· Hackathon Project</span>
          </div>
          <span style={{ fontSize: 10, color: '#444' }}>FastAPI · Google GenAI SDK · React 18 · Three.js · Vite</span>
        </div>
      </footer>
    </div>
  );
}
