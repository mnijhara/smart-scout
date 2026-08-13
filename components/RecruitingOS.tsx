import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Handshake,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

type Stage = {
  id: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
};

const STAGES: Stage[] = [
  { id: 'job', label: 'Job Intelligence', count: 8, icon: FileText, tone: 'violet' },
  { id: 'source', label: 'Sourcing', count: 34, icon: Search, tone: 'blue' },
  { id: 'screen', label: 'Screening', count: 56, icon: UserCheck, tone: 'amber' },
  { id: 'interview', label: 'Interviews', count: 16, icon: CalendarDays, tone: 'violet' },
  { id: 'decision', label: 'Decision', count: 7, icon: ClipboardCheck, tone: 'emerald' },
];

const JOBS = [
  { title: 'Senior Frontend Developer', team: 'Engineering', source: '8', candidates: '34', shortlisted: '16', interviews: '6', status: 'Recommended' },
  { title: 'Product Manager', team: 'Product', source: '4', candidates: '28', shortlisted: '12', interviews: '4', status: 'Recommended' },
  { title: 'DevOps Engineer', team: 'Engineering', source: '6', candidates: '18', shortlisted: '8', interviews: '6', status: 'Recommended' },
];

const ACTIVITIES = [
  { title: 'New candidate sourced', detail: 'Alex Johnson · Product Manager', time: '2m ago', icon: Users, tone: 'blue' },
  { title: 'Interview completed', detail: 'Sarah Wilson · Frontend Developer', time: '15m ago', icon: MessageSquare, tone: 'violet' },
  { title: 'Offer approved', detail: 'Mike Chen · DevOps Engineer', time: '1h ago', icon: CheckCircle2, tone: 'emerald' },
  { title: 'JD optimized', detail: 'Marketing Manager', time: '2h ago', icon: FileText, tone: 'violet' },
  { title: 'Candidate accepted offer', detail: 'Priya Patel · UX Designer', time: '3h ago', icon: Handshake, tone: 'emerald' },
];

const toneMap: Record<string, { bg: string; text: string; border: string; soft: string }> = {
  violet: { bg: 'bg-violet-600', text: 'text-violet-600', border: 'border-violet-100', soft: 'bg-violet-50' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-100', soft: 'bg-blue-50' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-100', soft: 'bg-amber-50' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-100', soft: 'bg-emerald-50' },
};

function IconTile({ icon: Icon, tone = 'violet' }: { icon: React.ComponentType<{ className?: string }>; tone?: string }) {
  const t = toneMap[tone] || toneMap.violet;
  return <div className={`w-10 h-10 rounded-xl ${t.soft} ${t.text} flex items-center justify-center`}><Icon className="w-5 h-5" /></div>;
}

function StatCard({ icon, label, value, delta, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; delta: string; tone: string }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3"><IconTile icon={icon} tone={tone} /><span className="text-xs font-semibold text-emerald-600">↗ {delta}</span></div>
      <div className="mt-4 text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

function PipelineCell({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <div className={`min-h-[88px] rounded-xl border border-slate-200 bg-white p-3 ${muted ? 'opacity-70' : ''}`}>{children}</div>;
}

export default function RecruitingOS() {
  const [activeNav, setActiveNav] = useState('Home');
  const [mobileNav, setMobileNav] = useState(false);
  const [showNewJob, setShowNewJob] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobs, setJobs] = useState(JOBS);

  const navItems = useMemo(() => [
    { label: 'Home', icon: LayoutDashboard },
    { label: 'Jobs', icon: BriefcaseBusiness },
    { label: 'Candidates', icon: Users },
    { label: 'Interviews', icon: CalendarDays },
    { label: 'Approvals', icon: ClipboardCheck, badge: '2' },
    { label: 'Compensation', icon: Target },
    { label: 'Offers', icon: FileText },
    { label: 'Engagement', icon: MessageSquare },
    { label: 'Onboarding', icon: Handshake },
    { label: 'Analytics', icon: Activity },
    { label: 'Settings', icon: Settings2 },
  ], []);

  const createJob = () => {
    const title = jobTitle.trim();
    if (!title) return;
    setJobs(prev => [{ title, team: 'New requisition', source: '—', candidates: '0', shortlisted: '0', interviews: '0', status: 'Draft' }, ...prev]);
    setJobTitle('');
    setShowNewJob(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 w-[248px] border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full flex-col px-4 py-5">
            <div className="flex items-center gap-3 px-2 pb-7">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/20"><BriefcaseBusiness className="w-5 h-5" /></div>
              <div className="text-[17px] font-extrabold tracking-tight text-slate-950">SMART SCOUT</div>
            </div>

            <nav className="space-y-1 flex-1">
              {navItems.map(({ label, icon: Icon, badge }) => {
                const active = activeNav === label;
                return <button key={label} onClick={() => { setActiveNav(label); setMobileNav(false); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><Icon className={`w-4 h-4 ${active ? 'text-violet-600' : 'text-slate-500'}`} /><span className="flex-1 text-left">{label}</span>{badge && <span className="min-w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center">{badge}</span>}</button>;
              })}
            </nav>

            <div className="space-y-3">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                <div className="flex items-center justify-between"><span className="text-xs font-bold text-violet-700">AI Credits</span><Sparkles className="w-4 h-4 text-violet-500" /></div>
                <div className="mt-3 text-sm font-extrabold text-slate-900">12,450 <span className="font-medium text-slate-500">/ 20,000</span></div>
                <div className="mt-3 h-1.5 rounded-full bg-white overflow-hidden"><div className="h-full w-[62%] rounded-full bg-violet-600" /></div>
                <div className="mt-2 text-[11px] text-slate-500">Renews in 12 days</div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"><div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">AC</div><div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-800">Acme Corp</div><div className="text-[11px] text-slate-500">Enterprise Plan</div></div><ChevronRight className="w-4 h-4 text-slate-400" /></div>
            </div>
          </div>
        </aside>

        {mobileNav && <button aria-label="Close navigation" onClick={() => setMobileNav(false)} className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-sm lg:hidden" />}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 h-[72px] border-b border-slate-200 bg-white/90 backdrop-blur-xl">
            <div className="h-full px-4 sm:px-6 xl:px-8 flex items-center justify-between gap-4">
              <button onClick={() => setMobileNav(true)} className="lg:hidden h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center"><Menu className="w-5 h-5" /></button>
              <div className="hidden sm:block text-sm text-slate-500">Recruiting OS <span className="mx-2 text-slate-300">/</span> <span className="font-semibold text-slate-800">{activeNav}</span></div>
              <div className="flex items-center gap-2 ml-auto"><button className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"><Search className="w-5 h-5" /></button><button className="relative h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"><Bell className="w-5 h-5" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" /></button><div className="ml-1 h-9 w-9 rounded-full border-2 border-violet-100 bg-violet-50 flex items-center justify-center text-xs font-bold text-violet-700">MN</div></div>
            </div>
          </header>

          <main className="px-4 sm:px-6 xl:px-8 py-7 max-w-[1560px] mx-auto">
            <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-600"><Sparkles className="w-4 h-4" /> Recruiting intelligence</div>
                <h1 className="mt-2 text-3xl sm:text-4xl xl:text-[44px] leading-tight font-black tracking-[-0.035em] text-slate-950">Hire better. Move faster. Stay in control.</h1>
                <p className="mt-3 max-w-3xl text-sm sm:text-base leading-7 text-slate-500">AI-powered recruiting that brings sourcing, screening, interviews, decisions and offers into one intelligent workflow — with your team in control.</p>
              </div>
              <button onClick={() => setShowNewJob(true)} className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition"><Plus className="w-4 h-4" /> New Job</button>
            </section>

            <section className="mt-7 grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard icon={BriefcaseBusiness} label="Open Jobs" value={String(24 + Math.max(0, jobs.length - 3))} delta="20%" tone="violet" />
              <StatCard icon={Users} label="Active Candidates" value="156" delta="18%" tone="blue" />
              <StatCard icon={CalendarDays} label="Interviews" value="32" delta="25%" tone="amber" />
              <StatCard icon={FileText} label="Offers" value="7" delta="40%" tone="emerald" />
              <StatCard icon={UserCheck} label="Hires" value="5" delta="100%" tone="violet" />
            </section>

            <section className="mt-5 grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.04)] overflow-hidden">
                <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-extrabold text-slate-950">Hiring pipeline</h2><p className="text-xs text-slate-500 mt-1">Every requisition, candidate and decision in one view.</p></div><button className="text-xs font-bold text-violet-600 hover:text-violet-700">View all <ArrowUpRight className="inline w-3.5 h-3.5" /></button></div>
                <div className="hidden lg:block overflow-x-auto">
                  <div className="min-w-[900px] grid grid-cols-5 gap-3 p-4 sm:p-5">
                    {STAGES.map((stage, index) => { const Icon = stage.icon; const t = toneMap[stage.tone]; return <div key={stage.id}><div className="flex items-center gap-2 px-1 pb-3"><div className={`w-7 h-7 rounded-lg ${t.soft} ${t.text} flex items-center justify-center`}><Icon className="w-3.5 h-3.5" /></div><div className="text-xs font-bold text-slate-800">{index + 1}. {stage.label}</div><span className="ml-auto text-[11px] font-bold text-slate-400">{stage.count}</span></div>{jobs.map((job, i) => <PipelineCell key={job.title + stage.id}><div className="text-[11px] font-bold text-slate-900 truncate">{job.title}</div><div className="text-[10px] text-slate-400 mt-1">{stage.id === 'job' ? job.team : stage.id === 'source' ? `${job.candidates} candidates` : stage.id === 'screen' ? `${job.shortlisted} shortlisted` : stage.id === 'interview' ? `${job.interviews} in interviews` : <span className="text-emerald-600 font-semibold">{job.status}</span>}</div>{stage.id === 'source' && <div className="mt-3 flex -space-x-1.5"><div className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white" /><div className="w-5 h-5 rounded-full bg-violet-200 border-2 border-white" /><div className="w-5 h-5 rounded-full bg-blue-200 border-2 border-white" /><span className="ml-2 text-[9px] font-semibold text-slate-400 self-center">+{Math.max(0, Number(job.candidates) - 3)}</span></div>}</PipelineCell>)}</div>; })}
                  </div>
                </div>
                <div className="lg:hidden p-4 space-y-3">{jobs.map(job => <div key={job.title} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-bold text-slate-900">{job.title}</div><div className="text-xs text-slate-500 mt-1">{job.team}</div></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{job.status}</span></div><div className="grid grid-cols-4 gap-2 mt-4">{[['Sourced', job.candidates], ['Shortlisted', job.shortlisted], ['Interviews', job.interviews], ['Stage', 'Decision']].map(([l, v]) => <div key={l}><div className="text-[9px] uppercase tracking-wider text-slate-400">{l}</div><div className="mt-1 text-sm font-bold text-slate-800">{v}</div></div>)}</div></div>)}</div>
              </div>

              <aside className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between"><h2 className="font-extrabold text-slate-950">Activity feed</h2><button className="text-xs font-bold text-violet-600">View all</button></div>
                <div className="p-4">{ACTIVITIES.map(item => { const Icon = item.icon; return <div key={item.title} className="flex gap-3 py-3 first:pt-1 last:pb-1"><IconTile icon={Icon} tone={item.tone} /><div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-800">{item.title}</div><div className="text-[11px] text-slate-500 mt-1 truncate">{item.detail}</div><div className="text-[10px] text-slate-400 mt-1">{item.time}</div></div></div>; })}</div>
              </aside>
            </section>

            <section className="mt-5 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr_320px] gap-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><div className="flex items-center justify-between"><div><h2 className="font-extrabold text-slate-950">AI insights</h2><p className="text-xs text-slate-500 mt-1">What the recruiting engine is seeing this week.</p></div><Bot className="w-5 h-5 text-violet-500" /></div><div className="mt-5 space-y-4">{[['78%', 'Quality score', '+12%', 'violet'], ['24 days', 'Time to hire', '−3 days', 'blue'], ['92%', 'Interview show rate', '+8%', 'emerald'], ['4.6/5', 'Candidate experience', '+0.3', 'amber']].map(([value, label, delta, tone]) => <div key={label} className="flex items-center gap-4"><div className="w-20 text-xl font-black text-slate-950">{value}</div><div className="flex-1"><div className="text-xs font-semibold text-slate-600">{label}</div><div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${toneMap[tone].bg}`} style={{ width: value.includes('%') ? value : '72%' }} /></div></div><span className="text-[10px] font-bold text-emerald-600">{delta}</span></div>)}</div></div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><div className="flex items-center justify-between"><div><h2 className="font-extrabold text-slate-950">Top performing jobs</h2><p className="text-xs text-slate-500 mt-1">Roles producing the strongest outcomes.</p></div><MoreHorizontal className="w-5 h-5 text-slate-400" /></div><div className="mt-5 space-y-4">{['Senior Frontend Developer', 'Product Manager', 'DevOps Engineer', 'UX Designer'].map((title, i) => <div key={title} className="flex items-center gap-3"><IconTile icon={Users} tone={i % 2 ? 'blue' : 'violet'} /><div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-800 truncate">{title}</div><div className="text-[10px] text-slate-400 mt-1">{12 - i * 2} hires</div></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{92 - i * 4}%</span></div>)}</div></div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><h2 className="font-extrabold text-slate-950">Quick actions</h2><div className="mt-4 space-y-2">{[[Plus, 'Create New Job', 'Start a hiring process'], [Users, 'Upload Candidates', 'Add candidates in bulk'], [CalendarDays, 'Schedule Interview', 'Book interviews instantly'], [FileText, 'Generate Offer', 'Create offer with AI']].map(([Icon, title, detail]) => <button key={String(title)} onClick={() => title === 'Create New Job' && setShowNewJob(true)} className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50 transition"><IconTile icon={Icon as React.ComponentType<{ className?: string }>} tone="violet" /><div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-800">{String(title)}</div><div className="text-[10px] text-slate-500 mt-0.5">{String(detail)}</div></div><ChevronRight className="w-4 h-4 text-slate-300" /></button>)}</div></div>
            </section>
          </main>
        </div>
      </div>

      {showNewJob && <div className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl"><div className="p-6 border-b border-slate-100 flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-violet-600">New requisition</div><h3 className="mt-1 text-xl font-extrabold text-slate-950">Start a new hire</h3></div><button onClick={() => setShowNewJob(false)} className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div><div className="p-6"><label className="text-xs font-bold text-slate-700">Job title<input autoFocus value={jobTitle} onChange={e => setJobTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createJob()} placeholder="e.g. Head of People" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" /></label><div className="mt-4 rounded-xl bg-violet-50 p-4 text-xs text-violet-800"><div className="flex gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /><span>Smart Scout will turn the role into structured requirements, sourcing criteria and approval gates.</span></div></div></div><div className="p-6 pt-0 flex justify-end gap-2"><button onClick={() => setShowNewJob(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button onClick={createJob} disabled={!jobTitle.trim()} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-40">Create job</button></div></div></div>}
    </div>
  );
}
