import React, { useMemo, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, ChevronRight, Circle, Clock3, Database, FileText, Globe2, Handshake, Mic2, Plug, Search, Send, Settings2, ShieldCheck, Sparkles, UserCheck, Users, Workflow } from 'lucide-react';

type StageStatus = 'done' | 'active' | 'next' | 'locked';

type Stage = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: StageStatus;
};

const STAGES: Stage[] = [
  { id: 'job', label: 'Job Intelligence', description: 'Create and optimize the role with structured requirements.', icon: FileText, status: 'active' },
  { id: 'source', label: 'Talent Sourcing', description: 'Search connected sources and normalize candidate profiles.', icon: Search, status: 'next' },
  { id: 'screen', label: 'Candidate Intelligence', description: 'Score evidence against the role and explain every recommendation.', icon: UserCheck, status: 'next' },
  { id: 'interview', label: 'AI Interviews', description: 'Schedule, conduct and evaluate structured audio interviews.', icon: Mic2, status: 'next' },
  { id: 'decision', label: 'Final Decision', description: 'Combine evidence into a transparent hiring recommendation.', icon: ShieldCheck, status: 'next' },
  { id: 'comp', label: 'Compensation', description: 'Benchmark market and internal parity before an offer.', icon: Database, status: 'next' },
  { id: 'offer', label: 'Offer & Engagement', description: 'Prepare the offer and automate preboarding engagement.', icon: Handshake, status: 'next' },
  { id: 'onboard', label: 'Onboarding', description: 'Create the employee in the customer HR system.', icon: Plug, status: 'next' },
];

const sourceConnectors = ['Customer ATS', 'Career site', 'Job portal API', 'Browser connector'];
const aiProviders = ['Google Gemini', 'OpenAI', 'Anthropic'];
const hrSystems = ['Darwinbox', 'Workday', 'SAP SuccessFactors', 'BambooHR', 'Custom API'];

const demoCandidates = [
  { name: 'Rohan Gupta', role: 'Senior Product Manager', score: 94, reason: 'Strong SaaS leadership, product strategy and team scaling evidence.' },
  { name: 'Priya Mehta', role: 'Product Lead', score: 91, reason: 'Excellent product analytics and B2B experience; domain fit is slightly weaker.' },
  { name: 'Amit Verma', role: 'Group Product Manager', score: 87, reason: 'Strong leadership profile with a longer notice period.' },
];

const StageIcon = ({ stage }: { stage: Stage }) => {
  const Icon = stage.icon;
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${stage.status === 'active' ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300' : stage.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
};

const StatusPill = ({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'green' | 'indigo' | 'amber' | 'slate' }) => {
  const classes = {
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    slate: 'bg-slate-900 text-slate-400 border-slate-800',
  }[tone];
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${classes}`}>{children}</span>;
};

const IntegrationRow = ({ label, connected, onConnect }: { label: string; connected: boolean; onConnect: () => void }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-800/60 last:border-0">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center"><Plug className="w-4 h-4 text-slate-500" /></div>
      <span className="text-sm text-slate-300 truncate">{label}</span>
    </div>
    {connected ? <StatusPill tone="green"><CheckCircle2 className="w-3 h-3" /> Connected</StatusPill> : <button onClick={onConnect} className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300">Connect</button>}
  </div>
);

export default function RecruitingOS() {
  const [activeStage, setActiveStage] = useState('job');
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [connected, setConnected] = useState<string[]>(['Customer ATS']);
  const [provider, setProvider] = useState('Google Gemini');
  const [role, setRole] = useState('Senior Product Manager');
  const [requirements, setRequirements] = useState('8–12 years, B2B SaaS, product strategy, team leadership, Bangalore');

  const currentStage = useMemo(() => STAGES.find(s => s.id === activeStage) || STAGES[0], [activeStage]);

  const runStage = async () => {
    if (running) return;
    setRunning(true);
    await new Promise(resolve => setTimeout(resolve, 900));
    setCompleted(prev => prev.includes(activeStage) ? prev : [...prev, activeStage]);
    const index = STAGES.findIndex(s => s.id === activeStage);
    if (index < STAGES.length - 1) setActiveStage(STAGES[index + 1].id);
    setRunning(false);
  };

  const connect = (name: string) => setConnected(prev => prev.includes(name) ? prev : [...prev, name]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-fadeIn pb-16">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-indigo-400" /><span className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">Recruiting OS</span></div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">From JD to onboarded employee.</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">Smart Scout orchestrates sourcing, screening, interviews, decisions, compensation, offers and onboarding while your team remains in control of critical approvals.</p>
        </div>
        <div className="flex items-center gap-2"><StatusPill tone="indigo"><Bot className="w-3 h-3" /> Agent ready</StatusPill><StatusPill tone="green"><ShieldCheck className="w-3 h-3" /> Human approval gates</StatusPill></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_340px] gap-5">
        <aside className="glass-panel rounded-2xl border border-slate-800/70 p-3 h-fit">
          <div className="px-3 py-3 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Hiring workflow</span><Workflow className="w-4 h-4 text-slate-600" /></div>
          <div className="space-y-1">
            {STAGES.map((stage, index) => {
              const done = completed.includes(stage.id);
              const active = activeStage === stage.id;
              return (
                <button key={stage.id} onClick={() => setActiveStage(stage.id)} className={`w-full text-left p-3 rounded-xl transition-all flex gap-3 ${active ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-slate-900/70 border border-transparent'}`}>
                  <div className="relative"><StageIcon stage={{ ...stage, status: done ? 'done' : active ? 'active' : 'next' }} />{index < STAGES.length - 1 && <div className="absolute left-5 top-10 w-px h-4 bg-slate-800" />}</div>
                  <div className="min-w-0 pt-0.5"><div className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-400'}`}>{index + 1}. {stage.label}</div><div className="text-[10px] text-slate-600 mt-1 line-clamp-2">{stage.description}</div></div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="glass-panel rounded-2xl border border-slate-800/70 overflow-hidden min-h-[650px]">
          <div className="p-6 border-b border-slate-800/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3"><StageIcon stage={currentStage} /><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Stage {STAGES.findIndex(s => s.id === activeStage) + 1} of {STAGES.length}</div><h3 className="text-xl font-bold text-white mt-1">{currentStage.label}</h3></div></div>
            <button onClick={runStage} disabled={running} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20">{running ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running agent...</> : <>Run stage <ArrowRight className="w-4 h-4" /></>}</button>
          </div>

          {activeStage === 'job' && <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="space-y-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</span><input value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50" /></label>
              <label className="space-y-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI provider</span><select value={provider} onChange={e => setProvider(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50">{aiProviders.map(p => <option key={p}>{p}</option>)}</select></label>
            </div>
            <label className="space-y-2 block"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Requirements</span><textarea value={requirements} onChange={e => setRequirements(e.target.value)} rows={5} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 resize-none" /></label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[['JD quality', '92'], ['Must-have skills', '8'], ['Approval gates', '4']].map(([label, value]) => <div key={label} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4"><div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div><div className="text-2xl font-black text-white mt-1">{value}</div></div>)}
            </div>
          </div>}

          {activeStage === 'source' && <div className="p-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{sourceConnectors.map(source => <div key={source} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Globe2 className="w-5 h-5 text-indigo-400" /><span className="font-bold text-white">{source}</span></div>{connected.includes(source) ? <StatusPill tone="green">Ready</StatusPill> : <button onClick={() => connect(source)} className="text-xs text-indigo-400 font-bold">Connect</button>}</div><p className="text-xs text-slate-500 mt-3">Connector runs the approved search strategy, normalizes profiles and deduplicates candidates before AI scoring.</p></div>)}</div><div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20"><div className="flex items-center gap-2 text-indigo-300 font-bold"><Search className="w-4 h-4" /> Sourcing strategy</div><p className="text-sm text-slate-400 mt-2">Generate multiple search queries from <strong className="text-slate-200">{role}</strong>, search connected sources, collect evidence and return the highest-fit candidates.</p></div></div>}

          {activeStage === 'screen' && <div className="p-6 space-y-4"><div className="flex items-center justify-between"><div><h4 className="font-bold text-white">Top candidates</h4><p className="text-xs text-slate-500">Evidence-based ranking for {role}</p></div><StatusPill tone="indigo">AI scoring</StatusPill></div>{demoCandidates.map((candidate, i) => <div key={candidate.name} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col lg:flex-row lg:items-center gap-5"><div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-black">{i + 1}</div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-white">{candidate.name}</h4><StatusPill tone={candidate.score >= 92 ? 'green' : 'indigo'}>{candidate.score}% match</StatusPill></div><p className="text-xs text-slate-500 mt-1">{candidate.role}</p><p className="text-sm text-slate-400 mt-3">{candidate.reason}</p></div><button onClick={() => setActiveStage('interview')} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Move to interview</button></div>)}</div>}

          {activeStage === 'interview' && <div className="p-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[['Scheduled', '6'], ['Completed', '4'], ['Recommended', '3']].map(([label, value]) => <div key={label} className="bg-slate-950/70 border border-slate-800 rounded-xl p-5"><div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div><div className="text-3xl font-black text-white mt-1">{value}</div></div>)}</div><div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800"><div className="flex items-center gap-2"><Mic2 className="w-5 h-5 text-indigo-400" /><h4 className="font-bold text-white">AI audio interview campaign</h4></div><p className="text-sm text-slate-400 mt-2">Generate role-specific questions, send secure interview links, transcribe responses and score structured evidence.</p><div className="flex flex-wrap gap-2 mt-4"><StatusPill tone="green"><CheckCircle2 className="w-3 h-3" /> 4 completed</StatusPill><StatusPill tone="amber"><Clock3 className="w-3 h-3" /> 2 pending</StatusPill></div></div></div>}

          {activeStage === 'decision' && <div className="p-6 space-y-6"><div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20"><div className="flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-emerald-400" /><div><div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">AI recommendation</div><h4 className="text-xl font-black text-white mt-1">Rohan Gupta — Recommend hire</h4></div></div><p className="text-sm text-slate-400 mt-4">Resume 94 · Interview 92 · Leadership 96 · Role fit 95. Strong evidence across the hiring criteria with no critical gaps identified.</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800"><div className="text-[10px] uppercase tracking-wider text-slate-600">Human approval</div><div className="text-white font-bold mt-2">Required before rejection or offer</div></div><div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800"><div className="text-[10px] uppercase tracking-wider text-slate-600">Audit trail</div><div className="text-white font-bold mt-2">Every recommendation stores evidence</div></div></div></div>}

          {activeStage === 'comp' && <div className="p-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[['Market P50', '₹78L'], ['Internal P50', '₹74L'], ['Recommended', '₹82L']].map(([label, value]) => <div key={label} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800"><div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div><div className="text-2xl font-black text-white mt-2">{value}</div></div>)}</div><div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20"><div className="flex items-center gap-2 text-indigo-300 font-bold"><Database className="w-4 h-4" /> Compensation recommendation</div><p className="text-sm text-slate-400 mt-2">Combine customer-provided internal compensation data with connected market datasets. Keep source, freshness and confidence visible for every benchmark.</p></div></div>}

          {activeStage === 'offer' && <div className="p-6 space-y-6"><div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800"><div className="flex items-center gap-3"><Send className="w-5 h-5 text-indigo-400" /><h4 className="font-bold text-white">Offer workflow</h4></div><div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">{['Comp approved', 'Offer generated', 'Candidate notified', 'Preboarding active'].map((s, i) => <div key={s} className="flex items-center gap-2 text-xs text-slate-300"><div className={`w-6 h-6 rounded-full flex items-center justify-center ${i < 2 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>{i < 2 ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}</div>{s}</div>)}</div></div><div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-sm text-slate-400">After acceptance, Smart Scout can run a configurable engagement plan: manager introduction, document reminders, company content, joining confirmation and risk alerts.</div></div>}

          {activeStage === 'onboard' && <div className="p-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{hrSystems.map(system => <div key={system} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"><div className="flex items-center gap-3"><Plug className="w-5 h-5 text-indigo-400" /><span className="font-bold text-white">{system}</span></div>{connected.includes(system) ? <StatusPill tone="green">Connected</StatusPill> : <button onClick={() => connect(system)} className="text-xs font-bold text-indigo-400">Connect</button>}</div>)}</div><div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800"><h4 className="font-bold text-white">Employee handoff</h4><p className="text-sm text-slate-400 mt-2">Map Smart Scout fields to the customer's HRIS, validate required fields, show a diff, require approval and then create the employee record through the customer's API.</p></div></div>}
        </main>

        <aside className="space-y-5">
          <div className="glass-panel rounded-2xl border border-slate-800/70 p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-bold">AI usage</div><div className="text-lg font-bold text-white mt-1">Bring your own key</div></div><Settings2 className="w-5 h-5 text-slate-500" /></div><p className="text-xs text-slate-500 mt-3">Smart Scout provides the orchestration layer. Customers connect their own AI provider so model usage is billed directly to them.</p><select value={provider} onChange={e => setProvider(e.target.value)} className="mt-4 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white">{aiProviders.map(p => <option key={p}>{p}</option>)}</select><div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-300">API keys should be stored server-side in an encrypted tenant vault; never expose provider secrets to the browser.</div></div>
          <div className="glass-panel rounded-2xl border border-slate-800/70 p-5"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-indigo-400" /><span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Live pipeline</span></div><div className="grid grid-cols-2 gap-3 mt-4">{[['Sourced', '127'], ['Shortlisted', '18'], ['Interviews', '8'], ['Offers', '4']].map(([label, value]) => <div key={label} className="p-3 rounded-xl bg-slate-950 border border-slate-800"><div className="text-xl font-black text-white">{value}</div><div className="text-[9px] text-slate-600 uppercase tracking-wider mt-1">{label}</div></div>)}</div></div>
          <div className="glass-panel rounded-2xl border border-slate-800/70 p-5"><div className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-indigo-400" /><span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Next action</span></div><div className="text-sm font-bold text-white mt-3">{completed.includes(activeStage) ? 'Review the completed stage and continue.' : `Run ${currentStage.label}.`}</div><button onClick={runStage} disabled={running} className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold">{running ? 'Agent running…' : 'Run now'}</button></div>
        </aside>
      </div>
    </div>
  );
}
