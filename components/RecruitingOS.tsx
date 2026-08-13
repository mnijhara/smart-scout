import React, { useState } from 'react';
import { Activity, Bell, BriefcaseBusiness, CalendarDays, ClipboardCheck, FileText, Handshake, LayoutDashboard, Menu, MessageSquare, Plus, Search, Settings2, Sparkles, Target, UserCheck, Users, X } from 'lucide-react';

type Job = { title: string; team: string; candidates: number; shortlisted: number; interviews: number; status: string };
const INITIAL_JOBS: Job[] = [
  { title: 'Senior Frontend Developer', team: 'Engineering', candidates: 34, shortlisted: 16, interviews: 6, status: 'Recommended' },
  { title: 'Product Manager', team: 'Product', candidates: 28, shortlisted: 12, interviews: 4, status: 'Recommended' },
  { title: 'DevOps Engineer', team: 'Engineering', candidates: 18, shortlisted: 8, interviews: 6, status: 'Recommended' },
];

export default function RecruitingOS() {
  const [mobile, setMobile] = useState(false);
  const [showNewJob, setShowNewJob] = useState(false);
  const [title, setTitle] = useState('');
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const nav: Array<[string, React.ComponentType<{ className?: string }>, boolean?]> = [
    ['Home', LayoutDashboard], ['Jobs', BriefcaseBusiness], ['Candidates', Users], ['Interviews', CalendarDays], ['Approvals', ClipboardCheck, true], ['Compensation', Target], ['Offers', FileText], ['Engagement', MessageSquare], ['Onboarding', Handshake], ['Analytics', Activity], ['Settings', Settings2],
  ];
  function createJob() {
    const value = title.trim();
    if (!value) return;
    setJobs([{ title: value, team: 'New requisition', candidates: 0, shortlisted: 0, interviews: 0, status: 'Draft' }, ...jobs]);
    setTitle(''); setShowNewJob(false);
  }
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center gap-3 px-2 py-3 mb-6"><div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center"><BriefcaseBusiness className="w-5 h-5" /></div><b className="tracking-tight">SMART SCOUT</b></div>
            <nav className="space-y-1 flex-1">{nav.map(([label, Icon, badge]) => <button key={label} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${label === 'Home' ? 'bg-violet-50 text-violet-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="w-4 h-4" /><span className="flex-1 text-left">{label}</span>{badge && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">2</span>}</button>)}</nav>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><div className="flex items-center gap-2 text-xs font-bold text-violet-700"><Sparkles className="w-4 h-4" /> AI Credits</div><div className="mt-2 text-sm font-extrabold">12,450 <span className="font-normal text-slate-500">/ 20,000</span></div><div className="mt-3 h-1.5 rounded-full bg-white"><div className="h-full w-[62%] rounded-full bg-violet-600" /></div></div>
          </div>
        </aside>
        {mobile && <button aria-label="Close navigation" onClick={() => setMobile(false)} className="fixed inset-0 z-30 bg-slate-900/20 lg:hidden" />}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 h-[72px] border-b border-slate-200 bg-white flex items-center px-4 sm:px-6"><button onClick={() => setMobile(true)} className="lg:hidden mr-3 h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center"><Menu className="w-5 h-5" /></button><div className="text-sm text-slate-500">Recruiting OS <span className="mx-2">/</span><b className="text-slate-800">Home</b></div><div className="ml-auto flex items-center gap-4"><Search className="w-5 h-5 text-slate-400" /><Bell className="w-5 h-5 text-slate-400" /><div className="h-9 w-9 rounded-full bg-violet-50 text-violet-700 flex items-center justify-center text-xs font-bold">MN</div></div></header>
          <main className="max-w-[1560px] mx-auto p-5 sm:p-8">
            <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-violet-600"><Sparkles className="w-4 h-4" /> Recruiting intelligence</div><h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">Hire better. Move faster. Stay in control.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">AI-powered recruiting that brings sourcing, screening, interviews, decisions and offers into one intelligent workflow.</p></div><button onClick={() => window.location.assign('/?os=1&feature=job')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white"><Plus className="w-4 h-4" /> New Job</button></section>
            <section className="mt-7 grid grid-cols-2 lg:grid-cols-5 gap-3">{[['Open Jobs', String(24 + Math.max(0, jobs.length - 3))], ['Active Candidates', '156'], ['Interviews', '32'], ['Offers', '7'], ['Hires', '5']].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-extrabold">{value}</div></div>)}</section>
            <section className="mt-5 grid xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"><div className="p-5 border-b border-slate-100"><h2 className="font-extrabold">Hiring pipeline</h2><p className="mt-1 text-xs text-slate-500">Every requisition, candidate and decision in one view.</p></div><div className="grid md:grid-cols-5 gap-3 p-4">{['Job Intelligence', 'Sourcing', 'Screening', 'Interviews', 'Decision'].map((stage, i) => <div key={stage}><div className="px-1 pb-2 text-xs font-bold text-slate-700">{i + 1}. {stage}</div>{jobs.map(job => <div key={job.title + stage} className="mb-2 rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] font-bold truncate">{job.title}</div><div className="mt-1 text-[10px] text-slate-400">{stage === 'Job Intelligence' ? job.team : stage === 'Sourcing' ? `${job.candidates} candidates` : stage === 'Screening' ? `${job.shortlisted} shortlisted` : stage === 'Interviews' ? `${job.interviews} interviews` : job.status}</div></div>)}</div>)}</div></div>
              <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="p-5 border-b border-slate-100"><h2 className="font-extrabold">Activity feed</h2></div><div className="p-5 space-y-4">{['New candidate sourced', 'Interview completed', 'Offer approved', 'JD optimized'].map((item, i) => <div key={item} className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div><div><div className="text-xs font-bold">{item}</div><div className="text-[10px] text-slate-400">{i + 1}h ago</div></div></div>)}</div></aside>
            </section>
          </main>
        </div>
      </div>
      {showNewJob && <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">Start a new hire</h2><button onClick={() => setShowNewJob(false)}><X className="w-5 h-5" /></button></div><input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createJob()} placeholder="e.g. Head of People" className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /><button onClick={createJob} disabled={!title.trim()} className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Create job</button></div></div>}
    </div>
  );
}
