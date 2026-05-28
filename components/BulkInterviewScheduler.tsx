import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Users, 
  Mail, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Send, 
  X,
  FileArchive,
  ArrowRight,
  Calendar,
  Zap,
  Brain
} from 'lucide-react';
import JSZip from 'jszip';
import { 
  extractTextFromFile, 
  extractCandidateDetails, 
  generateInterviewQuestions 
} from '../services/geminiService';
import { BulkInterviewCandidate, InterviewSession, InterviewType } from '../types';

interface BulkInterviewSchedulerProps {
  initialJd?: string;
  user?: any;
  onLoginRequest?: () => void;
  onSchedule: (session: InterviewSession) => void;
}

const BulkInterviewScheduler: React.FC<BulkInterviewSchedulerProps> = ({ initialJd, user, onLoginRequest, onSchedule }) => {
  const [jd, setJd] = useState(initialJd || '');
  const [isJdExtracting, setIsJdExtracting] = useState(false);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [isJdDetailsExtracting, setIsJdDetailsExtracting] = useState(false);

  useEffect(() => {
    if (initialJd && !jd) {
      setJd(initialJd);
      handleJdDetailsExtract(initialJd);
    }
  }, [initialJd]);

  const handleJdDetailsExtract = async (text: string) => {
    if (!text || text.trim().length < 50) return;
    setIsJdDetailsExtracting(true);
    try {
      const { extractJobDetails } = await import('../services/geminiService');
      const details = await extractJobDetails(text);
      if (details.company && details.company !== "Unknown") setCompany(details.company);
      if (details.role && details.role !== "Unknown") setRole(details.role);
    } catch (err) {
      console.error("Failed to extract JD details:", err);
    } finally {
      setIsJdDetailsExtracting(false);
    }
  };

  const [recruiterEmail, setRecruiterEmail] = useState(user?.email || '');
  const [scheduledAt, setScheduledAt] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('recruiter');
  const [language, setLanguage] = useState('English (Indian)');
  const [voicePreference, setVoicePreference] = useState<'male' | 'female'>('female');
  const [voiceName, setVoiceName] = useState('Veena');

  useEffect(() => {
    if (user?.email && !recruiterEmail) {
      setRecruiterEmail(user.email);
    }
  }, [user]);
  const [candidates, setCandidates] = useState<BulkInterviewCandidate[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsJdExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      setJd(text);
      await handleJdDetailsExtract(text);
    } catch (err) {
      console.error("Failed to extract JD text:", err);
      alert("Failed to extract text from JD file. Please try pasting it manually.");
    } finally {
      setIsJdExtracting(false);
    }
  };

  const processFile = async (file: File) => {
    const id = Math.random().toString(36).substring(7);
    const newCandidate: BulkInterviewCandidate = {
      id,
      name: (file as File).name,
      email: '',
      cvText: '',
      status: 'extracting'
    };
    
    setCandidates(prev => [...prev, newCandidate]);

    try {
      const text = await extractTextFromFile(file as File);
      const details = (await extractCandidateDetails(text)) as { name: string, email: string };
      
      setCandidates(prev => prev.map(c => c.id === id ? {
        ...c,
        name: details.name || (file as File).name,
        email: details.email || '',
        cvText: text,
        status: details.email ? 'ready' : 'failed',
        error: details.email ? undefined : 'Could not extract email'
      } : c));
    } catch (err) {
      setCandidates(prev => prev.map(c => c.id === id ? {
        ...c,
        status: 'failed',
        error: 'Failed to parse file'
      } : c));
    }
  };

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsExtracting(true);
    const fileList = Array.from(files);
    for (const file of fileList) {
      const f = file as File;
      if (f.name.endsWith('.zip')) {
        try {
          const zip = new JSZip();
          const contents = await zip.loadAsync(f);
          const entries = Object.entries(contents.files);
          for (const [filename, zipEntry] of entries) {
            if (!zipEntry.dir && (filename.endsWith('.pdf') || filename.endsWith('.docx') || filename.endsWith('.txt'))) {
              const blob = await zipEntry.async('blob');
              const extractedFile = new File([blob], filename, { type: 'application/octet-stream' });
              await processFile(extractedFile as File);
            }
          }
        } catch (err) {
          console.error("Failed to process ZIP:", err);
        }
      } else {
        await processFile(f);
      }
    }
    setIsExtracting(false);
  };

  const handleBulkSchedule = async () => {
    if (!jd || !recruiterEmail) {
      alert("Please provide JD and Recruiter Email.");
      return;
    }

    const readyCandidates = candidates.filter(c => c.status === 'ready');
    if (readyCandidates.length === 0) {
      alert("No ready candidates to schedule.");
      return;
    }

    setIsScheduling(true);
    setScheduledCount(0);

    for (const candidate of readyCandidates) {
      try {
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: 'extracting' } : c)); // Note: 'extracting' is used for the scheduling phase too, maybe rename to 'scheduling' in future
        
        // 1. Generate Questions
        const { questions, coreRequirementsMap } = await generateInterviewQuestions(jd, candidate.cvText, interviewType, language);
        
        // 2. Create Session
        const sessionId = Math.random().toString(36).substring(7);
        const interviewLink = `https://smartscout.online/?interviewId=${sessionId}`;
        
        const formattedTime = new Date(scheduledAt).toLocaleString();
        const emailBody = `Dear ${candidate.name},

I hope this email finds you well.

Following a review of your impressive background and experience, we are pleased to invite you to the next stage of our selection process for the ${role || 'Head of Department'} position at ${company || 'our company'}.

At ${company || 'our company'}, we value innovation and efficiency. To that end, we utilize an advanced AI-driven audio interview platform. This interactive session is designed to allow you to showcase your professional journey and expertise in a conversational format.

Interview Details:
• Position: ${role || 'Head of Department'}
• Format: Interactive AI Audio Interview
• Estimated Duration: 15 minutes
• Scheduled Time: ${formattedTime}
• Access Link: ${interviewLink}

Preparation Tips:
• Ensure you are in a quiet environment.
• Use a stable internet connection.
• A headset/microphone is recommended for the best audio quality.

We look forward to hearing your insights.

Best regards,

The Talent Acquisition Team
${company || 'Smart Scout Recruitment'}`;

        const session: InterviewSession = {
          id: sessionId,
          user_id: user?.id || null,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          recruiterEmail,
          jd,
          cvText: candidate.cvText,
          questions,
          responses: [],
          status: 'scheduled',
          scheduledAt,
          emailBody,
          company,
          designation: role,
          interviewType,
          language,
          voicePreference,
          voiceName,
          coreRequirementsMap
        };

        // 3. Send Invitation
        const inviteRes = await fetch('/api/send-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateEmail: candidate.email,
            candidateName: candidate.name,
            emailBody,
            scheduledAt,
            interviewLink
          })
        });

        if (!inviteRes.ok) {
          const errorData = await inviteRes.json();
          throw new Error(errorData.error || 'Failed to send invitation');
        }

        // 4. Update UI & Persist
        await onSchedule(session);
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: 'scheduled' } : c));
        setScheduledCount(prev => prev + 1);
        
      } catch (err) {
        console.error(`Failed to schedule ${candidate.name}:`, err);
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: 'failed', error: 'Scheduling failed' } : c));
      }
    }
    setIsScheduling(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em]">Bulk Interview Scheduling</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase">Bulk Interview Scheduling</h2>
          <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Schedule AI-driven interviews for candidate pools at scale.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
          {[1, 2, 3].map(step => (
            <div 
              key={step}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-black transition-all border ${
                currentStep === step ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/30' : 
                currentStep > step ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {currentStep > step ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : `0${step}`}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1: JD & Recruiter */}
        <div className={`space-y-6 transition-all ${currentStep !== 1 ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="glass-panel p-6 rounded-2xl border-indigo-500/20 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white uppercase tracking-widest text-xs">01. Job Description</h3>
            </div>
            
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Job Description</label>
                <textarea 
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  onBlur={(e) => handleJdDetailsExtract(e.target.value)}
                  placeholder={isJdExtracting || isJdDetailsExtracting ? "Extracting JD details..." : "Paste JD or upload file..."}
                  disabled={isJdExtracting || isJdDetailsExtracting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 h-48 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none disabled:opacity-50 font-mono"
                />
                <div className="mt-2">
                  <input type="file" id="jd-file" className="hidden" onChange={handleJdUpload} accept=".pdf,.docx,.txt" />
                  <label htmlFor="jd-file" className={`text-[9px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-bold uppercase tracking-widest flex items-center gap-1 ${isJdExtracting ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isJdExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {isJdExtracting ? 'Extracting...' : 'Upload JD File'}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Recruiter Email (For Reports)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="email"
                    value={recruiterEmail}
                    onChange={(e) => setRecruiterEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Interview Start Time (Calendar Invite)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all [color-scheme:dark] font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/50 space-y-4">
                <label className="block text-[9px] uppercase font-bold text-indigo-500 tracking-widest">Interview Configuration</label>
                
                <div className="space-y-2">
                  <label className="block text-[8px] uppercase font-bold text-slate-600 tracking-widest">Round Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['consultant', 'recruiter', 'functional'] as InterviewType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setInterviewType(type)}
                        className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-wider border transition-all ${
                          interviewType === type 
                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-slate-500 italic mt-1">
                    {interviewType === 'consultant' && "10 mins - Initial interest check: location, salary, role, company & JD fit."}
                    {interviewType === 'recruiter' && "15 mins - Detailed basic questions: role and culture fitment."}
                    {interviewType === 'functional' && "Technical round: Deep dive by Hiring Manager."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[8px] uppercase font-bold text-slate-600 tracking-widest">Language</label>
                    <select 
                      value={language}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        setLanguage(newLang);
                        // Default to Veena for Indian languages if female, Rishi if male
                        const isIndian = newLang.includes('Indian') || 
                                       ['Hindi', 'Punjabi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Gujarati', 'Malayalam'].includes(newLang);
                        if (isIndian) {
                          setVoiceName(voicePreference === 'male' ? 'Rishi' : 'Veena');
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-[10px] text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option>English (Indian)</option>
                      <option>English (US)</option>
                      <option>English (UK)</option>
                      <option>Hindi</option>
                      <option>Punjabi</option>
                      <option>Marathi</option>
                      <option>Tamil</option>
                      <option>Telugu</option>
                      <option>Kannada</option>
                      <option>Bengali</option>
                      <option>Gujarati</option>
                      <option>Malayalam</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[8px] uppercase font-bold text-slate-600 tracking-widest">AI Voice</label>
                    <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1">
                      <button 
                        onClick={() => {
                          setVoicePreference('male');
                          const isIndian = language.includes('Indian') || 
                                         ['Hindi', 'Punjabi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Gujarati', 'Malayalam'].includes(language);
                          if (isIndian) setVoiceName('Rishi');
                        }}
                        className={`flex-1 py-1 rounded text-[8px] font-bold uppercase tracking-widest transition-all ${voicePreference === 'male' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                      >
                        Male {(language.includes('Indian') || ['Hindi', 'Punjabi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Gujarati', 'Malayalam'].includes(language)) && voicePreference === 'male' && '(Rishi)'}
                      </button>
                      <button 
                        onClick={() => {
                          setVoicePreference('female');
                          const isIndian = language.includes('Indian') || 
                                         ['Hindi', 'Punjabi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Gujarati', 'Malayalam'].includes(language);
                          if (isIndian) setVoiceName('Veena');
                        }}
                        className={`flex-1 py-1 rounded text-[8px] font-bold uppercase tracking-widest transition-all ${voicePreference === 'female' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                      >
                        Female {(language.includes('Indian') || ['Hindi', 'Punjabi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Gujarati', 'Malayalam'].includes(language)) && voicePreference === 'female' && '(Veena)'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setCurrentStep(2)}
              disabled={!jd || !recruiterEmail || !scheduledAt}
              className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 2: CV Upload */}
        <div className={`space-y-6 transition-all ${currentStep !== 2 ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="glass-panel p-6 rounded-2xl border-indigo-500/20 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white uppercase tracking-widest text-xs">02. Candidate Information</h3>
            </div>

            <div className="flex-1 space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all group bg-slate-950/50 flex flex-col items-center justify-center gap-4 h-48"
              >
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-slate-800">
                  <FileArchive className="w-6 h-6 text-slate-500 group-hover:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Upload Candidate CVs</p>
                  <p className="text-[10px] text-slate-500 font-medium">Drop PDF/Docx files or a ZIP archive</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  multiple 
                  onChange={handleCvUpload}
                  accept=".pdf,.docx,.txt,.zip"
                />
                <div className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                  Browse Files
                </div>
              </div>

              {candidates.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Detected Candidates ({candidates.length})</span>
                    <button onClick={() => setCandidates([])} className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase tracking-widest">Clear All</button>
                  </div>
                  {candidates.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-xl group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${
                          c.status === 'ready' ? 'bg-green-500' : 
                          c.status === 'extracting' ? 'bg-indigo-500 animate-pulse' : 
                          c.status === 'failed' ? 'bg-red-500' : 'bg-slate-700'
                        }`} />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white uppercase tracking-tight truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-500 truncate font-mono">{c.email || (c.status === 'extracting' ? 'Extracting...' : 'No email found')}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCandidates(prev => prev.filter(cand => cand.id !== c.id))}
                        className="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Back
              </button>
              <button 
                onClick={() => setCurrentStep(3)}
                disabled={candidates.filter(c => c.status === 'ready').length === 0}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                Review & Launch <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: Review & Send */}
        <div className={`space-y-6 transition-all ${currentStep !== 3 ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="glass-panel p-6 rounded-2xl border-indigo-500/20 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white uppercase tracking-widest text-xs">03. Review & Launch</h3>
            </div>

            <div className="flex-1 space-y-6">
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Batch Summary</span>
                  <div className="px-2 py-1 bg-indigo-500/10 rounded text-indigo-400 text-[9px] font-bold uppercase tracking-widest">Ready to Schedule</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Candidates</p>
                    <p className="text-xl font-black text-white tracking-tighter">{candidates.filter(c => c.status === 'ready').length}</p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Credits Required</p>
                    <p className="text-xl font-black text-indigo-400 tracking-tighter">{candidates.filter(c => c.status === 'ready').length * 10}</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Role Context</p>
                  <p className="text-xs font-black text-white uppercase tracking-tight truncate">{role || 'Not specified'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{company || 'Not specified'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Interview Setup</span>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: <Brain className="w-3.5 h-3.5" />, label: "Generate Contextual Questions" },
                    { icon: <Calendar className="w-3.5 h-3.5" />, label: "Initialize Interview Sessions" },
                    { icon: <Mail className="w-3.5 h-3.5" />, label: "Send Email Invitations" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/30 border border-slate-800/50 rounded-xl">
                      <div className="text-indigo-400">{item.icon}</div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {isScheduling && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-indigo-400">Scheduling Interviews...</span>
                    <span className="text-slate-500">{scheduledCount} / {candidates.filter(c => c.status === 'ready' || c.status === 'scheduled').length}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                      style={{ width: `${(scheduledCount / candidates.filter(c => c.status === 'ready' || c.status === 'scheduled').length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setCurrentStep(2)}
                disabled={isScheduling}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleBulkSchedule}
                disabled={isScheduling || candidates.filter(c => c.status === 'ready').length === 0}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Schedule Interviews
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {scheduledCount > 0 && !isScheduling && (
        <div className="animate-slideUp mt-8">
          <div className="glass-panel p-6 rounded-2xl border-green-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-2xl shadow-green-500/5">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/20 to-transparent"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 border border-green-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h4 className="font-black text-white uppercase tracking-tight">Interviews Scheduled!</h4>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{scheduledCount} candidates have been invited to their interviews.</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setCandidates([]);
                setScheduledCount(0);
                setCurrentStep(1);
              }}
              className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-500/20"
            >
              Start New Batch
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkInterviewScheduler;
