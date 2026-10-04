import React, { useState, useEffect } from 'react';
import { ExternalLink, Globe, KeyRound, Play, X, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Link as LinkIcon, Download, Puzzle, Sparkles, RefreshCw, Laptop } from 'lucide-react';

export default function BrowserSourceConnect({
  source,
  setSource,
  query,
  setQuery,
  onStart,
  loading,
  onClose,
  cookie = '',
  setCookie,
}: {
  source: 'linkedin' | 'naukri';
  setSource: (source: 'linkedin' | 'naukri') => void;
  query: string;
  setQuery: (query: string) => void;
  onStart: () => void;
  loading: boolean;
  onClose: () => void;
  cookie?: string;
  setCookie?: (cookie: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'extension' | 'search' | 'url'>('extension');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [directUrl, setDirectUrl] = useState('');
  const [hasExtension, setHasExtension] = useState(false);

  // Check if Smart Scout Chrome Extension is active
  useEffect(() => {
    const checkExt = () => {
      const isInstalled = document.documentElement.getAttribute('data-smartscout-extension') === 'true' ||
        Boolean((window as any).__SMARTSCOUT_EXTENSION_INSTALLED__);
      setHasExtension(Boolean(isInstalled));
    };

    checkExt();
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SMARTSCOUT_EXTENSION_READY') {
        setHasExtension(true);
      }
    };
    window.addEventListener('message', handler);
    const interval = setInterval(checkExt, 1500);
    return () => {
      window.removeEventListener('message', handler);
      clearInterval(interval);
    };
  }, []);

  const searchUrl = source === 'linkedin'
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`
    : `https://www.naukri.com/search?keyword=${encodeURIComponent(query)}`;

  const openSource = () => {
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  const handleImportUrl = () => {
    if (directUrl.trim()) {
      setQuery(directUrl.trim());
      onStart();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-600">
              <Globe className="h-4 w-4" />
              Dual-Pipeline Talent Sourcing
            </div>
            <h2 className="mt-1 text-xl font-black">Source from LinkedIn & Naukri</h2>
            <p className="mt-1 text-xs text-slate-500">
              Direct browser automation with verified talent discovery & live profile capture.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="rounded-xl p-2 text-slate-400 hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-6 pt-2">
          <button
            onClick={() => setActiveTab('extension')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black transition ${
              activeTab === 'extension'
                ? 'border-violet-600 text-violet-700 bg-white rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Puzzle className="h-4 w-4 text-violet-600" />
            Chrome Extension
            <span className="rounded-full bg-violet-100 px-1.5 py-0.2 text-[9px] font-black text-violet-800">
              1-Click
            </span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black transition ${
              activeTab === 'search'
                ? 'border-violet-600 text-violet-700 bg-white rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Globe className="h-4 w-4 text-slate-500" />
            Cloud Browser Search
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black transition ${
              activeTab === 'url'
                ? 'border-violet-600 text-violet-700 bg-white rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="h-4 w-4 text-slate-500" />
            Direct Profile URL
          </button>
        </div>

        <div className="p-6">
          {/* Target platform selector */}
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setSource('linkedin')}
              className={`rounded-2xl border p-4 text-left transition ${
                source === 'linkedin'
                  ? 'border-violet-600 bg-violet-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0a66c2] text-xs font-black text-white shadow-sm">
                    in
                  </span>
                  <b>LinkedIn Sourcing</b>
                </div>
                {source === 'linkedin' && <CheckCircle2 className="h-4 w-4 text-violet-600" />}
              </div>
              <div className="mt-2 text-[11px] leading-5 text-slate-500">
                Capture public professional profiles, executive leadership, and verified career evidence.
              </div>
            </button>

            <button
              onClick={() => setSource('naukri')}
              className={`rounded-2xl border p-4 text-left transition ${
                source === 'naukri'
                  ? 'border-violet-600 bg-violet-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#006d77] text-xs font-black text-white shadow-sm">
                    N
                  </span>
                  <b>Naukri Sourcing</b>
                </div>
                {source === 'naukri' && <CheckCircle2 className="h-4 w-4 text-violet-600" />}
              </div>
              <div className="mt-2 text-[11px] leading-5 text-slate-500">
                Target India tech hubs (Gurgaon, Bengaluru, Pune, Mumbai, Hyderabad, Remote).
              </div>
            </button>
          </div>

          {activeTab === 'extension' && (
            <div className="mt-5 space-y-4">
              <div className={`rounded-2xl border p-4 transition ${
                hasExtension ? 'border-emerald-200 bg-emerald-50/70' : 'border-violet-200 bg-violet-50/60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Puzzle className={`h-5 w-5 ${hasExtension ? 'text-emerald-600' : 'text-violet-600'}`} />
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {hasExtension ? 'Smart Scout Chrome Extension Active' : 'Install Smart Scout Chrome Extension'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {hasExtension
                          ? 'Extension connected · Direct 1-click capture enabled on active tabs.'
                          : 'Bypasses captchas and authwalls using your active logged-in browser session.'}
                      </div>
                    </div>
                  </div>
                  {hasExtension ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <a
                      href="/api/recruiting/extension/download"
                      download="smartscout-extension.zip"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-black text-white shadow hover:bg-violet-700 transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download (.zip)
                    </a>
                  )}
                </div>

                {!hasExtension && (
                  <div className="mt-3.5 pt-3 border-t border-violet-100 text-[11px] text-slate-600 space-y-1.5 font-medium">
                    <div className="font-black text-violet-900 text-[11px] uppercase tracking-wider">
                      Quick 30-Second Setup:
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-200 text-[9px] font-black text-violet-800">1</span>
                      <span>Download & unzip <b>smartscout-extension.zip</b></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-200 text-[9px] font-black text-violet-800">2</span>
                      <span>Open <code>chrome://extensions</code> and turn on <b>Developer mode</b></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-200 text-[9px] font-black text-violet-800">3</span>
                      <span>Click <b>Load unpacked</b> and select the unzipped <code>extension</code> folder</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                  How 1-Click Extension Sourcing Works:
                </div>
                <div className="mt-2 text-[11px] leading-relaxed text-slate-600">
                  1. Click <b>"Open Search on {source === 'linkedin' ? 'LinkedIn' : 'Naukri'}"</b> below.
                  <br />
                  2. A floating Smart Scout pill appears on every candidate profile or search page.
                  <br />
                  3. Click <b>"Add to Smart Scout"</b> or <b>"Capture Page"</b> — candidates stream straight into your shortlist with verified credentials.
                </div>
                <button
                  onClick={openSource}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-violet-300" />
                  Open Live Search on {source === 'linkedin' ? 'LinkedIn' : 'Naukri'} →
                </button>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Role Sourcing Query
                </label>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="e.g. VP HR Gurgaon technology fintech"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs">
                <span className="text-slate-600">
                  Open live search query in {source === 'linkedin' ? 'LinkedIn' : 'Naukri'}:
                </span>
                <button
                  onClick={openSource}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-violet-600" />
                  Open in new tab
                </button>
              </div>

              {setCookie && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {source === 'linkedin' ? 'LinkedIn li_at Session Cookie (Optional)' : 'Naukri Session Token (Optional)'}
                  </label>
                  <input
                    type="password"
                    value={cookie}
                    onChange={e => setCookie(e.target.value)}
                    placeholder="Optional: Paste session cookie for direct headless authenticated scraping"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Enables direct headless cloud scraping through your verified account session.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'url' && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Direct Profile URL
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={directUrl}
                    onChange={e => setDirectUrl(e.target.value)}
                    placeholder={`https://www.${source === 'linkedin' ? 'linkedin.com/in/username' : 'naukri.com/profile/id'}`}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    onClick={handleImportUrl}
                    disabled={!directUrl.trim() || loading}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40"
                  >
                    Import
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Directly inspects and parses the candidate dossier from the public profile.
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] text-emerald-800 font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Smart Scout dual-pipeline automatically extracts candidates, dimensions, and evidence trails.
            </span>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={onStart}
              disabled={loading || (!query.trim() && activeTab !== 'extension')}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-40 shadow-sm transition"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {loading ? 'Searching candidates…' : `Start ${source === 'linkedin' ? 'LinkedIn' : 'Naukri'} search`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
