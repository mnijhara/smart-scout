import React, { useEffect, useState } from 'react';
import {
  ArrowRight, Briefcase, Check, ChevronRight, Clock3, FileText, Globe,
  MapPin, Mic2, Pause, Play, Search, ShieldCheck, Sparkles, Star,
  TrendingUp, Users, X
} from 'lucide-react';

type Stage = 'command' | 'jd' | 'source' | 'shortlist' | 'interview' | 'decision' | 'comp' | 'offer';

const STAGES: Stage[] = ['command', 'jd', 'source', 'shortlist', 'interview', 'decision', 'comp', 'offer'];
const STAGE_META: Record<Stage, { label: string; kicker: string }> = {
  command: { label: 'Command', kicker: '01' },
  jd: { label: 'JD', kicker: '02' },
  source: { label: 'Source', kicker: '03' },
  shortlist: { label: 'Shortlist', kicker: '04' },
  interview: { label: 'Interview', kicker: '05' },
  decision: { label: 'Decision', kicker: '06' },
  comp: { label: 'Comp', kicker: '07' },
  offer: { label: 'Offer', kicker: '08' }
};

const PEOPLE = [
  { name: 'Rhea Malhotra', role: 'CHRO / VP People · Fintech', loc: 'Gurgaon', score: 94, source: 'LinkedIn', reason: 'Scaled HR 900 → 2,400 employees; led org redesign and CEO-sponsored transformation.', evidence: ['2,400-employee scale', 'HR transformation', 'CEO partnership'] },
  { name: 'Arjun Mehta', role: 'SVP People · SaaS', loc: 'Bengaluru', score: 91, source: 'Naukri', reason: 'Built global talent systems across a 1,800-person SaaS business.', evidence: ['1,800-person SaaS', 'Talent systems', 'Leadership'] },
  { name: 'Nisha Kapoor', role: 'HR Director · Consumer Tech', loc: 'Delhi NCR', score: 86, source: 'LinkedIn', reason: 'Strong HRBP and culture background with growth-stage evidence.', evidence: ['Consumer tech', 'HRBP', 'Growth'] },
  { name: 'Vikram Shah', role: 'VP HR · Services', loc: 'Mumbai', score: 79, source: 'Naukri', reason: 'Experienced operator, but technology transformation evidence is lighter.', evidence: ['Operations', 'HR leadership', 'Scale'] }
];

const JD = {
  title: 'Vice President — Human Resources',
  loc: 'Gurgaon · Hybrid',
  summary: 'Own the people strategy for a 1,500-person technology business entering its next scale phase. Build a high-performing HR function, modernise talent systems and partner directly with the CEO.',
  must: [
    '15+ years in HR with 5+ years in senior HR leadership',
    'Technology or high-growth organisation scaling experience',
    'HR transformation, org design and talent management',
    'Executive stakeholder management and CEO partnership'
  ]
};

const TRANSCRIPT = [
  ['09:31', 'Smart Scout', 'You inherit an HR function built for 700 employees. The company is now at 1,500. What changes first?'],
  ['09:33', 'Rhea Malhotra', 'I would map the business strategy to critical capabilities, then redesign the operating model around them.'],
  ['09:36', 'Smart Scout', 'Tell me about a time you changed an executive team’s view using data.'],
  ['09:38', 'Rhea Malhotra', 'Regrettable attrition looked like compensation. Analysis showed it was concentrated under three leaders. We redesigned the scorecard and cut regrettable attrition by 28%.'],
  ['09:41', 'Smart Scout', 'What would your first 90 days look like?'],
  ['09:43', 'Rhea Malhotra', 'Listen first, establish the people baseline, identify constraints to growth, then commit the leadership team to a measurable plan.']
];

export default function MagicHiringDemoReal({ onUseOwn }: { onUseOwn: () => void }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('command');
  const [paused, setPaused] = useState(false);
  const index = STAGES.indexOf(stage);

  useEffect(() => {
    if (!open || paused || index === STAGES.length - 1) return;
    const timer = window.setTimeout(() => setStage(STAGES[index + 1]), 3600);
    return () => window.clearTimeout(timer);
  }, [open, paused, index]);

  const start = () => {
    setStage('command');
    setPaused(false);
    setOpen(true);
  };

  return (
    <section id="magic-demo" className="border-y border-[#e1dfdd] bg-[#f7f7f8] py-14 font-['Segoe_UI_Variable','Segoe_UI',Arial,sans-serif] sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#5b2be0]"><Sparkles className="h-4 w-4" />Smart Scout · product simulation</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#242424] sm:text-5xl">Watch the hiring work happen on screen.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#605e5c]">Eight connected screens show the work, evidence and decisions a recruiter actually sees — from the hiring command to a ready-to-send offer.</p>
          </div>
          <button onClick={start} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#5b2be0] px-5 py-3 text-sm font-semibold text-white"><Play className="h-4 w-4 fill-current" />Play full hiring run</button>
        </div>

        <div className="mt-8 overflow-hidden rounded-md border border-[#d6d3d1] bg-white shadow-[0_16px_45px_rgba(0,0,0,.08)]">
          <BrowserBar />
          <div className="p-4 sm:p-6">
            <Journey stage={stage} setStage={setStage} />
            <ScreenHeader stage={stage} paused={false} />
            <Screen stage={stage} />
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-2 sm:p-5" onClick={() => setOpen(false)}>
          <div className="flex max-h-[96vh] w-full max-w-[1450px] flex-col overflow-hidden rounded-md bg-white shadow-2xl" onClick={(event) => event.stopPropagation()} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="flex items-center justify-between border-b border-[#e1dfdd] px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#5b2be0] text-white"><Sparkles className="h-4 w-4" /></span>
                <div><div className="text-xs font-bold">Smart Scout · Live product simulation</div><div className="text-[10px] text-[#797775]">VP HR · Gurgaon · fictional demo data</div></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPaused(!paused)} className="hidden items-center gap-1 rounded-sm border border-[#d6d3d1] px-3 py-1.5 text-[10px] font-semibold sm:flex">{paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}{paused ? 'Resume' : 'Pause'}</button>
                <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-sm p-2 text-[#605e5c]"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <main className="min-h-0 overflow-auto p-4 sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div><div className="text-[10px] font-bold uppercase tracking-widest text-[#5b2be0]">Screen {index + 1} of {STAGES.length}</div><h3 className="mt-1 text-xl font-bold text-[#242424] sm:text-2xl">{screenTitle(stage)}</h3></div>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#107c10]"><span className="h-2 w-2 rounded-full bg-[#107c10]" />{paused ? 'PAUSED' : 'LIVE'}</span>
              </div>
              <Journey stage={stage} setStage={setStage} />
              <div className="mt-5"><ScreenHeader stage={stage} paused={paused} /><Screen stage={stage} /></div>
              <div className="mt-6 flex justify-between border-t border-[#e1dfdd] pt-4">
                <button disabled={!index} onClick={() => setStage(STAGES[index - 1])} className="rounded-sm border border-[#d6d3d1] px-4 py-2 text-xs font-semibold disabled:opacity-30">Back</button>
                {index < STAGES.length - 1 ? <button onClick={() => setStage(STAGES[index + 1])} className="inline-flex items-center gap-2 rounded-sm bg-[#5b2be0] px-4 py-2 text-xs font-semibold text-white">Next screen <ChevronRight className="h-4 w-4" /></button> : <button onClick={onUseOwn} className="inline-flex items-center gap-2 rounded-sm bg-[#242424] px-4 py-2 text-xs font-semibold text-white">Run your real hiring need <ArrowRight className="h-4 w-4" /></button>}
              </div>
            </main>
          </div>
        </div>
      )}
    </section>
  );
}

function BrowserBar() {
  return <div className="flex items-center gap-2 border-b border-[#e1dfdd] bg-[#faf9f8] px-4 py-2.5"><span className="h-2.5 w-2.5 rounded-full bg-[#d13438]" /><span className="h-2.5 w-2.5 rounded-full bg-[#ffb900]" /><span className="h-2.5 w-2.5 rounded-full bg-[#107c10]" /><div className="ml-3 flex-1 rounded-sm border border-[#d6d3d1] bg-white px-3 py-1.5 text-[10px] text-[#605e5c]">smartscout.online / recruiting / VP-HR-Gurgaon</div><span className="text-[9px] font-bold text-[#797775]">PRODUCT SIMULATION</span></div>;
}

function Journey({ stage, setStage }: { stage: Stage; setStage: (stage: Stage) => void }) {
  const active = STAGES.indexOf(stage);
  return <div className="mb-6 overflow-x-auto pb-1"><div className="flex min-w-[900px] items-start px-1">
    {STAGES.map((item, index) => <React.Fragment key={item}>
      <button onClick={() => setStage(item)} className="group flex min-w-[92px] flex-col items-center text-center">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[10px] font-bold transition ${index < active ? 'border-[#5b2be0] bg-[#5b2be0] text-white' : index === active ? 'border-[#5b2be0] bg-[#f1edff] text-[#5b2be0] ring-4 ring-[#eee9ff]' : 'border-[#d6d3d1] bg-white text-[#797775]'}`}>{index < active ? <Check className="h-4 w-4" /> : STAGE_META[item].kicker}</span>
        <span className={`mt-2 text-[10px] font-bold uppercase tracking-[.08em] ${index === active ? 'text-[#5b2be0]' : 'text-[#605e5c]'}`}>{STAGE_META[item].label}</span>
        <span className="mt-0.5 text-[8px] text-[#969390]">{journeyHint(item)}</span>
      </button>
      {index < STAGES.length - 1 && <div className={`mt-[18px] h-px min-w-[25px] flex-1 ${index < active ? 'bg-[#5b2be0]' : 'bg-[#d6d3d1]'}`} />}
    </React.Fragment>)}
  </div></div>;
}

function journeyHint(stage: Stage) {
  return ({ command: 'Define need', jd: 'Shape role', source: 'Find evidence', shortlist: 'Compare fit', interview: 'Collect proof', decision: 'Approve choice', comp: 'Benchmark pay', offer: 'Close hire' } as Record<Stage, string>)[stage];
}

function screenTitle(stage: Stage) {
  return ({ command: 'Recruiter command', jd: 'Job workspace', source: 'Source candidates', shortlist: 'Candidate intelligence', interview: 'Structured audio interview', decision: 'Decision intelligence', comp: 'Compensation benchmark', offer: 'Offer workspace' } as Record<Stage, string>)[stage];
}

function ScreenHeader({ stage, paused }: { stage: Stage; paused: boolean }) {
  return <div className="mb-3 flex items-center justify-between gap-3"><div><div className="text-[9px] font-bold uppercase tracking-[.18em] text-[#797775]">Current screen</div><div className="mt-1 text-sm font-bold text-[#242424]">{screenTitle(stage)}</div></div><span className="flex items-center gap-1.5 rounded-full border border-[#dff1dc] bg-[#f2fbf0] px-2.5 py-1 text-[9px] font-bold text-[#107c10]"><span className="h-1.5 w-1.5 rounded-full bg-[#107c10]" />{paused ? 'PAUSED' : 'LIVE'}</span></div>;
}

function Shell({ children, title, meta }: { children: React.ReactNode; title: string; meta?: string }) {
  return <div className="overflow-hidden rounded-sm border border-[#d6d3d1] bg-[#faf9f8]"><div className="flex items-center justify-between border-b border-[#e1dfdd] bg-white px-4 py-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#5b2be0]" /><span className="text-xs font-bold text-[#242424]">{title}</span></div><span className="text-[9px] font-semibold text-[#797775]">{meta || 'Smart Scout Recruiting OS'}</span></div><div className="p-4 sm:p-5">{children}</div></div>;
}

function Screen({ stage }: { stage: Stage }) {
  if (stage === 'command') return <Shell title="New hiring request" meta="Recruiter command · 12 requirements extracted"><div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><div><Label t="Type a hiring command"/><div className="mt-2 min-h-[135px] rounded-sm border-2 border-[#5b2be0] bg-white p-4"><div className="text-sm leading-7 text-[#242424]">Hire a VP HR for a 1,500-person technology company in Gurgaon. Build the people function, lead HR transformation and partner with the CEO.<span className="ml-1 inline-block h-5 w-px animate-pulse bg-[#5b2be0]" /></div></div><div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-[#107c10]"><Check className="h-3.5 w-3.5" />Command understood</div><div className="mt-4 flex flex-wrap gap-2"><Tag t="VP HR" /><Tag t="Gurgaon" /><Tag t="1,500 employees" /><Tag t="Technology" /><Tag t="CEO partner" /><Tag t="HR transformation" /></div><button className="mt-4 rounded-sm bg-[#5b2be0] px-4 py-2.5 text-xs font-semibold text-white">Generate role workspace <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></div><Panel title="Intent parsed" rows={['Seniority · VP / executive','Location · Gurgaon / hybrid','Business scale · 1,500','Core mandate · build + transform','Stakeholder · CEO','Evidence standard · measurable outcomes']} /></div></Shell>;

  if (stage === 'jd') return <Shell title="Job workspace" meta="Draft · human approval required"><div className="grid gap-5 xl:grid-cols-[1fr_330px]"><div className="border border-[#e1dfdd] bg-white"><div className="border-b border-[#e1dfdd] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Label t="Generated job description"/><h4 className="mt-2 text-xl font-bold">{JD.title}</h4><div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#605e5c]"><MapPin className="h-3.5 w-3.5" />{JD.loc}<span>·</span><Users className="h-3.5 w-3.5" />1,500 employees</div></div><span className="rounded-sm bg-[#dff6dd] px-2 py-1 text-[9px] font-bold text-[#107c10]">READY FOR REVIEW</span></div><p className="mt-4 text-xs leading-5 text-[#605e5c]">{JD.summary}</p></div><div className="grid gap-5 p-5 md:grid-cols-2"><div><Label t="Must-have criteria"/><div className="mt-3 grid gap-2">{JD.must.map((item) => <div key={item} className="flex gap-2 text-xs"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#107c10]" />{item}</div>)}</div></div><div><Label t="First 90-day outcomes"/><div className="mt-3 grid gap-2 text-xs"><div className="rounded-sm bg-[#f7f5ff] p-3">Baseline people metrics + org health</div><div className="rounded-sm bg-[#f7f5ff] p-3">Critical capability map + operating model</div><div className="rounded-sm bg-[#f7f5ff] p-3">CEO-aligned transformation roadmap</div></div></div></div></div><Panel title="AI quality checks" rows={['Fairness review · no material flags','Must-haves · 4 defined','Evidence criteria · 6 mapped','Interview scorecard · defined','Human approval gate · ON']} footer="Approve JD to unlock sourcing" /></div></Shell>;

  if (stage === 'source') return <Shell title="Source candidates" meta="Recreated research screens · fictional data"><div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[#e1dfdd] bg-white p-3"><div className="flex items-center gap-2"><Search className="h-4 w-4 text-[#5b2be0]" /><span className="text-xs font-semibold">VP HR · Gurgaon · technology · transformation</span></div><span className="text-[9px] font-bold text-[#107c10]">JD APPROVED · SOURCING UNLOCKED</span></div><div className="grid gap-4 xl:grid-cols-2"><Source brand="Naukri" icon="N" people={PEOPLE.filter((person) => person.source === 'Naukri')} /><Source brand="LinkedIn" icon="in" people={PEOPLE.filter((person) => person.source === 'LinkedIn')} /></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Kpi n="186" l="profiles found" /><Kpi n="55" l="profiles opened" /><Kpi n="42" l="evidence captured" /><Kpi n="4" l="high-fit" /></div></Shell>;

  if (stage === 'shortlist') return <Shell title="Candidate intelligence" meta="42 screened · evidence-backed comparison"><div className="mb-4 grid gap-2 sm:grid-cols-4"><Kpi n="94" l="top fit" /><Kpi n="4" l="high-fit" /><Kpi n="17" l="must-have gaps" /><Kpi n="0" l="duplicate profiles" /></div><div className="space-y-2">{PEOPLE.map((person, n) => <div key={person.name} className={`grid gap-3 border p-4 md:grid-cols-[42px_1fr_95px] ${n === 0 ? 'border-[#b9a4ff] bg-[#faf8ff]' : 'border-[#e1dfdd] bg-white'}`}><Avatar name={person.name} /><div><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{person.name}</b><span className="bg-[#f3f2f1] px-2 py-1 text-[9px] font-bold">{person.source}</span><span className="text-[9px] text-[#107c10]">Evidence verified</span></div><div className="mt-1 text-[10px] text-[#797775]">{person.role} · {person.loc}</div><p className="mt-2 text-[10px] leading-4 text-[#605e5c]">{person.reason}</p><div className="mt-2 flex flex-wrap gap-1">{person.evidence.map((item) => <span key={item} className="border border-[#e1dfdd] bg-white px-2 py-1 text-[8px] text-[#605e5c]">✓ {item}</span>)}</div></div><div className="text-right"><div className="text-2xl font-bold text-[#5b2be0]">{person.score}</div><div className="text-[8px] font-bold uppercase text-[#797775]">fit score</div><button className="mt-2 text-[9px] font-bold text-[#5b2be0]">View evidence</button></div></div>)}</div></Shell>;

  if (stage === 'interview') return <Shell title="Structured audio interview" meta="Rhea Malhotra · 42 min · evidence capture"><div className="grid gap-5 xl:grid-cols-[310px_1fr]"><div className="border border-[#e1dfdd] bg-white p-5"><div className="flex items-center gap-3"><Avatar name="Rhea Malhotra" /><div><div className="text-sm font-bold">Rhea Malhotra</div><div className="text-[10px] text-[#797775]">CHRO / VP People · Gurgaon</div></div></div><div className="mt-5 rounded-sm bg-[#f7f5ff] p-4"><div className="flex items-center gap-2"><Mic2 className="h-4 w-4 text-[#5b2be0]" /><span className="text-[10px] font-bold text-[#5b2be0]">TRANSCRIPTION COMPLETE</span></div><div className="mt-3 flex items-end gap-1">{[18,27,12,32,23,36,20,29,15,34,24,30,18,27,38,21,31,16].map((height, i) => <span key={i} className="w-1 rounded-full bg-[#5b2be0]/70" style={{ height }} />)}</div><div className="mt-3 flex justify-between text-[9px] text-[#797775]"><span>00:00</span><span>42:18</span></div></div><div className="mt-4 grid gap-2 text-[10px]"><ScoreLine label="Transformation" value="4.8 / 5" /><ScoreLine label="Executive judgement" value="4.6 / 5" /><ScoreLine label="Scale experience" value="4.9 / 5" /><ScoreLine label="People leadership" value="4.7 / 5" /></div></div><div className="border border-[#e1dfdd] bg-white"><div className="border-b border-[#e1dfdd] px-4 py-3"><div className="flex items-center justify-between"><Label t="Interview evidence" /><span className="text-[9px] font-bold text-[#107c10]">6 / 6 competencies covered</span></div></div><div className="divide-y divide-[#e1dfdd]">{TRANSCRIPT.map(([time, speaker, text]) => <div key={`${time}-${speaker}`} className="grid gap-2 p-4 sm:grid-cols-[45px_105px_1fr]"><span className="text-[9px] font-semibold text-[#979390]">{time}</span><span className="text-[9px] font-bold text-[#5b2be0]">{speaker}</span><span className="text-[10px] leading-5 text-[#605e5c]">{text}</span></div>)}</div></div></div></Shell>;

  if (stage === 'decision') return <Shell title="Decision intelligence" meta="Human decision required · audit trail ready"><div className="grid gap-5 xl:grid-cols-[1fr_340px]"><div className="border border-[#e1dfdd] bg-white"><div className="flex items-center justify-between border-b border-[#e1dfdd] p-5"><div><Label t="Recommendation"/><h4 className="mt-2 text-2xl font-bold">Strong hire</h4><p className="mt-1 text-xs text-[#605e5c]">Rhea leads the shortlist on evidence, interview signal and scale relevance.</p></div><div className="text-right"><div className="text-4xl font-bold text-[#5b2be0]">94</div><div className="text-[9px] font-bold uppercase text-[#797775]">overall fit</div></div></div><div className="grid gap-3 p-5 sm:grid-cols-2"><DecisionCard title="Role fit" value="96%" note="4 / 4 must-haves evidenced" /><DecisionCard title="Interview" value="92%" note="6 / 6 competencies covered" /><DecisionCard title="Leadership" value="95%" note="CEO partnership + transformation" /><DecisionCard title="Risk" value="Low" note="One relocation preference to confirm" /></div></div><Panel title="Approval gate" rows={['Recommendation generated · complete','Evidence links · 18 attached','Conflict / duplicate check · clear','Human decision · required']} footer="Approve decision to unlock compensation" /></div></Shell>;

  if (stage === 'comp') return <Shell title="Compensation benchmark" meta="Decision approved · market context"><div className="grid gap-5 xl:grid-cols-[1fr_330px]"><div className="border border-[#e1dfdd] bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><Label t="VP HR · Gurgaon · Technology"/><h4 className="mt-2 text-2xl font-bold">₹78L — ₹96L fixed</h4><p className="mt-1 text-xs text-[#605e5c]">Recommended package: ₹88L fixed + ₹22L target variable</p></div><span className="rounded-sm bg-[#dff6dd] px-2 py-1 text-[9px] font-bold text-[#107c10]">WITHIN POLICY</span></div><div className="mt-7"><div className="flex items-center justify-between text-[9px] text-[#797775]"><span>Market P25 · ₹78L</span><span>Median · ₹87L</span><span>P75 · ₹96L</span></div><div className="relative mt-3 h-3 rounded-full bg-[#eeeae6]"><div className="absolute left-[15%] right-[15%] h-3 rounded-full bg-[#ded4ff]" /><div className="absolute left-[56%] top-[-5px] h-6 w-1 rounded-full bg-[#5b2be0]" /></div></div><div className="mt-6 grid gap-2 sm:grid-cols-3"><Kpi n="₹88L" l="fixed" /><Kpi n="₹22L" l="target variable" /><Kpi n="₹1.10Cr" l="target CTC" /></div></div><Panel title="Recommendation logic" rows={['Role scope · executive / 1,500 employees','Market position · P60','Internal parity · checked','Budget variance · +₹4L','Approval gate · ON']} footer="Approve compensation to unlock offer" /></div></Shell>;

  return <Shell title="Offer workspace" meta="Compensation approved · ready for human approval"><div className="grid gap-5 xl:grid-cols-[1fr_330px]"><div className="border border-[#e1dfdd] bg-white"><div className="border-b border-[#e1dfdd] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Label t="Offer preview"/><h4 className="mt-2 text-xl font-bold">Vice President — Human Resources</h4><div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#605e5c]"><span>Rhea Malhotra</span><span>·</span><span>Gurgaon · Hybrid</span><span>·</span><span>Start 01 Oct 2026</span></div></div><span className="rounded-sm bg-[#fff4ce] px-2 py-1 text-[9px] font-bold text-[#8a6500]">AWAITING APPROVAL</span></div></div><div className="grid gap-2 p-5 sm:grid-cols-2"><OfferRow label="Fixed compensation" value="₹88,00,000" /><OfferRow label="Target variable" value="₹22,00,000" /><OfferRow label="Target CTC" value="₹1,10,00,000" /><OfferRow label="Notice / joining" value="45 days" /></div><div className="border-t border-[#e1dfdd] p-5"><Label t="Candidate message"/><p className="mt-2 text-xs leading-5 text-[#605e5c]">We are excited to invite you to join the leadership team and build the people function for our next phase of growth.</p></div></div><Panel title="Final release checks" rows={['JD approval · complete','Decision approval · complete','Compensation approval · complete','Offer content · reviewed','Candidate acceptance · pending']} footer="Approve offer to enable sending" /></div></Shell>;
}

function Label({ t }: { t: string }) { return <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#797775]">{t}</div>; }
function Tag({ t }: { t: string }) { return <span className="rounded-sm border border-[#e1dfdd] bg-white px-2 py-1 text-[9px] font-semibold text-[#605e5c]">{t}</span>; }
function Panel({ title, rows, footer }: { title: string; rows: string[]; footer?: string }) { return <div className="border border-[#e1dfdd] bg-white p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#5b2be0]" /><b className="text-xs">{title}</b></div><div className="mt-4 grid gap-2">{rows.map((row) => <div key={row} className="flex gap-2 text-[10px] leading-4 text-[#605e5c]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#107c10]" />{row}</div>)}</div>{footer && <div className="mt-4 border-t border-[#e1dfdd] pt-3 text-[9px] font-bold text-[#5b2be0]">{footer}</div>}</div>; }
function Kpi({ n, l }: { n: string; l: string }) { return <div className="border border-[#e1dfdd] bg-white p-3"><div className="text-lg font-bold text-[#242424]">{n}</div><div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-[#797775]">{l}</div></div>; }
function Avatar({ name }: { name: string }) { return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eee9ff] text-xs font-bold text-[#5b2be0]">{name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>; }
function Source({ brand, icon, people }: { brand: string; icon: string; people: typeof PEOPLE }) { return <div className="overflow-hidden border border-[#d6d3d1] bg-white"><div className="flex items-center gap-3 border-b border-[#e1dfdd] bg-[#faf9f8] p-3"><span className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#242424] text-[10px] font-bold text-white">{icon}</span><div><div className="text-xs font-bold">{brand} search</div><div className="text-[8px] text-[#797775]">Recreated interface · public profile evidence</div></div><span className="ml-auto text-[8px] font-bold text-[#107c10]">SEARCHING</span></div><div className="border-b border-[#e1dfdd] p-3"><div className="flex items-center gap-2 rounded-sm border border-[#d6d3d1] bg-white px-3 py-2 text-[9px] text-[#605e5c]"><Search className="h-3 w-3" />VP HR Gurgaon technology transformation</div><div className="mt-2 flex gap-2"><Tag t="Executive" /><Tag t="15+ years" /><Tag t="Technology" /></div></div><div className="divide-y divide-[#e1dfdd]">{people.map((person) => <div key={person.name} className="p-3"><div className="flex gap-3"><Avatar name={person.name} /><div className="min-w-0"><div className="text-[11px] font-bold">{person.name}</div><div className="mt-0.5 text-[9px] text-[#797775]">{person.role}</div><div className="mt-2 flex items-center gap-2 text-[8px] text-[#605e5c]"><MapPin className="h-3 w-3" />{person.loc}<span>·</span><Globe className="h-3 w-3" />Public profile</div><div className="mt-2 text-[8px] leading-4 text-[#605e5c]">{person.reason}</div></div></div><div className="mt-2 flex items-center justify-between"><span className="text-[8px] font-bold text-[#107c10]">Evidence captured</span><span className="text-[8px] font-semibold text-[#5b2be0]">Open profile →</span></div></div>)}</div></div>; }
function ScoreLine({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between border-b border-[#eeeae6] pb-2"><span className="text-[#605e5c]">{label}</span><b>{value}</b></div>; }
function DecisionCard({ title, value, note }: { title: string; value: string; note: string }) { return <div className="rounded-sm border border-[#e1dfdd] p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-[#797775]">{title}</span><Star className="h-3.5 w-3.5 text-[#5b2be0]" /></div><div className="mt-2 text-xl font-bold">{value}</div><div className="mt-1 text-[9px] leading-4 text-[#797775]">{note}</div></div>; }
function OfferRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between rounded-sm border border-[#e1dfdd] p-3"><span className="text-[10px] text-[#605e5c]">{label}</span><b className="text-xs">{value}</b></div>; }
