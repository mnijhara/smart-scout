import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronRight, FileText, KeyRound, Mic2, Play, Search, ShieldCheck, Sparkles, Users, WandSparkles } from 'lucide-react';

const stages = [
  ['Intent', 'Hiring need understood'],
  ['JD', 'Role blueprint generated'],
  ['Source', 'Candidates discovered'],
  ['Screen', 'Evidence scored'],
  ['Interview', 'AI interview completed'],
  ['Decision', 'Recommendation ready'],
  ['Offer', 'Offer prepared'],
];

const candidates = [
  { name: 'Rhea Malhotra', role: 'CHRO / VP People · Fintech', score: 94, reason: 'Scaled HR 900 → 2,400; led org redesign and CEO-sponsored transformation.' },
  { name: 'Arjun Mehta', role: 'SVP People · SaaS', score: 91, reason: 'Built global talent systems across a 1,800-person SaaS business.' },
  { name: 'Nisha Kapoor', role: 'HR Director · Consumer Tech', score: 86, reason: 'Strong HRBP and culture background with growth-stage evidence.' },
];

export default function LandingPageV2({ onUseOwn }: { onUseOwn: () => void }) {
  const [demoOpen, setDemoOpen] = useState(false);
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!demoOpen || paused || stage >= stages.length - 1) return;
    const timer = window.setTimeout(() => setStage(value => value + 1), 1800);
    return () => window.clearTimeout(timer);
  }, [demoOpen, paused, stage]);

  const openDemo = () => { setStage(0); setPaused(false); setDemoOpen(true); };

  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
          <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white"><Sparkles className="h-4 w-4" /></span><span className="text-sm font-black tracking-tight">SMART SCOUT</span></div>
          <nav className="ml-auto hidden items-center gap-6 text-xs font-bold text-slate-500 md:flex"><a href="#product">Product</a><a href="#control">Why Smart Scout</a><a href="#trust">Trust</a></nav>
          <button onClick={onUseOwn} className="ml-5 rounded-lg bg-slate-950 px-3.5 py-2 text-[11px] font-black text-white">Start hiring</button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
          <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,.14),transparent_62%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-10 lg:pb-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-violet-700"><WandSparkles className="h-3.5 w-3.5" /> AI hiring operating system</div>
              <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl lg:text-[72px]">From hiring intent<br /><span className="text-violet-600">to the right hire.</span></h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">Give Smart Scout a hiring need. It builds the role, finds talent, screens evidence, interviews the strongest candidates and prepares the decision — with you in control.</p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row"><button onClick={openDemo} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-violet-200"><Play className="h-3.5 w-3.5 fill-current" /> See it work</button><button onClick={onUseOwn} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black">Bring a real hiring need <ArrowRight className="h-3.5 w-3.5" /></button></div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">Live hiring run</div><div className="mt-1 text-sm font-black">VP HR · Gurgaon</div></div><span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> WORKING</span></div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2"><Metric n="186" l="sourced" /><Metric n="42" l="high fit" /><Metric n="12" l="interviewed" /><Metric n="3" l="recommended" /></div>
              <div className="mt-3 space-y-2">{candidates.slice(0, 2).map(candidate => <CandidateRow key={candidate.name} candidate={candidate} />)}</div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-violet-600" /> Every recommendation includes evidence and reasoning.</div>
            </div>
          </div>
        </section>

        <section id="trust" className="border-b border-slate-200/70 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6"><div className="grid gap-3 sm:grid-cols-3">
            <Trust icon={<KeyRound />} title="Bring your own AI" text="Use Gemini, OpenAI or Anthropic with your own key. Your AI usage stays on your provider account." />
            <Trust icon={<ShieldCheck />} title="Transparent by design" text="See the work, evidence, sources and reasoning behind recommendations instead of a black-box score." />
            <Trust icon={<Check />} title="Human in control" text="AI does the work. You approve the important decisions before the workflow moves forward." />
          </div></div>
        </section>

        <section id="product" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-600">The product</div><h2 className="mt-1.5 text-3xl font-black tracking-tight sm:text-4xl">One hiring context. Every stage connected.</h2></div><button onClick={openDemo} className="inline-flex items-center gap-1.5 text-xs font-black text-violet-600">Run the interactive demo <ChevronRight className="h-3.5 w-3.5" /></button></div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/70 p-2">{stages.map(([name], i) => <button key={name} onClick={() => { setStage(i); setDemoOpen(true); }} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-wider ${i === stage ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white'}`}><span>{String(i + 1).padStart(2, '0')}</span>{name}</button>)}</div>
            <div className="grid gap-0 lg:grid-cols-[1.1fr_.9fr]">
              <div className="p-5 sm:p-7"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><StageIcon index={stage} /></span><div><div className="text-[9px] font-black uppercase tracking-widest text-violet-600">Stage {stage + 1} · {stages[stage][0]}</div><h3 className="mt-0.5 text-lg font-black">{stages[stage][1]}</h3></div></div><div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Hiring request</div><div className="mt-2 text-sm font-semibold leading-6 text-slate-700">“I need a VP HR for a 1,500-person technology company in Gurgaon. Build the people function, lead HR transformation and partner with the CEO.”</div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Status label="Role" value="Approved" /><Status label="Evidence" value="42 signals" /><Status label="Interviews" value="12 complete" /><Status label="Decision" value="3 finalists" /></div></div>
              <div className="border-t border-slate-100 bg-slate-50/60 p-5 lg:border-l lg:border-t-0 sm:p-7"><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Candidate intelligence</div><div className="mt-3 space-y-2">{candidates.map(candidate => <CandidateRow key={candidate.name} candidate={candidate} />)}</div></div>
            </div>
          </div>
        </section>

        <section id="control" className="border-y border-slate-200/70 bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-12"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Why Smart Scout</div><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">AI does the work.<br />You see the work.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">No mystery scores. No forced AI spend. No silent hiring decisions. Smart Scout keeps the hiring context connected and makes the important evidence visible.</p><button onClick={onUseOwn} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-950">Start with a real role <ArrowRight className="h-3.5 w-3.5" /></button></div><div className="grid gap-2 sm:grid-cols-2"><DarkCard title="Your AI" text="Bring your own provider and API key." /><DarkCard title="Your evidence" text="Candidate signals, source attribution and interview evidence." /><DarkCard title="Your approvals" text="JD, decision, compensation and offer gates stay human-controlled." /><DarkCard title="Your cost visibility" text="AI usage remains with your chosen provider instead of disappearing into a markup." /></div></div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-5 sm:flex-row sm:items-center"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-700">Ready when you are</div><div className="mt-1 text-xl font-black tracking-tight">Bring the hiring need. Smart Scout takes it from there.</div></div><button onClick={onUseOwn} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-black text-white">Start hiring <ArrowRight className="h-3.5 w-3.5" /></button></div></section>
      </main>

      {demoOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md" onClick={() => setDemoOpen(false)}><div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">Smart Scout · Interactive demo</div><div className="text-xs font-black">{paused ? 'Paused · inspect the workflow' : 'Auto-playing · 1.8s per stage'}</div></div><button onClick={() => setDemoOpen(false)} className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50">Close</button></div><div className="grid lg:grid-cols-[190px_1fr]"><aside className="border-b border-slate-100 p-3 lg:border-b-0 lg:border-r">{stages.map(([name], i) => <button key={name} onClick={() => setStage(i)} className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] font-black ${i === stage ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><span>{String(i + 1).padStart(2, '0')}</span>{name}<ChevronRight className="ml-auto h-3 w-3" /></button>)}</aside><div className="p-5 sm:p-7"><div className="grid gap-4 md:grid-cols-[1fr_260px]"><div><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><StageIcon index={stage} /></span><div><div className="text-[9px] font-black uppercase tracking-widest text-violet-600">Stage {stage + 1} / {stages.length}</div><h3 className="text-xl font-black">{stages[stage][1]}</h3></div></div><div className="mt-5 rounded-xl border border-slate-200 p-4"><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Smart Scout activity</div><div className="mt-3 space-y-2">{['Role context loaded','Evidence mapped to success profile','Candidate signals ranked','Human approval checkpoint ready'].slice(0, Math.min(4, stage + 1)).map((item, i) => <div key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700"><Check className="h-3 w-3" /></span>{item}<span className="ml-auto text-[9px] text-slate-400">{String(9 + i).padStart(2, '0')}:{31 + i * 4}</span></div>)}</div></div><div className="rounded-xl bg-slate-950 p-4 text-white"><div className="text-[9px] font-black uppercase tracking-widest text-violet-300">Current signal</div><div className="mt-3 text-4xl font-black">{94 - stage * 2}%</div><div className="mt-1 text-[10px] text-slate-400">workflow confidence</div><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(34, 94 - stage * 7)}%` }} /></div></div></div><div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4"><button disabled={stage === 0} onClick={() => setStage(v => Math.max(0, v - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black disabled:opacity-30">Back</button>{stage < stages.length - 1 ? <button onClick={() => setStage(v => v + 1)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-[10px] font-black text-white">Next stage <ChevronRight className="h-3 w-3" /></button> : <button onClick={onUseOwn} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-[10px] font-black text-white">Run a real role <ArrowRight className="h-3 w-3" /></button>}</div></div></div></div></div>}
    </div>
  );
}

function Metric({ n, l }: { n: string; l: string }) { return <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-lg font-black tracking-tight">{n}</div><div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{l}</div></div>; }
function CandidateRow({ candidate }: { candidate: typeof candidates[number] }) { return <div className="rounded-xl border border-slate-100 bg-white p-3"><div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-[9px] font-black text-white">{candidate.name.split(' ').map(x => x[0]).join('')}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><div className="text-[11px] font-black">{candidate.name}</div><div className="truncate text-[9px] text-slate-400">{candidate.role}</div></div><span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{candidate.score}%</span></div><div className="mt-2 text-[9px] leading-4 text-slate-500">{candidate.reason}</div></div></div></div>; }
function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">{React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4' })}</div><div className="mt-3 text-xs font-black">{title}</div><p className="mt-1 text-[10px] leading-4 text-slate-500">{text}</p></div>; }
function DarkCard({ title, text }: { title: string; text: string }) { return <div className="rounded-xl border border-white/10 bg-white/[.05] p-4"><div className="text-xs font-black">{title}</div><div className="mt-1.5 text-[10px] leading-4 text-slate-400">{text}</div></div>; }
function Status({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-2.5"><div className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-[10px] font-black text-slate-700">{value}</div></div>; }
function StageIcon({ index }: { index: number }) { const icons = [WandSparkles, FileText, Search, Users, Mic2, ShieldCheck, SendIcon]; const I = icons[index] || WandSparkles; return <I className="h-4 w-4" />; }
function SendIcon(props: React.ComponentProps<'svg'>) { return <ArrowRight {...props} />; }
