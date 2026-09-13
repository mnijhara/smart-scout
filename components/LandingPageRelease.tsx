import React,{useState}from'react';
import{ArrowRight,Check,ChevronRight,KeyRound,Play,ShieldCheck,Sparkles,Users,Layers,Mic,BarChart3,Download}from'lucide-react';
import ByokWidget from'./ByokWidget';
import MagicDemoScreen from'./MagicDemoScreen';

const stages=[
 {name:'Intent',title:'Hiring command',text:'Describe the person you need in plain language. Smart Scout turns the command into a structured hiring context.',signals:['Role: VP HR','Location: Gurgaon','Scale: 1,500 employees']},
 {name:'JD',title:'Job blueprint',text:'AI generates the JD, success profile and observable requirements, then pauses for human review.',signals:['Must-haves extracted','Fairness check passed','Human approval required']},
 {name:'Source',title:'Dual-pipeline sourcing & outreach',text:'Browser-driven LinkedIn/Naukri sourcing, batch resume upload, and personalized multi-channel outreach (InMail, Email, WhatsApp).',signals:['LinkedIn / Naukri sourcing','Batch resume drag-drop','Multi-touch outreach']},
 {name:'Shortlist',title:'Candidate intelligence & battlecards',text:'Rank candidates across skills, domain, role fit, and leadership with knockout criteria and head-to-head comparison battlecards.',signals:['4-dimension scoring','Knockout matrix cleared','Head-to-head battlecards']},
 {name:'Interview',title:'Structured interview & audio co-pilot',text:'Real-time Web Speech dictation co-pilot, 1-to-5 star quantitative competency ratings, and 1-click RFC 5545 .ics dispatch.',signals:['Live audio dictation','1-click .ics calendar','Competency rubric (1-5★)']},
 {name:'Decision',title:'Executive scorecard & decision gate',text:'Generate boardroom-ready executive PDF scorecards with verifiable evidence trails and strict recruiter sign-off.',signals:['Executive PDF export','Verified evidence trail','Human approval gate']},
 {name:'Comp',title:'Compensation curve & equity audit',text:'Benchmark candidate packages against P25-P90 market curves, structure total target cash, and ensure zero protected-class pay variance.',signals:['P25-P90 comp benchmark','TTC incentive modeling','Pay equity verified']},
 {name:'Offer',title:'Offer workspace & send',text:'Full offer letter preview with terms breakdown, equity vesting schedule, and human-gated send workflow.',signals:['Offer letter preview','Terms & conditions','Approval before send']},
 {name:'Engage',title:'Pre-boarding engagement',text:'Structured engagement timeline from offer acceptance to day one — team intros, equipment provisioning, and welcome sequences.',signals:['Engagement milestones','Channel-specific touches','Owner assignments']},
 {name:'Onboard',title:'90-day onboarding runway',text:'Phase-based onboarding plan with HRIS setup, IT provisioning, manager handoff, and 30-60-90 day success checkpoints.',signals:['HRIS & IT setup','Manager onboarding','30-60-90 day plan']}
];

export default function LandingPageRelease({onStart}:{onStart:()=>void}){
 const[stage,setStage]=useState(0);const[sheet,setSheet]=useState(false);const current=stages[stage];
 return <div className="min-h-screen bg-[#fafbff] text-slate-950">
  <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6"><a href="/" aria-label="Smart Scout home"><img src="/brand/smartscout-logo.svg" alt="Smart Scout" className="h-10 w-auto"/></a><div className="ml-auto flex items-center gap-2"><button onClick={()=>setSheet(true)} className="hidden rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-black sm:inline-flex"><Play className="mr-1.5 h-3.5 w-3.5"/>See the workflow</button><button onClick={onStart} className="rounded-lg bg-slate-950 px-4 py-2.5 text-[11px] font-black text-white">Start hiring</button></div></div></header>
  <ByokWidget placement="top"/>
  <main>
   <section className="border-b border-slate-200/80 bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-12 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:pb-16 lg:pt-16"><div><div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-violet-700"><Sparkles className="h-3.5 w-3.5"/>AI hiring operating system</div><h1 className="mt-5 max-w-3xl text-5xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl lg:text-[72px]">From hiring intent<br/><span className="text-violet-600">to the right hire.</span></h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">Smart Scout turns one hiring command into a connected workflow — role design, sourcing, evidence, interviews, decisions, compensation and offers — with humans in control.</p><div className="mt-6 flex flex-col gap-2.5 sm:flex-row"><button onClick={()=>setSheet(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-violet-200"><Play className="h-3.5 w-3.5 fill-current"/>See the magic demo</button><button onClick={onStart} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-xs font-black">Bring a real hiring need<ArrowRight className="h-3.5 w-3.5"/></button></div></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/50"><div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">Fictional product simulation</div><div className="mt-1 text-sm font-black">VP HR · Gurgaon</div></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black text-violet-700">DEMO DATA</span></div><div className="mt-4 flex gap-1 overflow-x-auto pb-1">{stages.map((s,i)=><button key={s.name} onClick={()=>setStage(i)} className={`shrink-0 rounded-lg px-3 py-2 text-[9px] font-black uppercase ${i===stage?'bg-violet-600 text-white':'bg-slate-50 text-slate-500'}`}>{String(i+1).padStart(2,'0')} {s.name}</button>)}</div><div className="mt-3"><MagicDemoScreen stage={stage}/></div><div className="mt-3 flex items-center justify-between"><button disabled={!stage} onClick={()=>setStage(v=>v-1)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black disabled:opacity-30">Back</button><button onClick={()=>stage===stages.length-1?setSheet(true):setStage(v=>v+1)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-[10px] font-black text-white">{stage===stages.length-1?'Open full demo':'Next screen'}<ChevronRight className="h-3 w-3"/></button></div></div>
   </div></section>
   <section className="border-b border-slate-200/80 bg-slate-50"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Trust icon={<KeyRound/>} title="Bring your own AI (BYOK)" text="Use Gemini, OpenAI or Anthropic with your own key. Enterprise data and usage stay on your provider account."/><Trust icon={<ShieldCheck/>} title="Evidence-first dual sourcing" text="Playwright browser sourcing on LinkedIn/Naukri + drag-and-drop batch resume upload with source attribution."/><Trust icon={<Users/>} title="Human control at every gate" text="JD, interview, decision, compensation, offer, and onboarding actions remain approval-driven. AI prepares; humans decide."/><Trust icon={<Layers/>} title="Pipeline Kanban & Battlecards" text="Interactive Kanban stage board with head-to-head candidate battlecards and strategic AI trade-off synthesis."/><Trust icon={<Mic/>} title="Live Audio Interview Co-pilot" text="Real-time Web Speech dictation co-pilot, 1-click RFC 5545 .ics calendar dispatch, and WhatsApp invites."/><Trust icon={<BarChart3/>} title="P25–P90 Compensation Curve" text="Benchmark base and total target cash against market percentile distributions with pay equity audit compliance."/></div></div></section>
   <section className="border-y border-slate-200/80 bg-slate-50/50 py-6">
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
     <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
      <div className="border-r border-slate-200/80 last:border-0"><div className="text-2xl font-black text-violet-700">94%</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Match Precision</div></div>
      <div className="border-r border-slate-200/80 last:border-0"><div className="text-2xl font-black text-slate-900">1.2 Days</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Time to Decision</div></div>
      <div className="border-r border-slate-200/80 last:border-0"><div className="text-2xl font-black text-emerald-600">0% Agency Fees</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Direct BYOK Model</div></div>
      <div><div className="text-2xl font-black text-indigo-600">100%</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Human Gated Decisions</div></div>
     </div>
    </div>
   </section>
   <RoiCalculator onStart={onStart}/>
   <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 sm:p-8"><div className="max-w-3xl"><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-700">Enterprise Recruiting OS</div><h2 className="mt-2 text-3xl font-black tracking-tight">From hiring intent to offer and day-1 onboarding.</h2><p className="mt-3 text-sm leading-6 text-slate-600">The JD is the central hiring object. Every candidate sourcing run, audio interview scorecard, human decision gate, compensation benchmark, and onboarding plan is tied back to the same role requirements and verifiable evidence trail.</p></div><button onClick={onStart} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-black text-white">Run a real hiring need<ArrowRight className="h-3.5 w-3.5"/></button></div></section>
  </main>
  <footer className="border-t border-slate-200 bg-white py-12 text-slate-600">
   <div className="mx-auto max-w-7xl px-4 sm:px-6">
    <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
     <div>
      <img src="/brand/smartscout-logo.svg" alt="Smart Scout" className="h-8 w-auto mb-3"/>
      <p className="text-xs leading-5 text-slate-500">Autonomous AI recruiting operating system with verifiable evidence trails and human-in-the-loop governance.</p>
      <div className="mt-4 flex items-center gap-2">
       <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>
       <span className="text-[10px] font-bold text-slate-500">Hostinger Edge Production Online</span>
      </div>
     </div>
     <div>
      <div className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3">Lifecycle Engine</div>
      <ul className="space-y-2 text-xs">
       <li><button onClick={onStart} className="hover:text-violet-600 transition">Dual-Pipeline Sourcing</button></li>
       <li><button onClick={onStart} className="hover:text-violet-600 transition">Candidate Battlecards</button></li>
       <li><button onClick={onStart} className="hover:text-violet-600 transition">Audio Interview Co-pilot</button></li>
       <li><button onClick={onStart} className="hover:text-violet-600 transition">P25–P90 Compensation Curve</button></li>
       <li><button onClick={onStart} className="hover:text-violet-600 transition">90-Day Onboarding Runway</button></li>
      </ul>
     </div>
     <div>
      <div className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3">Governance & Trust</div>
      <ul className="space-y-2 text-xs">
       <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-violet-600"/>Human Approval Gates</li>
       <li className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 text-violet-600"/>BYOK Key Vault</li>
       <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600"/>Zero Data Retention</li>
       <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600"/>EEOC & Pay Equity Audited</li>
      </ul>
     </div>
     <div>
      <div className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3">Getting Started</div>
      <p className="text-xs text-slate-500 mb-3">Launch your next role mandate in under 60 seconds with your preferred model provider.</p>
      <button onClick={onStart} className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white hover:bg-violet-700 shadow-sm transition">Launch Role Workspace →</button>
     </div>
    </div>
    <div className="mt-8 border-t border-slate-100 pt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
     <div>© {new Date().getFullYear()} Smart Scout Recruiting OS. All rights reserved.</div>
     <div className="flex gap-4 font-semibold">
      <span>SOC2 Type II Ready</span>
      <span>•</span>
      <span>GDPR Compliant</span>
      <span>•</span>
      <span>RFC 5545 Calendar Integration</span>
     </div>
    </div>
   </div>
  </footer>
  {sheet&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md" onClick={()=>setSheet(false)}><div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-violet-600">Smart Scout · product simulation</div><div className="mt-1 text-sm font-black">Full hiring journey · fictional demo data</div></div><button onClick={()=>setSheet(false)} aria-label="Close demo" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black">Close</button></div><div className="grid lg:grid-cols-[210px_1fr]"><aside className="border-b border-slate-100 p-3 lg:border-b-0 lg:border-r">{stages.map((s,i)=><button key={s.name} onClick={()=>setStage(i)} className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-black ${i===stage?'bg-violet-600 text-white':'text-slate-500 hover:bg-slate-50'}`}><span>{String(i+1).padStart(2,'0')}</span>{s.name}<ChevronRight className="ml-auto h-3 w-3"/></button>)}</aside><div className="p-6 sm:p-8"><div className="text-[9px] font-black uppercase tracking-widest text-violet-600">Screen {stage+1} of {stages.length}</div><h3 className="mt-2 text-2xl font-black">{current.title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{current.text}</p><div className="mt-6"><MagicDemoScreen stage={stage}/></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{current.signals.map(x=><div key={x} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Check className="h-4 w-4"/></div><div className="mt-3 text-xs font-black">{x}</div></div>)}</div><div className="mt-8 flex justify-between"><button disabled={!stage} onClick={()=>setStage(v=>v-1)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black disabled:opacity-30">Back</button><button onClick={()=>stage===stages.length-1?onStart():setStage(v=>v+1)} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-black text-white">{stage===stages.length-1?'Use your own hiring need':'Next screen'}<ArrowRight className="h-3.5 w-3.5"/></button></div></div></div></div></div>}
 </div>
}
function Trust({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">{icon}</div><div className="mt-3 text-xs font-black">{title}</div><p className="mt-1 text-[10px] leading-4 text-slate-500">{text}</p></div>}
function RoiCalculator({onStart}:{onStart:()=>void}){
 const[hires,setHires]=useState(12);const[salary,setSalary]=useState(24);
 const agencyCost=hires*(salary*100000)*0.20;
 const smartScoutCost=hires*500;
 const netSavings=agencyCost-smartScoutCost;
 const daysSaved=hires*38;
 return <section className="border-b border-slate-200/80 bg-white py-14 sm:py-16"><div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-700">Interactive ROI Calculator</div><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Stop paying 20% agency fees.<br/><span className="text-violet-600">Own your hiring pipeline.</span></h2><p className="mt-3 text-sm leading-6 text-slate-500">Recruitment agencies charge 20–25% of annual compensation for basic keyword search. Smart Scout gives your in-house team elite sourcing, structured audio interviews, and automated scorecard debriefs with zero agency markups.</p><div className="mt-6 space-y-4"><div><div className="flex justify-between text-xs font-bold text-slate-700"><span>Planned Hires per Year</span><span className="text-violet-700 font-black">{hires} hires</span></div><input type="range" min="1" max="50" value={hires} onChange={e=>setHires(Number(e.target.value))} className="mt-2 w-full accent-violet-600 cursor-pointer"/></div><div><div className="flex justify-between text-xs font-bold text-slate-700"><span>Average Annual Compensation</span><span className="text-violet-700 font-black">₹{salary}L / role</span></div><input type="range" min="6" max="100" step="2" value={salary} onChange={e=>setSalary(Number(e.target.value))} className="mt-2 w-full accent-violet-600 cursor-pointer"/></div></div></div><div className="rounded-3xl border border-violet-200 bg-violet-50/70 p-6 shadow-xl shadow-violet-100/50 sm:p-8"><div className="text-[10px] font-black uppercase tracking-widest text-violet-700">Estimated Annual Impact</div><div className="mt-4 grid grid-cols-2 gap-4"><div className="rounded-2xl border border-rose-200/70 bg-white p-4"><div className="text-[10px] font-bold text-rose-500 uppercase">Agency Spend (20%)</div><div className="mt-1 text-2xl font-black text-rose-600">₹{(agencyCost/100000).toFixed(1)}L</div><div className="mt-1 text-[9px] text-slate-400">Paid out to external recruiters</div></div><div className="rounded-2xl border border-emerald-200 bg-white p-4"><div className="text-[10px] font-bold text-emerald-600 uppercase">Smart Scout BYOK</div><div className="mt-1 text-2xl font-black text-emerald-700">₹{(smartScoutCost/100000).toFixed(2)}L</div><div className="mt-1 text-[9px] text-slate-400">Direct provider LLM token fees</div></div></div><div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white"><div className="flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Net Cash Savings</div><div className="text-3xl font-black tracking-tight">₹{(netSavings/100000).toFixed(1)} Lakhs</div></div><div className="text-right"><div className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Time Saved</div><div className="text-2xl font-black">{daysSaved} days</div></div></div></div><button onClick={onStart} className="mt-5 w-full rounded-2xl bg-slate-950 py-3.5 text-center text-xs font-black text-white hover:bg-slate-900 transition">Start hiring with zero agency markups →</button></div></div></div></section>
}
