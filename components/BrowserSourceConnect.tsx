import React from 'react';
import { ExternalLink, Globe, KeyRound, Play, X } from 'lucide-react';

export default function BrowserSourceConnect({
  source,
  setSource,
  query,
  setQuery,
  onStart,
  loading,
  onClose,
}: {
  source: 'linkedin' | 'naukri';
  setSource: (source: 'linkedin' | 'naukri') => void;
  query: string;
  setQuery: (query: string) => void;
  onStart: () => void;
  loading: boolean;
  onClose: () => void;
}) {
  const url = source === 'linkedin'
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`
    : `https://www.naukri.com/search?keyword=${encodeURIComponent(query)}`;

  const openSource = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
    <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-600"><Globe className="h-4 w-4"/>Browser sourcing</div>
          <h2 className="mt-1 text-xl font-black">Connect a sourcing site</h2>
          <p className="mt-1 text-xs text-slate-500">Smart Scout will use a normal browser session. Sign in normally if the site asks.</p>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"><X className="h-5 w-5"/></button>
      </div>
      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={()=>setSource('linkedin')} className={`rounded-2xl border p-4 text-left ${source==='linkedin'?'border-violet-400 bg-violet-50':'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0a66c2] text-xs font-black text-white">in</span><b>LinkedIn</b></div>
            <div className="mt-2 text-[11px] leading-5 text-slate-500">Open the search page, sign in if needed, then return here.</div>
          </button>
          <button onClick={()=>setSource('naukri')} className={`rounded-2xl border p-4 text-left ${source==='naukri'?'border-violet-400 bg-violet-50':'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#006d77] text-xs font-black text-white">N</span><b>Naukri</b></div>
            <div className="mt-2 text-[11px] leading-5 text-slate-500">Open the search page, sign in if needed, then return here.</div>
          </button>
        </div>
        <label className="mt-5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Search query</label>
        <input value={query} onChange={e=>setQuery(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <div className="font-black text-slate-800">Step 1</div>
          <div className="mt-1">Open {source === 'linkedin' ? 'LinkedIn' : 'Naukri'} in a new browser tab and complete any normal sign-in or human verification.</div>
          <button onClick={openSource} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black"><ExternalLink className="h-4 w-4"/>Open {source === 'linkedin' ? 'LinkedIn' : 'Naukri'}</button>
        </div>
        <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs text-violet-900">
          <div className="font-black">Step 2</div>
          <div className="mt-1">Return here and start the browser search. Smart Scout will use its persistent browser session and capture only public profile data and evidence it can access.</div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-3 text-xs font-black text-slate-600">Cancel</button>
          <button onClick={onStart} disabled={loading||!query.trim()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-black text-white disabled:opacity-40"><Play className="h-4 w-4"/>{loading?'Searching…':'Start browser search'}</button>
        </div>
      </div>
    </div>
  </div>;
}
