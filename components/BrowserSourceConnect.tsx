import React, { useState } from 'react';
import { ExternalLink, Globe, KeyRound, Play, X, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [directUrl, setDirectUrl] = useState('');

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

        <div className="p-6">
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

          <label className="mt-5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Role Sourcing Query
          </label>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. VP HR Gurgaon technology fintech"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-500"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs">
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

          {/* Quick Profile URL Import */}
          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between text-left text-xs font-bold text-slate-700"
            >
              <span className="flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-violet-600" />
                Import direct profile URL or session cookie (Optional)
              </span>
              {showAdvanced ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 pt-2 border-t border-slate-200/60">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Direct Profile URL
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={directUrl}
                      onChange={e => setDirectUrl(e.target.value)}
                      placeholder={`https://www.${source === 'linkedin' ? 'linkedin.com/in/username' : 'naukri.com/profile/id'}`}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      onClick={handleImportUrl}
                      disabled={!directUrl.trim() || loading}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      Import
                    </button>
                  </div>
                </div>

                {setCookie && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      {source === 'linkedin' ? 'LinkedIn li_at Session Cookie' : 'Naukri Session Token'}
                    </label>
                    <input
                      type="password"
                      value={cookie}
                      onChange={e => setCookie(e.target.value)}
                      placeholder="Optional: Paste session cookie for direct authenticated scraping"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      Enables direct headless authenticated scraping through your account session.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

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
              disabled={loading || !query.trim()}
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
