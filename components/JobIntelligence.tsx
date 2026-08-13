import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, FileText, Loader2, Sparkles, Target, Wand2 } from 'lucide-react';

type Requirement = { title: string; type: 'must-have' | 'nice-to-have'; reason?: string };
type Analysis = { summary?: string; title?: string; seniority?: string; skills?: string[]; requirements?: Requirement[]; location?: string; experience?: string; responsibilities?: string[]; qualityScore?: number; improvements?: string[] };
type Requisition = { id: string; title: string; jd: string; analysis?: Analysis; status: string; createdAt: string };

const STORAGE_KEY = 'smartscout.requisitions.v1';

function loadJobs(): Requisition[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
function saveJobs(jobs: Requisition[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs)); }

export default function JobIntelligence({ onBack }: { onBack?: () => void }) {
  const [jobs, setJobs] = useState<Requisition[]>([]);
  const [selected, setSelected] = useState<Requisition | null>(null);
  const [title, setTitle] = useState('');
  const [jd, setJd] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => setJobs(loadJobs()), []);

  const canAnalyze = jd.trim().length >= 40;
  const quality = analysis?.qualityScore ?? null;
  const mustHaves = useMemo(() => (analysis?.requirements || []).filter(r => r.type === 'must-have'), [analysis]);
  const niceToHaves = useMemo(() => (analysis?.requirements || []).filter(r => r.type === 'nice-to-have'), [analysis]);

  async function analyze() {
    setError(''); setLoading(true); setSaved(false);
    try {
      const res = await fetch('/api/recruiting/jd/analyze', { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': 'demo-tenant' }, body: JSON.stringify({ text: jd }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to analyze the job description');
      setAnalysis(data);
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
    } finally { setLoading(false); }
  }

  function saveRequisition() {
    if (!title.trim() || !jd.trim()) return;
    const job: Requisition = { id: crypto.randomUUID(), title: title.trim(), jd, analysis: analysis || undefined, status: analysis ? 'Ready for sourcing' : 'Draft', createdAt: new Date().toISOString() };
    const next = [job, ...jobs]; setJobs(next); saveJobs(next); setSelected(job); setSaved(true);
  }

  function startNew() { setSelected(null); setTitle(''); setJd(''); setAnalysis(null); setError(''); setSaved(false); }

  if (selected) return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="h-16 border-b border-slate-200 bg-white flex items-center px-5 sm:px-8 justify-between">
        <button onClick={startNew} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"><ArrowLeft className="w-4 h-4" /> Job Intelligence</button>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{selected.status}</span>
      </header>
      <main className="max-w-6xl mx-auto p-5 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div><div className="text-xs uppercase tracking-[.18em] font-bold text-violet-600">Requisition</div><h1 className="mt-2 text-3xl font-black tracking-tight">{selected.title}</h1><p className="mt-2 text-sm text-slate-500">Created {new Date(selected.createdAt).toLocaleDateString()}</p></div>
          <button onClick={startNew} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white">Create another job</button>
        </div>
        <div className="mt-7 grid lg:grid-cols-[1.5fr_1fr] gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-2 font-extrabold"><FileText className="w-5 h-5 text-violet-600" /> Job description</div><div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{selected.jd}</div></section>
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex justify-between"><div><div className="text-xs font-bold text-slate-500">JD quality</div><div className="mt-1 text-4xl font-black">{selected.analysis?.qualityScore ?? '—'}<span className="text-lg text-slate-400">/100</span></div></div><Target className="w-5 h-5 text-violet-500" /></div><div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-violet-600 rounded-full" style={{ width: `${selected.analysis?.qualityScore || 0}%` }} /></div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">Must-have requirements</h2><div className="mt-4 space-y-3">{(selected.analysis?.requirements || []).filter(r => r.type === 'must-have').map((r,i) => <div key={i} className="flex gap-3 text-sm"><Check className="w-4 h-4 mt-0.5 text-emerald-600" />{r.title}</div>)}{!(selected.analysis?.requirements || []).some(r => r.type === 'must-have') && <div className="text-sm text-slate-400">Not extracted yet.</div>}</div></div>
            <button className="w-full rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700 hover:bg-violet-100">Launch sourcing <ChevronRight className="inline w-4 h-4" /></button>
          </section>
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="h-16 border-b border-slate-200 bg-white flex items-center px-5 sm:px-8"><button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"><ArrowLeft className="w-4 h-4" /> Recruiting OS</button><div className="mx-4 h-5 w-px bg-slate-200" /><div className="text-sm font-extrabold">Job Intelligence</div></header>
      <main className="max-w-6xl mx-auto p-5 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"><div><div className="inline-flex items-center gap-2 text-xs uppercase tracking-[.18em] font-bold text-violet-600"><Sparkles className="w-4 h-4" /> Intelligence layer</div><h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">Turn a role into a hiring blueprint.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Create a requisition, analyze the JD, separate must-haves from nice-to-haves and prepare the role for sourcing.</p></div><div className="text-xs font-semibold text-slate-400">{jobs.length} saved requisition{jobs.length === 1 ? '' : 's'}</div></div>
        <div className="mt-7 grid lg:grid-cols-[1.25fr_.75fr] gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"><div className="p-6 border-b border-slate-100"><label className="text-xs font-bold text-slate-700">Role title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Head of People" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" /></label></div><div className="p-6"><label className="text-xs font-bold text-slate-700">Job description<textarea value={jd} onChange={e=>setJd(e.target.value)} rows={15} placeholder="Paste the job description here..." className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" /></label><div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{jd.trim().length} characters</span><button onClick={analyze} disabled={!canAnalyze || loading} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Analyze with AI</button></div>{error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}</div></section>
          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="font-extrabold">AI analysis</h2>{quality !== null && <span className="text-2xl font-black text-violet-700">{quality}/100</span>}</div>{analysis ? <div className="mt-5 space-y-5"><p className="text-sm leading-6 text-slate-600">{analysis.summary || 'Structured hiring requirements extracted from the role.'}</p><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Must-have</div><div className="mt-2 space-y-2">{mustHaves.map((r,i)=><div key={i} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{r.title}</div>)}</div></div><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Nice-to-have</div><div className="mt-2 space-y-2">{niceToHaves.map((r,i)=><div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">{r.title}</div>)}</div></div>{(analysis.improvements || []).length > 0 && <div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Suggested improvements</div><ul className="mt-2 space-y-2 text-xs leading-5 text-slate-600">{analysis.improvements!.map((x,i)=><li key={i}>• {x}</li>)}</ul></div>}</div> : <div className="mt-8 text-center text-sm text-slate-400">Run AI analysis to create the structured blueprint.</div>}</div>
            <button onClick={saveRequisition} disabled={!title.trim() || !jd.trim() || !analysis} className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-30">{saved ? <Check className="w-4 h-4" /> : null}{saved ? 'Requisition saved' : 'Save requisition & prepare sourcing'}</button>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5"><div className="flex gap-3"><Sparkles className="w-5 h-5 shrink-0 text-violet-600" /><div><div className="text-sm font-extrabold text-violet-900">Next: Sourcing</div><p className="mt-1 text-xs leading-5 text-violet-800/80">The structured requirements will become the criteria for candidate discovery and explainable scoring.</p></div></div></div>
          </aside>
        </div>
        {jobs.length > 0 && <section className="mt-7"><h2 className="font-extrabold text-lg">Recent requisitions</h2><div className="mt-3 grid md:grid-cols-2 xl:grid-cols-3 gap-3">{jobs.map(job=><button key={job.id} onClick={()=>setSelected(job)} className="text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-violet-200 hover:shadow-sm"><div className="text-sm font-extrabold">{job.title}</div><div className="mt-2 text-xs text-slate-500">{job.status}</div><div className="mt-4 text-xs font-semibold text-violet-600">Open requisition <ChevronRight className="inline w-3 h-3" /></div></button>)}</div></section>}
      </main>
    </div>
  );
}
