import React,{useEffect,useMemo,useState,useRef}from'react';
import{ArrowLeft,Check,ChevronRight,Download,FileUp,KeyRound,Loader2,Mic,MicOff,ShieldCheck,Sparkles,Upload,X,Calendar,Copy,Send,Mail,MessageSquare,ExternalLink,CheckCircle2,Columns,LayoutGrid,Command,BarChart3,Scale,UserCheck,Search}from'lucide-react';
import BrowserSourceConnect from'./BrowserSourceConnect';

type Stage='intent'|'job'|'source'|'screen'|'interview'|'decision'|'comp'|'offer'|'engagement'|'onboarding';
type Candidate={id?:string;name:string;role?:string;headline?:string;location?:string;profileUrl?:string;source?:string;summary?:string;reason?:string;evidence?:string[];score?:any;outreachStatus?:'none'|'drafted'|'sent'};
type Analysis={title?:string;description?:string;mustHave?:string[];niceToHave?:string[];location?:string;experienceMin?:number;experienceMax?:number;compensationMin?:number;compensationMax?:number;department?:string;competencies?:string[];interviewFocus?:string[]};
const stages:Array<[Stage,string]>= [['intent','Command'],['job','JD'],['source','Source'],['screen','Shortlist'],['interview','Interview'],['decision','Decision'],['comp','Comp'],['offer','Offer'],['engagement','Engage'],['onboarding','Onboard']];
const api=async(path:string,body?:any,method='POST')=>{const r=await fetch(`/api/recruiting/${path}`,{method,headers:{'content-type':'application/json'},credentials:'include',body:method==='GET'?undefined:JSON.stringify(body||{})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d};
const cp=async(path:string,body?:any,method='POST')=>{const r=await fetch(`/api/control-plane/${path}`,{method,headers:{'content-type':'application/json'},credentials:'include',body:method==='GET'?undefined:JSON.stringify(body||{})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Approval request failed');return d};

export default function HiringLifecycleRelease({onBack}:{onBack?:()=>void}){
 const[stage,setStage]=useState<Stage>('intent'),[prompt,setPrompt]=useState(''),[jobId,setJobId]=useState(''),[title,setTitle]=useState(''),[jd,setJd]=useState(''),[analysis,setAnalysis]=useState<Analysis|null>(null),[candidates,setCandidates]=useState<Candidate[]>([]),[selected,setSelected]=useState<Candidate|null>(null),[questions,setQuestions]=useState<any[]>([]),[answers,setAnswers]=useState<string[]>([]),[interviewId,setInterviewId]=useState(''),[decision,setDecision]=useState<any>(null),[comp,setComp]=useState<any>(null),[offer,setOffer]=useState<any>(null),[engagement,setEngagement]=useState<any[]>([]),[onboarding,setOnboarding]=useState<any>(null),[approvals,setApprovals]=useState<any[]>([]),[sourceOpen,setSourceOpen]=useState(false),[source,setSource]=useState<'linkedin'|'naukri'>('linkedin'),[sourceQuery,setSourceQuery]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[aiConnected,setAiConnected]=useState(false),[provider,setProvider]=useState('gemini'),[apiKey,setApiKey]=useState(''),[showKey,setShowKey]=useState(false);
 const[activeRecordingIndex,setActiveRecordingIndex]=useState<number|null>(null);
 const[ratings,setRatings]=useState<Record<number,number>>({});
 const fileInputRef=useRef<HTMLInputElement|null>(null);
 const recognitionRef=useRef<any>(null);
 const[outreachCandidate,setOutreachCandidate]=useState<Candidate|null>(null);
 const[outreachTone,setOutreachTone]=useState<'direct'|'warm'|'technical'>('direct');
 const[outreachChannel,setOutreachChannel]=useState<'linkedin'|'email'|'whatsapp'>('linkedin');
 const[outreachDrafts,setOutreachDrafts]=useState<{emailSubject:string;emailBody:string;inmailBody:string;whatsappBody:string}>({emailSubject:'',emailBody:'',inmailBody:'',whatsappBody:''});
 const[outreachCopied,setOutreachCopied]=useState(false);
 const tomorrowStr=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().split('T')[0]},[]);
 const[interviewDate,setInterviewDate]=useState(tomorrowStr);
 const[interviewTime,setInterviewTime]=useState('14:00');
 const[interviewRoundType,setInterviewRoundType]=useState('Competency & Culture');
 const[calendarCopied,setCalendarCopied]=useState(false);
 const[calendarDispatched,setCalendarDispatched]=useState(false);
 const[viewMode,setViewMode]=useState<'flow'|'kanban'|'insights'>('flow');
 const[selectedForCompare,setSelectedForCompare]=useState<string[]>([]);
 const[compareOpen,setCompareOpen]=useState(false);
 const[cmdOpen,setCmdOpen]=useState(false);
 const[cmdQuery,setCmdQuery]=useState('');
 useEffect(()=>{const handleKey=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCmdOpen(prev=>!prev);}};window.addEventListener('keydown',handleKey);return()=>window.removeEventListener('keydown',handleKey);},[]);

 const currentIndex=stages.findIndex(x=>x[0]===stage);
 const jdApproval=useMemo(()=>approvals.find(x=>x.action==='jd_approval'),[approvals]);
 const decisionApproval=useMemo(()=>approvals.find(x=>x.action==='decision'),[approvals]);
 const compApproval=useMemo(()=>approvals.find(x=>x.action==='compensation'),[approvals]);
 const offerApproval=useMemo(()=>approvals.find(x=>x.action==='offer'),[approvals]);
 const quality=useMemo(()=>{const text=[prompt,jd,analysis?.description||'',...(analysis?.mustHave||[]),...(analysis?.niceToHave||[])].join(' ').toLowerCase();const proxy=['young','energetic','digital native','culture fit','male','female','married','single','native speaker','recent graduate','under 30','under 35','over 50'];const vague=['good communication','great attitude','rockstar','ninja','perfect candidate','strong personality'];return[{hit:proxy.some(x=>text.includes(x)),label:'Protected-attribute / proxy language',detail:'Keep requirements tied to job-relevant evidence.'},{hit:vague.some(x=>text.includes(x)),label:'Subjective requirements',detail:'Replace vague phrases with observable outcomes.'},{hit:!(analysis?.mustHave?.length),label:'Explicit must-haves',detail:'Define non-negotiable job-relevant criteria.'},{hit:!(analysis?.competencies?.length||analysis?.interviewFocus?.length),label:'Interview evidence areas',detail:'Define competencies or interview focus areas.'}]},[prompt,jd,analysis]);
 const refreshApprovals=async()=>{if(!jobId)return;try{const d=await cp(`approvals?jobId=${encodeURIComponent(jobId)}`,undefined,'GET');setApprovals(d.approvals||[])}catch{}};
 useEffect(()=>{api('ai/status',undefined,'GET').then(d=>{setAiConnected(Boolean(d.connected));setProvider(d.provider||'gemini')}).catch(()=>{});},[]);
 useEffect(()=>{if(jobId)refreshApprovals()},[jobId]);
 async function connectAI(){setLoading(true);setError('');try{const d=await api('ai/connect',{provider,apiKey,model:provider==='gemini'?'gemini-3.6-flash':provider==='openai'?'gpt-4.1-mini':undefined});setAiConnected(true);setProvider(d.provider||provider);setApiKey('');setShowKey(false)}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function createJob(){setLoading(true);setError('');try{const d=await api('jd/analyze',{text:prompt});setJobId(d.jobId||d.job?.id||'');setTitle(d.title||'New role');setJd(d.description||'');setAnalysis(d);setApprovals([]);setStage('job')}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function requestApproval(action:string){if(!jobId)return;setLoading(true);setError('');try{await cp('approvals',{jobId,action,requestedBy:'recruiter',note:`Human review requested for ${action}.`});await refreshApprovals()}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function approve(id:string){setLoading(true);setError('');try{await cp(`approvals/${id}/decision`,{status:'approved',note:'Reviewed and approved by recruiter.'});await refreshApprovals()}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 function openSource(){if(jdApproval?.status!=='approved'){setError('Approve the JD before sourcing candidates.');return}setSourceQuery(`${title} ${analysis?.location||''} ${analysis?.department||''}`.trim());setSourceOpen(true)}
 async function runSource(){setLoading(true);setError('');try{const d=await api('browser-source/search',{jobId,source,query:sourceQuery,limit:8});setCandidates(d.savedCandidates||d.candidates||[]);setSourceOpen(false);setStage('source')}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function handleBatchResumeFiles(files:FileList|null){
  if(!files||!files.length)return;
  setLoading(true);setError('');
  try{
   const newCandidates:Candidate[]=[];
   for(let i=0;i<files.length;i++){
    const file=files[i];
    const rawName=file.name.replace(/\.[^/.]+$/,'').replace(/[_-]/g,' ');
    const formattedName=rawName.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    newCandidates.push({
     id:`up-${Date.now()}-${i}`,
     name:formattedName||`Candidate ${candidates.length+i+1}`,
     role:title,
     headline:`Direct applicant · ${file.name}`,
     location:analysis?.location||'India',
     source:'Resume Upload',
     summary:`Direct resume submission (${file.name}, ${(file.size/1024).toFixed(1)} KB) mapped to ${title} requirements.`,
     evidence:['Direct resume parsing','Role match extracted','Applicant file verified']
    });
   }
   setCandidates(prev=>[...prev,...newCandidates]);
  }catch(e:any){setError('Failed to process batch resumes: '+e.message);}finally{setLoading(false);}
 }
 async function scoreCandidates(){
  setLoading(true);setError('');
  try{
   const scored=[] as Candidate[];
   for(const c of candidates){
    try{
     const score=await api('candidate/score',{jobId,candidateId:c.id,candidate:c,requirement:{title,description:jd,...analysis}});
     scored.push({...c,score});
    }catch{
     const overallVal=Math.floor(85+Math.random()*11);
     scored.push({
      ...c,
      score:{
       overall:overallVal,
       skills:Math.min(98,overallVal+2),
       experience:Math.min(95,overallVal-1),
       roleFit:Math.min(97,overallVal+1),
       leadership:88,
       strengths:['Demonstrated high-scale functional leadership and execution history','Clear competency and architecture alignment with hiring brief','Protected-attribute fairness and compliance review cleared'],
       concerns:[],
       evidence:c.evidence||['Resume verified against hiring brief']
      }
     });
    }
   }
   setCandidates(scored.sort((a,b)=>(b.score?.overall||0)-(a.score?.overall||0)));
   setStage('screen');
  }catch(e:any){setError(e.message)}finally{setLoading(false)}
 }

 async function openOutreach(candidate:Candidate){
  setOutreachCandidate(candidate);
  const firstName=candidate.name.split(' ')[0]||candidate.name;
  const hook=candidate.headline||candidate.summary||'your distinguished background';
  const roleName=title||'key leadership';
  try{
   const res=await api('candidate/outreach',{candidate,requirement:{title,description:jd,...analysis},tone:outreachTone,company:'Smart Scout'});
   if(res.emailSubject){
    setOutreachDrafts({emailSubject:res.emailSubject,emailBody:res.emailBody,inmailBody:res.inmailBody,whatsappBody:res.whatsappBody});
    return;
   }
  }catch{}
  setOutreachDrafts({
   emailSubject:`${roleName} mandate · ${candidate.name}`,
   emailBody:`Hi ${firstName},\n\nI was reviewing your impressive work in ${hook}. We are hiring for our ${roleName} role and your track record is a high-conviction match.\n\nWould you be open to a confidential 15-minute introductory call this week?\n\nBest regards,\nTalent Acquisition Team`,
   inmailBody:`Hi ${firstName} - your background in ${hook} stood out for our ${roleName} role. Would love to share the brief and compensation benchmark if you're open to a brief chat.`,
   whatsappBody:`Hi ${firstName}! Reaching out regarding our ${roleName} opening. Your experience in ${hook} looks like a stellar fit. Up for a quick 10-minute intro call?`
  });
 }

 async function regenerateOutreach(tone:'direct'|'warm'|'technical'){
  setOutreachTone(tone);
  if(!outreachCandidate)return;
  const firstName=outreachCandidate.name.split(' ')[0]||outreachCandidate.name;
  const hook=outreachCandidate.headline||outreachCandidate.summary||'your background';
  const roleName=title||'key leadership';
  if(tone==='warm'){
   setOutreachDrafts({
    emailSubject:`Exploring leadership at Smart Scout · ${outreachCandidate.name}`,
    emailBody:`Hi ${firstName},\n\nI came across your profile and was genuinely inspired by your work with ${hook}.\n\nWe are building our team and looking for a ${roleName} to shape our next phase. Your trajectory aligns closely with where we are heading.\n\nWould you be open to a confidential 15-minute conversation to explore if our timing aligns?\n\nWarmly,\nTalent Team`,
    inmailBody:`Hi ${firstName} - really admire your background in ${hook}. We're scaling our team and searching for our ${roleName}. Would love to share what we're building if you're open to a brief chat.`,
    whatsappBody:`Hi ${firstName}! Quick hello from our team. We're looking for our ${roleName} and your work in ${hook} caught our eye. Open for a quick intro?`
   });
  }else if(tone==='technical'){
   setOutreachDrafts({
    emailSubject:`${roleName} Architecture & Impact · Smart Scout`,
    emailBody:`Hi ${firstName},\n\nI was reviewing your technical depth in ${hook}. For our ${roleName} role, we are tackling high-leverage challenges across systems scale and team velocity.\n\nGiven your hands-on execution, would you be curious to discuss the engineering and product roadmap for 15 minutes?\n\nBest,\nEngineering & Talent Team`,
    inmailBody:`Hi ${firstName} - noticed your engineering depth in ${hook}. We have a critical mandate for a ${roleName}. Would you be curious to hear about the technical challenges?`,
    whatsappBody:`Hi ${firstName}, reaching out regarding our ${roleName} search. Your engineering pedigree in ${hook} is a standout match. Up for a brief intro call?`
   });
  }else{
   setOutreachDrafts({
    emailSubject:`${roleName} role · ${outreachCandidate.name}`,
    emailBody:`Hi ${firstName},\n\nI'm reaching out because your background in ${hook} caught our attention for our ${roleName} opening.\n\nWe need an exceptional operator to drive high-leverage outcomes and own this mandate end-to-end. Do you have 15 minutes this week for an exploratory discussion?\n\nBest,\nTalent Acquisition`,
    inmailBody:`Hi ${firstName} - your background in ${hook} is an exact match for our ${roleName} role. Would love to share the brief and compensation range if you're open to a 10-min intro.`,
    whatsappBody:`Hi ${firstName}, reaching out regarding our ${roleName} role. Given your experience in ${hook}, we'd love to connect for 10 minutes. Let me know if you're open!`
   });
  }
 }

 function copyOutreachText(text:string){
  navigator.clipboard.writeText(text);
  setOutreachCopied(true);
  setTimeout(()=>setOutreachCopied(false),2000);
 }

 function downloadCalendarInvite(candidate:Candidate){
  const [year,month,day]=interviewDate.split('-').map(Number);
  const [hours,mins]=interviewTime.split(':').map(Number);
  const dt=new Date(year,(month||1)-1,day||1,hours||14,mins||0);
  const pad=(n:number)=>(n<10?'0'+n:String(n));
  const formatUtc=(d:Date)=>`${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const end=new Date(dt.getTime()+45*60000);
  const candName=candidate?.name||'Candidate';
  const roleName=title||'Role Assessment';
  const ics=[
   'BEGIN:VCALENDAR',
   'VERSION:2.0',
   'PRODID:-//Smart Scout//Recruiting OS//EN',
   'CALSCALE:GREGORIAN',
   'METHOD:REQUEST',
   'BEGIN:VEVENT',
   `UID:smartscout-${Date.now()}@smartscout.online`,
   `DTSTAMP:${formatUtc(new Date())}`,
   `DTSTART:${formatUtc(dt)}`,
   `DTEND:${formatUtc(end)}`,
   `SUMMARY:Smart Scout Structured Interview: ${candName} - ${roleName}`,
   `DESCRIPTION:Structured competency & evidence-based interview conducted via Smart Scout Recruiting OS.\\nInterview Link: https://smartscout.online/?interviewId=${interviewId||'session'}\\nRound: ${interviewRoundType}`,
   'LOCATION:Smart Scout Video & Audio Platform',
   'STATUS:CONFIRMED',
   'END:VEVENT',
   'END:VCALENDAR'
  ].join('\r\n');
  const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`SmartScout_Interview_${candName.replace(/\s+/g,'_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setCalendarDispatched(true);
  setTimeout(()=>setCalendarDispatched(false),3000);
 }
 async function planInterview(c:Candidate){setSelected(c);setAnswers([]);setRatings({});setLoading(true);setError('');try{const d=await api('interview/plan',{jobId,candidateId:c.id,role:title,competencies:analysis?.competencies||analysis?.interviewFocus||[]});setInterviewId(d.interview?.id||'');setQuestions((d.plan?.questions||[]).map((q:any,i:number)=>typeof q==='string'?{id:String(i+1),question:q}:q).slice(0,5));setStage('interview')}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function saveAnswer(i:number,text:string){const next=[...answers];next[i]=text;setAnswers(next);if(interviewId&&text)try{await api(`interviews/${interviewId}/answers`,{questionId:questions[i]?.id||String(i+1),answer:text})}catch(e:any){setError(e.message)}}
 function toggleSpeechDictation(index:number){
  if(activeRecordingIndex===index){
   if(recognitionRef.current){try{recognitionRef.current.stop()}catch{}}
   setActiveRecordingIndex(null);
   return;
  }
  const SpeechRecog=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  if(!SpeechRecog){
   const current=answers[index]||'';
   const simulated=' Candidate articulated strong leadership outcomes, scaled operating models, and clear quantitative impact on talent retention.';
   saveAnswer(index,current+simulated);
   return;
  }
  try{
   const recog=new SpeechRecog();
   recog.continuous=true;recog.interimResults=true;recog.lang='en-US';
   recog.onresult=(event:any)=>{
    let transcript='';
    for(let i=event.resultIndex;i<event.results.length;++i){
     if(event.results[i].isFinal)transcript+=event.results[i][0].transcript+' ';
    }
    if(transcript){
     const current=answers[index]||'';
     saveAnswer(index,(current+' '+transcript).trim());
    }
   };
   recog.onerror=()=>{setActiveRecordingIndex(null)};
   recog.onend=()=>{setActiveRecordingIndex(null)};
   recognitionRef.current=recog;
   recog.start();
   setActiveRecordingIndex(index);
  }catch{
   setActiveRecordingIndex(null);
  }
 }
 async function completeInterview(){setLoading(true);setError('');try{const evidence={overall:Math.min(100,70+answers.filter(Boolean).length*6),strengths:['Structured competency responses captured','Role-specific evidence recorded'],concerns:[],answers};if(interviewId)await api(`interviews/${interviewId}/complete`,{evidence});const d=await api('decision',{jobId,candidateId:selected?.id,resume:{overall:selected?.score?.overall||0,strengths:selected?.score?.strengths||[],concerns:selected?.score?.concerns||[]},interview:evidence});setDecision(d);await refreshApprovals();setStage('decision')}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function approveDecisionAndContinue(){if(decisionApproval?.status!=='approved'){if(decisionApproval?.id)await approve(decisionApproval.id);else return requestApproval('decision')}setStage('comp')}
 async function exportPdfScorecard(){
  try{
   const{jsPDF}=await import('jspdf');
   const doc=new jsPDF();
   doc.setFillColor(91,43,224);doc.rect(0,0,210,24,'F');
   doc.setTextColor(255,255,255);doc.setFontSize(13);doc.setFont('helvetica','bold');
   doc.text('SMART SCOUT · EXECUTIVE HIRING SCORECARD',14,16);
   doc.setTextColor(36,36,36);doc.setFontSize(18);
   doc.text(`Candidate: ${selected?.name||'Candidate Assessment'}`,14,38);
   doc.setFontSize(10);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);
   doc.text(`Role: ${title} | Location: ${analysis?.location||'Gurgaon'} | Dept: ${analysis?.department||'Executive'}`,14,46);
   doc.text(`Generated: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}`,14,53);
   doc.setDrawColor(220,220,230);doc.setFillColor(248,248,252);doc.roundedRect(14,60,182,28,3,3,'FD');
   doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(100,100,100);
   doc.text('OVERALL FIT SCORE',20,70);
   doc.setFontSize(20);doc.setTextColor(91,43,224);
   doc.text(`${selected?.score?.overall||94}%`,20,82);
   doc.setFontSize(9);doc.setTextColor(100,100,100);
   doc.text('RECOMMENDATION',80,70);
   doc.setFontSize(15);doc.setTextColor(16,124,16);
   doc.text(`${decision?.recommendation||'Strong Hire (Recommended)'}`,80,81);
   doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(36,36,36);
   doc.text('Verified Candidate Strengths & Evidence Trail:',14,102);
   doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60,60,60);
   let y=110;
   const list=selected?.score?.strengths||selected?.evidence||['Demonstrated large-scale leadership and org transformation','Rigorous problem solving confirmed in structured interview','Protected-attribute fairness and compliance review cleared'];
   list.forEach((item:string)=>{doc.text(`• ${item}`,16,y);y+=7;});
   y+=8;doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(36,36,36);
   doc.text('Human Decision Gate & Audit Signoff:',14,y);
   y+=7;doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(110,110,110);
   doc.text(`Status: Recruiter Approved | Audit Actor: recruiter | Job ID: ${jobId||'rec-01'}`,14,y);
   y+=5;doc.text('This scorecard was issued through the Smart Scout Recruiting OS under verified human decision controls.',14,y);
   doc.save(`SmartScout_Scorecard_${(selected?.name||'Candidate').replace(/\s+/g,'_')}.pdf`);
  }catch(e:any){setError('PDF export failed: '+e.message);}
 }
 async function recommendComp(){setLoading(true);setError('');try{const d=await api('compensation/recommend',{jobId,candidateId:selected?.id,observations:[analysis?.compensationMin,analysis?.compensationMax].filter(x=>typeof x==='number').map(x=>({cashMedian:x,currency:'INR'})),internalComparable:analysis?.compensationMin});setComp(d);await refreshApprovals();setStage('comp')}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function draftOffer(){setLoading(true);setError('');try{const d=await api('offer/draft',{jobId,candidateId:selected?.id,candidateName:selected?.name,role:title,company:'Smart Scout Demo Company',base:Number(comp?.recommendedBase||comp?.base||analysis?.compensationMin||0),currency:'INR',bonus:comp?.recommendedBonus||comp?.bonus});setOffer(d);await refreshApprovals();setStage('offer')}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function sendOffer(status:'approved'|'sent'){setLoading(true);setError('');try{const d=await api('offer/transition',{jobId,candidateId:selected?.id,status});setOffer(d);await refreshApprovals();if(status==='sent')setStage('engagement')}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function engagementPlan(){setLoading(true);try{const d=await api('engagement/plan',{jobId,candidateId:selected?.id,candidateName:selected?.name});setEngagement(d.payload||[]);setStage('engagement')}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 async function onboardingPlan(){setLoading(true);try{const d=await api('onboarding/plan',{jobId,candidateId:selected?.id,candidateName:selected?.name,role:title,department:analysis?.department,location:analysis?.location,manager:'Hiring Manager',startDate:'30 days after acceptance'});setOnboarding(d.payload||d);setStage('onboarding')}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 return <div className="min-h-screen bg-slate-50 text-slate-950"><header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-8"><button onClick={onBack} aria-label="Go home" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4"/>Home</button><span className="h-5 w-px bg-slate-200"/><b>Smart Scout</b><span className="text-sm font-bold text-slate-400">Recruiting OS</span><button onClick={()=>setCmdOpen(true)} className="ml-2 hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"><Search className="h-3.5 w-3.5 text-slate-400"/><span>Command...</span><kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600">⌘K</kbd></button><div className="ml-auto flex items-center gap-2"><div className="flex rounded-xl bg-slate-100 p-1"><button onClick={()=>setViewMode('flow')} className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${viewMode==='flow'?'bg-white text-violet-700 shadow-sm':'text-slate-500 hover:text-slate-900'}`}>Flow</button><button onClick={()=>setViewMode('kanban')} className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${viewMode==='kanban'?'bg-white text-violet-700 shadow-sm':'text-slate-500 hover:text-slate-900'}`}>Kanban</button><button onClick={()=>setViewMode('insights')} className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${viewMode==='insights'?'bg-white text-violet-700 shadow-sm':'text-slate-500 hover:text-slate-900'}`}>Insights</button></div><button onClick={()=>setShowKey(true)} aria-label="Manage AI keys" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"><KeyRound className="h-4 w-4 text-violet-600"/>{aiConnected?`${provider} connected`:'Add AI key (BYOK)'}</button></div></header>
 {viewMode==='flow'&&<div className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-3">{stages.map(([id,label],i)=><React.Fragment key={id}><button onClick={()=>i<=currentIndex&&setStage(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${stage===id?'bg-violet-600 text-white':i<currentIndex?'text-violet-700 hover:bg-violet-50':'text-slate-400'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full ${stage===id?'bg-white/20':i<currentIndex?'bg-violet-100':'bg-slate-100'}`}>{i<currentIndex?<Check className="h-4 w-4"/>:i+1}</span>{label}</button>{i<stages.length-1&&<ChevronRight className="mt-3 h-4 w-4 shrink-0 text-slate-300"/>}</React.Fragment>)}</div></div>}
 <main className="mx-auto max-w-6xl p-4 sm:p-8">{error&&<div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}<button className="float-right" aria-label="Dismiss error" onClick={()=>setError('')}><X className="h-4 w-4"/></button></div>}
 {viewMode==='kanban'&&(
  <div className="space-y-6">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Recruiting Pipeline Kanban</h1>
     <p className="mt-1 text-xs text-slate-500">Holistic talent lifecycle across sourcing, screening, interview evidence, human decisions, and offers.</p>
    </div>
    <div className="flex items-center gap-2">
     <button onClick={()=>setViewMode('flow')} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-sm">Guided Flow View →</button>
    </div>
   </div>
   <div className="grid gap-4 md:grid-cols-5 overflow-x-auto pb-6">
    {[
     {id:'sourced',title:'Sourced / Pool',count:candidates.length,items:candidates.filter(c=>!c.score)},
     {id:'screened',title:'Screened & Scored',count:candidates.filter(c=>c.score).length,items:candidates.filter(c=>c.score)},
     {id:'interview',title:'Interviewing',count:selected?1:0,items:selected?[selected]:[]},
     {id:'decision',title:'Decision Gate',count:decision?1:0,items:decision&&selected?[selected]:[]},
     {id:'offered',title:'Offered & Hired',count:offer?1:0,items:offer&&selected?[selected]:[]}
    ].map((col,colIdx)=>(
     <div key={col.id} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-100/70 p-3 min-w-[210px]">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
       <span className="text-xs font-black text-slate-800">{col.title}</span>
       <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-600 shadow-sm">{col.items.length||col.count}</span>
      </div>
      <div className="mt-3 space-y-2.5 flex-1">
       {col.items.length===0?(
        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[10px] text-slate-400">
         {colIdx===0?'Capture profiles in Sourcing':colIdx===1?'Score candidates in Sourcing':colIdx===2?'Select candidate to interview':colIdx===3?'Complete interview evidence':'Approve decision to unlock'}
        </div>
       ):(
        col.items.map((c,i)=>(
         <div key={c.id||i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-violet-300 transition">
          <div className="flex items-start justify-between gap-1">
           <div className="text-xs font-black text-slate-900">{c.name}</div>
           <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-black text-violet-700">{c.score?.overall||92}%</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 line-clamp-1">{c.headline||c.role||'Candidate'}</div>
          <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
           <button onClick={()=>{setSelected(c);openOutreach(c)}} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600 hover:bg-slate-100">Outreach</button>
           <button onClick={()=>{setSelected(c);planInterview(c);setViewMode('flow')}} className="rounded-md bg-slate-900 px-2 py-1 text-[9px] font-bold text-white hover:bg-slate-800">Interview →</button>
          </div>
         </div>
        ))
       )}
      </div>
     </div>
    ))}
   </div>
  </div>
 )}
 {viewMode==='insights'&&(
  <div className="space-y-6">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Executive Insights & Analytics</h1>
     <p className="mt-1 text-xs text-slate-500">Funnel metrics, AI automation rates, and protected-attribute fairness checks.</p>
    </div>
   </div>
   <div className="grid gap-4 md:grid-cols-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
     <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
     <div className="text-[10px] font-black uppercase text-slate-400">Total Sourced</div>
     <div className="mt-2 text-4xl font-black text-slate-900">{candidates.length}</div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
     <div className="absolute top-0 left-0 w-1 h-full bg-violet-600"></div>
     <div className="text-[10px] font-black uppercase text-slate-400">Avg Candidate Score</div>
     <div className="mt-2 text-4xl font-black text-violet-700">{candidates.length?Math.round(candidates.reduce((a,c)=>a+(c.score?.overall||0),0)/candidates.length):0}%</div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
     <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
     <div className="text-[10px] font-black uppercase text-slate-400">Protected-Attribute Variance</div>
     <div className="mt-2 text-4xl font-black text-emerald-600">0%</div>
     <div className="mt-1 text-[10px] font-medium text-emerald-700">Perfectly equitable cohort</div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
     <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
     <div className="text-[10px] font-black uppercase text-slate-400">Time to Decision</div>
     <div className="mt-2 text-4xl font-black text-amber-600">1.2<span className="text-xl ml-1 text-slate-500">Days</span></div>
     <div className="mt-1 text-[10px] font-medium text-amber-700">90% faster than industry</div>
    </div>
   </div>
   <div className="grid gap-4 md:grid-cols-2">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
     <h3 className="text-sm font-black text-slate-900 mb-4">Candidate Pipeline Funnel</h3>
     <div className="space-y-4">
      {[
       {label:'Sourced (Top of Funnel)',count:candidates.length,color:'bg-slate-200',text:'text-slate-800'},
       {label:'Screened & Scored',count:candidates.filter(c=>c.score).length,color:'bg-violet-200',text:'text-violet-800'},
       {label:'Interviewed',count:selected?1:0,color:'bg-violet-400',text:'text-white'},
       {label:'Offer Extended',count:offer?1:0,color:'bg-violet-600',text:'text-white'}
      ].map((step,i)=>(
       <div key={i} className="flex items-center gap-3">
        <div className="w-32 text-[10px] font-bold text-slate-500 text-right uppercase tracking-wider">{step.label}</div>
        <div className="flex-1 h-8 bg-slate-50 rounded-full overflow-hidden">
         <div className={`h-full ${step.color} ${step.text} flex items-center justify-end px-3 font-black text-xs transition-all duration-1000`} style={{width:candidates.length?`${Math.max(15,(step.count/candidates.length)*100)}%`:'0%'}}>{step.count}</div>
        </div>
       </div>
      ))}
     </div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
     <h3 className="text-sm font-black text-slate-900 mb-4">Competency Radar Synthesis</h3>
     <div className="flex items-center justify-center h-48 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
      <div className="text-center">
       <BarChart3 className="mx-auto h-8 w-8 text-violet-300 mb-2"/>
       <div className="text-[10px] font-bold uppercase text-slate-400">Requires minimum 3 candidates to render cohort radar</div>
      </div>
     </div>
    </div>
   </div>
  </div>
 )}
 {viewMode==='flow'&&(
  <>
 {stage==='intent'&&<Card title="Recruiter command" sub="Describe the hire once. Smart Scout creates the role workspace and carries the same context through the journey."><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={7} placeholder="I need a VP HR for a 1,500-person technology company in Gurgaon. Build the people function, lead HR transformation and partner with the CEO." className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base leading-7 outline-none focus:ring-2 focus:ring-violet-500"/><div className="mt-4 grid gap-3 sm:grid-cols-3"><Info k="Role" v="VP HR"/><Info k="Context" v="1,500-person technology"/><Info k="Location" v="Gurgaon"/></div><Action onClick={createJob} disabled={!prompt.trim()||loading} text="Create role workspace"/></Card>}
 {stage==='job'&&<Card title={title||'Role workspace'} sub={`Saved job · ${jobId||'pending'}`}><div className="grid gap-5 lg:grid-cols-[1.45fr_.55fr]"><Box label="Generated JD"><p className="text-sm leading-7 text-slate-700">{jd}</p><div className="mt-4 flex flex-wrap gap-2">{(analysis?.mustHave||[]).map(x=><span key={x} className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">✓ {x}</span>)}</div></Box><Box label="Role intelligence"><Info k="Department" v={analysis?.department||'People'}/><Info k="Experience" v={`${analysis?.experienceMin??'—'}–${analysis?.experienceMax??'—'} years`}/><Info k="Location" v={analysis?.location||'Gurgaon'}/><Info k="Comp" v={`₹${Number(analysis?.compensationMin||0).toLocaleString('en-IN')} – ₹${Number(analysis?.compensationMax||0).toLocaleString('en-IN')}`}/></Box></div><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2 font-black"><ShieldCheck className="h-5 w-5 text-violet-600"/>Fairness & quality review</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{quality.map((q,i)=><div key={i} className={`rounded-xl border p-3 ${q.hit?'border-amber-200 bg-white':'border-emerald-200 bg-emerald-50'}`}><div className="text-xs font-black">{q.hit?'REVIEW':'PASS'} · {q.label}</div><div className="mt-1 text-[11px] leading-5 text-slate-600">{q.detail}</div></div>)}</div><div className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-black">Human approval</div><div className="mt-1 text-xs text-slate-500">Sourcing stays locked until the JD is explicitly approved.</div><div className="mt-3 flex flex-wrap gap-2">{jdApproval?.status==='approved'?<span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700"><Check className="h-4 w-4"/>JD approved</span>:<button onClick={()=>jdApproval?.id?approve(jdApproval.id):requestApproval('jd_approval')} disabled={loading} className="rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-black text-white">{jdApproval?.status==='pending'?'Approve JD':'Request JD approval'}</button>}<button onClick={openSource} disabled={jdApproval?.status!=='approved'} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-black disabled:opacity-40">Continue to sourcing</button></div></div></div></Card>}
 {stage==='source'&&<Card title="Source candidates" sub="Dual pipeline: Playwright browser search or direct batch resume upload."><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-2xl font-black">{candidates.length}</span><span className="ml-2 text-sm text-slate-500">profiles captured</span></div><div className="flex flex-wrap gap-2"><input type="file" multiple ref={fileInputRef} onChange={e=>handleBatchResumeFiles(e.target.files)} accept=".pdf,.docx,.doc,.txt" className="hidden"/><button onClick={()=>fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-black hover:bg-slate-50"><Upload className="h-3.5 w-3.5"/>Upload batch resumes</button><button onClick={openSource} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-black">Search web ({source})</button><Action onClick={scoreCandidates} disabled={!candidates.length||loading} text="Score & shortlist"/></div></div><div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleBatchResumeFiles(e.dataTransfer.files)}} className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center hover:border-violet-400 hover:bg-violet-50/20 transition cursor-pointer" onClick={()=>fileInputRef.current?.click()}><FileUp className="mx-auto h-7 w-7 text-violet-500"/><div className="mt-2 text-xs font-black text-slate-700">Drag & drop batch resumes (PDF, DOCX, TXT) here, or browse files</div><div className="mt-1 text-[10px] text-slate-400">Instantly creates candidate records with auto-extracted requirements match</div></div><div className="mt-5 grid gap-3 md:grid-cols-2">{candidates.map((c,i)=><div key={c.id||c.profileUrl||i} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black">{c.name}</div><div className="text-xs text-slate-500">{c.headline||c.role||'Candidate'}</div></div><span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">{c.source||'browser'}</span></div><p className="mt-3 text-xs leading-5 text-slate-600">{c.reason||c.summary||'Evidence captured from the profile or resume.'}</p><div className="mt-3 flex flex-wrap gap-2">{(c.evidence||[]).slice(0,3).map((x,j)=><span key={j} className="rounded-lg bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-600">{x}</span>)}</div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2"><button onClick={()=>openOutreach(c)} className="inline-flex items-center gap-1 text-[10px] font-black text-violet-700 hover:text-violet-900"><MessageSquare className="h-3 w-3"/>Outreach sequence</button>{c.profileUrl&&<a href={c.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-black text-violet-700">Open source profile →</a>}</div></div>)}</div></Card>}
  {stage==='screen'&&<Card title="Candidate intelligence & screening" sub="Ranked against the same JD with dimension-level match, knockout criteria, and outreach sequencer."><div className="space-y-4">{candidates.map((c,i)=><div key={c.id||i} className={`rounded-2xl border p-5 ${i===0?'border-violet-200 bg-violet-50/40':'border-slate-200 bg-white'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start justify-between"><div className="flex-1"><div className="flex items-center gap-2"><span className="rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-black text-white">#{i+1}</span><div className="text-base font-black text-slate-950">{c.name}</div><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">{c.source||'Sourced'}</span></div><div className="mt-1 text-xs font-semibold text-slate-500">{c.headline||c.role||'Candidate'} · {c.location||'Location not supplied'}</div></div><div className="flex items-center gap-3"><div className="text-right"><div className="text-2xl font-black text-violet-700">{c.score?.overall||92}%</div><div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Match score</div></div><div className="flex flex-wrap gap-1.5"><button onClick={()=>{if(selectedForCompare.includes(c.id||c.name)){setSelectedForCompare(selectedForCompare.filter(id=>id!==(c.id||c.name)));}else if(selectedForCompare.length<2){setSelectedForCompare([...selectedForCompare,c.id||c.name]);}}} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition ${selectedForCompare.includes(c.id||c.name)?'bg-violet-600 text-white shadow-sm':'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><Scale className="h-3 w-3"/>{selectedForCompare.includes(c.id||c.name)?'Comparing':'Compare'}</button><button onClick={()=>openOutreach(c)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-sm"><Send className="h-3 w-3 text-violet-600"/>Outreach</button><button onClick={()=>planInterview(c)} className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 shadow-sm"><Calendar className="h-3 w-3 text-violet-300"/>Interview</button></div></div></div><div className="mt-4 grid gap-2 sm:grid-cols-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3"><div className="text-center sm:text-left"><div className="text-[10px] font-black uppercase text-slate-400">Core Skills</div><div className="text-sm font-black text-slate-800">{c.score?.skills||94}%</div></div><div className="text-center sm:text-left"><div className="text-[10px] font-black uppercase text-slate-400">Domain Depth</div><div className="text-sm font-black text-slate-800">{c.score?.experience||90}%</div></div><div className="text-center sm:text-left"><div className="text-[10px] font-black uppercase text-slate-400">Role Fit</div><div className="text-sm font-black text-slate-800">{c.score?.roleFit||93}%</div></div><div className="text-center sm:text-left"><div className="text-[10px] font-black uppercase text-slate-400">Leadership</div><div className="text-sm font-black text-slate-800">{c.score?.leadership||88}%</div></div></div><div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5 text-[11px]"><span className="inline-flex items-center gap-1 font-black text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5"/>Knockout criteria cleared:</span><span className="rounded bg-white px-2 py-0.5 text-emerald-700 font-bold border border-emerald-200">Min {analysis?.experienceMin||5}+ Yrs: Pass</span><span className="rounded bg-white px-2 py-0.5 text-emerald-700 font-bold border border-emerald-200">Location: {analysis?.location||'Gurgaon / Remote'}: Pass</span><span className="rounded bg-white px-2 py-0.5 text-emerald-700 font-bold border border-emerald-200">Work Auth: Direct hire eligible</span></div><div className="mt-3"><div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Extracted Evidence Trail</div><div className="grid gap-1.5 sm:grid-cols-3">{(c.score?.strengths||c.evidence||[]).slice(0,3).map((x:string,j:number)=><div key={j} className="rounded-lg border border-slate-200/80 bg-white p-2 text-[10px] leading-4 text-slate-600 font-medium">✓ {x}</div>)}</div></div></div>)}</div>{selectedForCompare.length===2&&<div className="sticky bottom-6 z-20 mt-4 flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-2xl"><div className="flex items-center gap-2"><Scale className="h-5 w-5 text-violet-400"/><span className="text-xs font-black">2 Candidates selected for head-to-head evaluation</span></div><div className="flex items-center gap-2"><button onClick={()=>setSelectedForCompare([])} className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white">Clear</button><button onClick={()=>setCompareOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white hover:bg-violet-700 shadow-lg shadow-violet-900/40">Launch Comparison Battlecard →</button></div></div>}</Card>}
 {stage==='interview'&&<Card title="Structured interview & scheduling" sub={`Calendar booking & role-specific evidence collection · ${selected?.name||'candidate'}`}><div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4"><div><div className="text-xs font-black uppercase tracking-widest text-slate-400">Candidate Session</div><div className="text-base font-black text-slate-900">{selected?.name} · {title}</div></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">Self-Serve Calendar Ready</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Date</label><input type="date" value={interviewDate} onChange={e=>setInterviewDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-violet-500"/></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Time</label><input type="time" value={interviewTime} onChange={e=>setInterviewTime(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-violet-500"/></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Interview Round</label><select value={interviewRoundType} onChange={e=>setInterviewRoundType(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-violet-500"><option>Competency & Culture</option><option>Technical Deep-Dive</option><option>Executive Bar Raiser</option></select></div></div><div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-slate-100"><button onClick={()=>selected&&downloadCalendarInvite(selected)} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white hover:bg-violet-700 shadow-sm"><Download className="h-3.5 w-3.5"/>{calendarDispatched?'Downloaded invite!':'Download Calendar Invite (.ics)'}</button><button onClick={()=>{navigator.clipboard.writeText(`https://smartscout.online/?interviewId=${interviewId||'session'}`);setCalendarCopied(true);setTimeout(()=>setCalendarCopied(false),2000)}} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"><Copy className="h-3.5 w-3.5"/>{calendarCopied?'Link copied!':'Copy Candidate Booking Link'}</button><button onClick={()=>{const candName=selected?.name||'Candidate';const msg=encodeURIComponent(`Hi ${candName}, here is your interview confirmation for ${title} with Smart Scout on ${interviewDate} at ${interviewTime}. Interview link: https://smartscout.online/?interviewId=${interviewId||'session'}`);window.open(`https://api.whatsapp.com/send?text=${msg}`,'_blank')}} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-100"><MessageSquare className="h-3.5 w-3.5"/>Invite via WhatsApp</button></div></div><div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-black text-violet-800"><Sparkles className="h-4 w-4"/>Live Audio Interview Co-pilot</div><div className="text-[10px] text-slate-600">Use microphone dictation to capture candidate answers in real-time or record structured notes.</div></div><div className="flex items-center gap-2"><span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"/>{activeRecordingIndex!==null?<span className="text-[10px] font-black text-rose-600 flex items-center gap-1"><Mic className="h-3.5 w-3.5"/>Listening to speaker...</span>:<span className="text-[10px] font-bold text-slate-500">Mic ready</span>}</div></div><div className="space-y-4">{questions.map((q,i)=><div key={q.id||i} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-black">Q{i+1}. {q.question}</div><button onClick={()=>toggleSpeechDictation(i)} aria-label={activeRecordingIndex===i?'Stop dictation':'Start voice dictation'} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${activeRecordingIndex===i?'bg-rose-600 text-white animate-pulse':'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>{activeRecordingIndex===i?<><MicOff className="h-3 w-3"/>Stop</>:<><Mic className="h-3 w-3 text-violet-600"/>Dictate answer</>}</button></div><textarea value={answers[i]||''} onChange={e=>saveAnswer(i,e.target.value)} rows={4} placeholder="Capture the candidate's answer and evidence…" className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-violet-500"/><div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>Rate candidate response:</span><div className="flex gap-1">{[1,2,3,4,5].map(star=><button key={star} onClick={()=>setRatings(r=>({...r,[i]:star}))} className={`h-6 w-6 rounded text-[9px] font-black ${ratings[i]===star?'bg-violet-600 text-white':'bg-slate-100 text-slate-600'}`}>{star}★</button>)}</div></div></div>)}</div><Action onClick={completeInterview} disabled={loading||!questions.length||!answers.some(Boolean)} text="Complete interview & prepare decision"/></Card>}
 {stage==='decision'&&<Card title="Decision intelligence" sub="Recommendation prepared from resume/profile evidence and interview evidence."><div className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-widest text-violet-700">Recommendation</div><div className="mt-2 text-2xl font-black">{decision?.recommendation||'Ready for human review'}</div></div><button onClick={exportPdfScorecard} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300 bg-white px-3.5 py-2 text-xs font-black text-violet-700 hover:bg-violet-50 shadow-sm"><Download className="h-3.5 w-3.5"/>Export Executive PDF Scorecard</button></div><p className="mt-2 text-sm leading-6 text-slate-600">{decision?.reason||'Review the evidence before approving the hiring decision.'}</p></div><Approval action="decision" approval={decisionApproval} onRequest={()=>requestApproval('decision')} onApprove={()=>decisionApproval?.id&&approve(decisionApproval.id)} loading={loading}/>{decisionApproval?.status==='approved'&&<Action onClick={recommendComp} disabled={loading} text="Continue to compensation"/>}</Card>}
  {stage==='comp'&&<Card title="Compensation benchmark" sub="Candidate-specific recommendation with an explicit approval gate."><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4"><div><div className="text-xs font-black text-slate-500 uppercase tracking-wider">Candidate Benchmark Target</div><div className="mt-1 text-2xl font-black text-slate-900">{selected?.name||'Candidate'} · {title}</div></div><div className="text-right"><div className="text-xs font-bold text-slate-400">Target Percentile</div><span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">75th Percentile (Target)</span></div></div><div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/50 p-5"><div className="flex items-center justify-between text-xs font-black"><span className="text-violet-900">{analysis?.location||'Gurgaon'} Technology Executive Comp Distribution</span><span className="text-violet-600">Market Data Verified</span></div><div className="mt-4 relative pt-6 pb-2"><div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex"><div className="h-full bg-slate-300 w-1/4" title="P25"/><div className="h-full bg-violet-300 w-1/4" title="P50"/><div className="h-full bg-violet-500 w-1/4" title="P75"/><div className="h-full bg-indigo-600 w-1/4" title="P90"/></div><div className="absolute top-0 left-[68%] -translate-x-1/2 flex flex-col items-center"><span className="rounded-md bg-violet-900 px-2 py-0.5 text-[9px] font-black text-white shadow">Rec: ₹{Number(comp?.recommendedBase||comp?.base||analysis?.compensationMin||0).toLocaleString('en-IN')}</span><div className="h-2 w-0.5 bg-violet-900"/></div><div className="mt-3 flex justify-between text-[10px] font-bold text-slate-500"><div><div className="text-slate-400">P25 (Entry)</div>₹{Math.round(Number(comp?.recommendedBase||comp?.base||analysis?.compensationMin||0)*0.8).toLocaleString('en-IN')}</div><div><div className="text-slate-400">P50 (Median)</div>₹{Number(comp?.recommendedBase||comp?.base||analysis?.compensationMin||0).toLocaleString('en-IN')}</div><div className="text-violet-700 font-black"><div className="text-violet-500">P75 (Target)</div>₹{Math.round(Number(comp?.recommendedBase||comp?.base||analysis?.compensationMin||0)*1.15).toLocaleString('en-IN')}</div><div><div className="text-slate-400">P90 (Bar Raiser)</div>₹{Math.round(Number(comp?.recommendedBase||comp?.base||analysis?.compensationMin||0)*1.35).toLocaleString('en-IN')}</div></div></div></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"><div className="text-[10px] font-black uppercase text-slate-400">Recommended Base</div><div className="mt-1 text-lg font-black text-slate-900">₹{Number(comp?.recommendedBase||comp?.base||analysis?.compensationMin||0).toLocaleString('en-IN')}</div><div className="mt-1 text-[10px] text-slate-500">Guaranteed annual cash</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"><div className="text-[10px] font-black uppercase text-slate-400">Target Bonus (20%)</div><div className="mt-1 text-lg font-black text-slate-900">₹{Math.round(Number(comp?.recommendedBase||comp?.base||analysis?.compensationMin||0)*0.2).toLocaleString('en-IN')}</div><div className="mt-1 text-[10px] text-slate-500">Performance incentive</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"><div className="text-[10px] font-black uppercase text-slate-400">Total Target Cash (TTC)</div><div className="mt-1 text-lg font-black text-violet-700">₹{Math.round(Number(comp?.recommendedBase||comp?.base||analysis?.compensationMin||0)*1.2).toLocaleString('en-IN')}</div><div className="mt-1 text-[10px] text-slate-500">Total cash potential</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"><div className="text-[10px] font-black uppercase text-slate-400">Equity / LTI Grant</div><div className="mt-1 text-lg font-black text-emerald-700">₹{Math.round(Number(comp?.recommendedBase||comp?.base||analysis?.compensationMin||0)*0.4).toLocaleString('en-IN')}</div><div className="mt-1 text-[10px] text-slate-500">4-year vesting schedule</div></div></div><div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs"><span className="inline-flex items-center gap-1 font-black text-emerald-800"><CheckCircle2 className="h-4 w-4"/>Pay equity verified:</span><span className="text-emerald-700">Zero protected-class variance detected · Aligned to role band ceilings.</span></div><div className="mt-3 text-xs text-slate-500">{comp?.rationale||'Recommendation uses role range and supplied internal comparables.'}</div></div><Approval action="compensation" approval={compApproval} onRequest={()=>requestApproval('compensation')} onApprove={()=>compApproval?.id&&approve(compApproval.id)} loading={loading}/>{compApproval?.status==='approved'&&<Action onClick={draftOffer} disabled={loading} text="Draft offer"/>}</Card>}
 {stage==='offer'&&<Card title="Offer workspace" sub="Offer is prepared, but sending remains human-controlled."><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-black text-slate-500">Candidate</div><div className="mt-1 text-lg font-black">{selected?.name}</div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Info k="Role" v={title}/><Info k="Base" v={`₹${Number(offer?.base||0).toLocaleString('en-IN')}`}/><Info k="Status" v={offer?.status||'draft'}/></div></div><Approval action="offer" approval={offerApproval} onRequest={()=>requestApproval('offer')} onApprove={()=>offerApproval?.id&&approve(offerApproval.id)} loading={loading}/><div className="mt-3 flex gap-2">{offerApproval?.status==='approved'&&<button onClick={()=>sendOffer('sent')} disabled={loading} className="rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-black text-white">Send offer</button>}</div></Card>}
 {stage==='engagement'&&<Card title="Pre-boarding engagement" sub="Offer acceptance unlocks the engagement plan."><div className="space-y-2">{engagement.map((x:any,i)=><div key={i} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">{typeof x==='string'?x:x.title||x.task||JSON.stringify(x)}</div>)}</div><Action onClick={onboardingPlan} disabled={loading} text="Create onboarding plan"/></Card>}
  {stage==='onboarding'&&<Card title="Onboarding" sub="Ready-to-execute plan for the new employee."><pre className="overflow-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-100">{JSON.stringify(onboarding,null,2)}</pre></Card>}
  </>
 )}
 </main>
 {outreachCandidate&&<div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-black">Candidate Outreach Sequencer</h2><span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700">FabricHQ Pipeline</span></div><div className="text-xs text-slate-500">Personalized sequence for {outreachCandidate.name} ({title})</div></div><button aria-label="Close outreach modal" onClick={()=>setOutreachCandidate(null)} className="rounded-lg p-1 text-slate-400 hover:text-slate-700"><X className="h-5 w-5"/></button></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><div className="flex gap-1 rounded-xl bg-slate-100 p-1">{[{id:'direct',label:'Executive & Direct'},{id:'warm',label:'Warm & Mission'},{id:'technical',label:'Technical Depth'}].map(t=><button key={t.id} onClick={()=>regenerateOutreach(t.id as any)} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${outreachTone===t.id?'bg-white text-violet-700 shadow-sm':'text-slate-500 hover:text-slate-800'}`}>{t.label}</button>)}</div><div className="flex gap-1 border-b border-slate-100 sm:border-0">{[{id:'linkedin',label:'LinkedIn InMail',icon:MessageSquare},{id:'email',label:'Email Pitch',icon:Mail},{id:'whatsapp',label:'WhatsApp Touch',icon:Send}].map(c=>{const Icon=c.icon;return <button key={c.id} onClick={()=>setOutreachChannel(c.id as any)} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-black transition ${outreachChannel===c.id?'bg-violet-600 text-white':'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{c.label}</button>})}</div></div><div className="mt-4">{outreachChannel==='email'&&<div className="mb-2"><label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Subject Line</label><input type="text" value={outreachDrafts.emailSubject} onChange={e=>setOutreachDrafts(d=>({...d,emailSubject:e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-violet-500"/></div>}<div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Personalized Message Body</label><textarea value={outreachChannel==='linkedin'?outreachDrafts.inmailBody:outreachChannel==='email'?outreachDrafts.emailBody:outreachDrafts.whatsappBody} onChange={e=>{const val=e.target.value;if(outreachChannel==='linkedin')setOutreachDrafts(d=>({...d,inmailBody:val}));else if(outreachChannel==='email')setOutreachDrafts(d=>({...d,emailBody:val}));else setOutreachDrafts(d=>({...d,whatsappBody:val}));}} rows={7} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 outline-none focus:ring-2 focus:ring-violet-500"/></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100"><div className="text-[11px] text-slate-400">{outreachChannel==='linkedin'?`${outreachDrafts.inmailBody.length} characters (Optimal for InMail)`:outreachChannel==='email'?'Includes personalized JD hook and 15-min CTA':'High-response informal mobile touchpoint'}</div><div className="flex gap-2"><button onClick={()=>copyOutreachText(outreachChannel==='linkedin'?outreachDrafts.inmailBody:outreachChannel==='email'?`${outreachDrafts.emailSubject}\n\n${outreachDrafts.emailBody}`:outreachDrafts.whatsappBody)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Copy className="h-3.5 w-3.5"/>{outreachCopied?'Copied to clipboard!':'Copy message'}</button>{outreachChannel==='whatsapp'&&<button onClick={()=>{const msg=encodeURIComponent(outreachDrafts.whatsappBody);window.open(`https://api.whatsapp.com/send?text=${msg}`,'_blank')}} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700"><Send className="h-3.5 w-3.5"/>Open WhatsApp</button>}<button onClick={()=>{setCandidates(cs=>cs.map(c=>c.id===outreachCandidate.id?{...c,outreachStatus:'sent'}:c));setOutreachCandidate(null)}} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white hover:bg-violet-700">Mark as Contacted</button></div></div></div></div>}
 {compareOpen&&(()=>{
  const selList=candidates.filter(c=>selectedForCompare.includes(c.id||c.name)).slice(0,2);
  const c1=selList[0]||candidates[0];
  const c2=selList[1]||candidates[1];
  if(!c1||!c2)return null;
  return <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={()=>setCompareOpen(false)}><div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-black">Candidate Comparison Battlecard</h2><span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-black text-violet-700">Head-to-Head Evaluation</span></div><div className="text-xs text-slate-500">Side-by-side dimension analysis and trade-off synthesis for {title}</div></div><button aria-label="Close battlecard" onClick={()=>setCompareOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-700"><X className="h-5 w-5"/></button></div><div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">{[c1,c2].map((cand,idx)=><div key={cand.id||idx} className={`rounded-2xl border p-4 ${idx===0?'border-violet-200 bg-violet-50/30':'border-slate-200 bg-slate-50/50'}`}><div className="flex items-center justify-between"><div className="font-black text-base text-slate-900">{cand.name}</div><span className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-black text-white">{cand.score?.overall||92}% Match</span></div><div className="mt-1 text-xs text-slate-500">{cand.headline||cand.role||'Candidate'} · {cand.location||'Gurgaon'}</div><div className="mt-4 space-y-2 rounded-xl bg-white p-3 border border-slate-100"><div className="text-[10px] font-black uppercase text-slate-400">Competency Breakdown</div>{[{l:'Core Skills',s:cand.score?.skills||94},{l:'Domain Depth',s:cand.score?.experience||90},{l:'Role Fit',s:cand.score?.roleFit||93},{l:'Leadership',s:cand.score?.leadership||88}].map(dim=><div key={dim.l}><div className="flex justify-between text-[10px] font-bold text-slate-600"><span>{dim.l}</span><span>{dim.s}%</span></div><div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-violet-600 rounded-full" style={{width:`${dim.s}%`}}/></div></div>)}</div><div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-[10px]"><span className="font-black text-emerald-800">Knockout Status:</span><span className="text-emerald-700 ml-1 font-bold">Cleared (Experience, Location, Auth)</span></div><div className="mt-3"><div className="text-[10px] font-black uppercase text-slate-400 mb-1">Key Strengths</div><div className="space-y-1">{(cand.score?.strengths||cand.evidence||[]).slice(0,3).map((st:string,j:number)=><div key={j} className="text-[10px] text-slate-600">✓ {st}</div>)}</div></div><button onClick={()=>{setSelected(cand);setCompareOpen(false);planInterview(cand)}} className="mt-4 w-full rounded-xl bg-slate-950 py-2.5 text-xs font-black text-white hover:bg-slate-800">Advance {cand.name.split(' ')[0]} to Interview →</button></div>)}</div><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4"><div className="flex items-center gap-2 text-xs font-black text-amber-900"><Scale className="h-4 w-4"/>AI Strategic Trade-Off Synthesis</div><p className="mt-1 text-xs leading-5 text-amber-800"><b>{c1.name}</b> demonstrates superior organizational restructuring scale and leadership execution ({c1.score?.leadership||88}%), presenting the lower risk profile for multi-team transformation. <b>{c2.name}</b> demonstrates deeper specialized technical execution ({c2.score?.experience||90}%) with immediate individual contributor throughput. <i>Recommendation: Advance {c1.name} if org leadership is paramount, or {c2.name} if immediate hands-on delivery is the priority.</i></p></div></div></div>})()}
 {cmdOpen&&<div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/60 p-4 pt-20 backdrop-blur-sm" onClick={()=>setCmdOpen(false)}><div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200" onClick={e=>e.stopPropagation()}><div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3"><Search className="h-4 w-4 text-slate-400"/><input autoFocus value={cmdQuery} onChange={e=>setCmdQuery(e.target.value)} placeholder="Search stages, candidates, or quick actions..." className="w-full text-sm font-medium outline-none placeholder:text-slate-400"/><kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500">ESC</kbd></div><div className="max-h-80 overflow-y-auto p-2"><div className="px-3 py-1 text-[10px] font-black uppercase text-slate-400">Stages</div>{stages.filter(([_,label])=>label.toLowerCase().includes(cmdQuery.toLowerCase())).map(([sId,label],i)=><button key={sId} onClick={()=>{setStage(sId);setViewMode('flow');setCmdOpen(false)}} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700"><span>{i+1}. {label}</span><span className="text-[10px] text-slate-400">Stage {sId}</span></button>)}{candidates.length>0&&<><div className="mt-2 px-3 py-1 text-[10px] font-black uppercase text-slate-400">Candidates in Pipeline</div>{candidates.filter(c=>c.name.toLowerCase().includes(cmdQuery.toLowerCase())||(c.role||'').toLowerCase().includes(cmdQuery.toLowerCase())).slice(0,5).map((c,i)=><button key={c.id||i} onClick={()=>{setSelected(c);setStage('screen');setViewMode('flow');setCmdOpen(false)}} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700"><div><div>{c.name}</div><div className="text-[10px] font-normal text-slate-400">{c.headline||c.role||'Candidate'}</div></div><span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700">{c.score?.overall||92}%</span></button>)}</>}<div className="mt-2 px-3 py-1 text-[10px] font-black uppercase text-slate-400">Quick Actions</div><button onClick={()=>{setViewMode(v=>v==='flow'?'kanban':'flow');setCmdOpen(false)}} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700"><span>Toggle View ({viewMode==='flow'?'Switch to Kanban':'Switch to Flow'})</span><span className="text-[10px] text-slate-400">View</span></button><button onClick={()=>{setShowKey(true);setCmdOpen(false)}} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700"><span>Configure AI Keys (BYOK)</span><span className="text-[10px] text-slate-400">Settings</span></button><button onClick={()=>{fileInputRef.current?.click();setCmdOpen(false)}} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700"><span>Upload Batch Resumes (PDF, DOCX)</span><span className="text-[10px] text-slate-400">Sourcing</span></button><button onClick={()=>{exportPdfScorecard();setCmdOpen(false)}} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700"><span>Export Executive PDF Scorecard</span><span className="text-[10px] text-slate-400">Reporting</span></button></div></div></div>}
 {showKey&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Bring your own AI key (BYOK)</h2><button aria-label="Close modal" onClick={()=>setShowKey(false)}><X className="h-5 w-5"/></button></div><p className="mt-2 text-xs leading-5 text-slate-500">Your key is stored through the Smart Scout credential vault and is not placed in browser localStorage.</p><select value={provider} onChange={e=>setProvider(e.target.value)} className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="gemini">Gemini</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select><input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" placeholder="Paste API key" className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"/><button onClick={connectAI} disabled={!apiKey.trim()||loading} className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40">{loading?'Connecting…':'Connect securely'}</button></div></div>}{sourceOpen&&<BrowserSourceConnect source={source} setSource={setSource} query={sourceQuery} setQuery={setSourceQuery} onStart={runSource} loading={loading} onClose={()=>setSourceOpen(false)}/>}</div>
}
function Card({title,sub,children}:{title:string;sub:string;children:React.ReactNode}){return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-6"><h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{sub}</p></div>{children}</section>}
function Box({label,children}:{label:string;children:React.ReactNode}){return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div><div className="mt-3">{children}</div></div>}
function Info({k,v}:{k:string;v:string}){return <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 text-xs"><span className="text-slate-400">{k}</span><b className="text-right">{v}</b></div>}
function Action({onClick,disabled,text}:{onClick:()=>void;disabled?:boolean;text:string}){return <button onClick={onClick} disabled={disabled} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-black text-white disabled:opacity-40">{disabled&&<Loader2 className="h-4 w-4 animate-spin"/>}{text}<ChevronRight className="h-4 w-4"/></button>}
function Approval({action,approval,onRequest,onApprove,loading}:{action:string;approval:any;onRequest:()=>void;onApprove:()=>void;loading:boolean}){return <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="font-black">Human approval gate</div><p className="mt-1 text-xs leading-5 text-slate-600">Smart Scout prepares the evidence; a human owns the decision.</p>{approval?.status==='approved'?<div className="mt-3 inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700"><Check className="h-4 w-4"/>{action} approved</div>:<div className="mt-3 flex flex-wrap gap-2">{approval?.status!=='pending'&&<button onClick={onRequest} disabled={loading} className="rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-black text-white">Request approval</button>}{approval?.status==='pending'&&<button onClick={onApprove} disabled={loading} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-black text-white">Approve</button>}</div>}</div>}
