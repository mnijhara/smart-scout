import React, { useState, useEffect } from 'react';
import { Calendar, Mail, User, FileText, CheckCircle, Loader2, Send, Clock, AlertCircle } from 'lucide-react';
import { ResumeAnalysis, InterviewQuestion, InterviewSession, InterviewType } from '../types';
import { generateInterviewQuestions, extractTextFromFile, extractCandidateDetails, extractJobDetails } from '../services/geminiService';
import { generateICS, downloadFile } from '../src/lib/calendarUtils';

interface InterviewSchedulerProps {
  candidate?: ResumeAnalysis | null;
  jd?: string;
  user?: any;
  onLoginRequest?: () => void;
  onSchedule: (session: InterviewSession) => void;
  onClose?: () => void;
  onCancel: () => void;
}

const InterviewScheduler: React.FC<InterviewSchedulerProps> = ({ candidate: initialCandidate, jd: initialJd, user, onLoginRequest, onSchedule, onClose, onCancel }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isJdExtracting, setIsJdExtracting] = useState(false);
  const [isJdDetailsExtracting, setIsJdDetailsExtracting] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [coreRequirementsMap, setCoreRequirementsMap] = useState<string>('');
  const [emailBody, setEmailBody] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('recruiter');
  const [language, setLanguage] = useState('English (Indian)');
  const [voicePreference, setVoicePreference] = useState<'male' | 'female'>('female');
  const [voiceName, setVoiceName] = useState('Veena');

  // Manual mode states
  const [manualJd, setManualJd] = useState(initialJd || '');
  const [manualCvText, setManualCvText] = useState(initialCandidate?.extractedText || '');

  useEffect(() => {
    if (initialJd && !manualJd) {
      setManualJd(initialJd);
    }
  }, [initialJd]);

  const [manualCandidateName, setManualCandidateName] = useState(initialCandidate?.candidateName || '');
  const [manualDesignation, setManualDesignation] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualCandidateEmail, setManualCandidateEmail] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState(user?.email || '');

  useEffect(() => {
    if (user?.email && !recruiterEmail) {
      setRecruiterEmail(user.email);
    }
  }, [user]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCvFile(file);
    setIsExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      setManualCvText(text);
      
      // Auto-extract candidate details
      const details = await extractCandidateDetails(text);
      if (details.name) setManualCandidateName(details.name);
      if (details.email) setManualCandidateEmail(details.email);
      
    } catch (err) {
      console.error("Failed to extract text:", err);
      alert("Failed to extract text from CV file. Please try pasting it manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractJobDetails = async () => {
    const activeJd = initialJd || manualJd;
    if (!activeJd) {
        alert("Please provide the Job Description first.");
        return;
    }
    setIsJdDetailsExtracting(true);
    try {
        const details = await extractJobDetails(activeJd);
        if (details.company && details.company !== "Unknown") setManualCompany(details.company);
        if (details.role && details.role !== "Unknown") setManualDesignation(details.role);
    } catch (err) {
        console.error("Failed to extract details:", err);
        alert("Failed to extract details from JD.");
    } finally {
        setIsJdDetailsExtracting(false);
    }
  };

  const handleJdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsJdExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      setManualJd(text);
      
      // Auto-extract company and role
      setIsJdDetailsExtracting(true);
      try {
        const details = await extractJobDetails(text);
        if (details.company && details.company !== "Unknown") setManualCompany(details.company);
        if (details.role && details.role !== "Unknown") setManualDesignation(details.role);
      } catch (detailsErr) {
        console.error("Failed to auto-extract job details:", detailsErr);
      } finally {
        setIsJdDetailsExtracting(false);
      }
    } catch (err) {
      console.error("Failed to extract JD text:", err);
      alert("Failed to extract text from JD file. Please try pasting it manually.");
    } finally {
      setIsJdExtracting(false);
    }
  };

  const handleGenerateQuestions = async () => {
    const activeJd = initialJd || manualJd;
    const activeCvText = initialCandidate?.extractedText || manualCvText;
    const activeName = initialCandidate?.candidateName || manualCandidateName;

    if (!activeJd || !activeCvText) {
      alert("Please provide both Job Description and CV text/file first.");
      return;
    }

    setIsGenerating(true);
    try {
      const { questions: qs, coreRequirementsMap } = await generateInterviewQuestions(activeJd, activeCvText, interviewType);
      setQuestions(qs);
      
      const newSessionId = Math.random().toString(36).substring(7);
      setSessionId(newSessionId);
      
      // Store coreRequirementsMap in the session object later when saving
      // For now, we can just keep it in state or pass it to the session creation
      // Let's add a state for it
      setCoreRequirementsMap(coreRequirementsMap);
      
      // Generate a nice email body
      const interviewLink = `https://smartscout.online/?interviewId=${newSessionId}`;
      
      let roundName = "Recruiter Round";
      if (interviewType === 'consultant') roundName = "Consultant Interest Check";
      if (interviewType === 'functional') roundName = "Functional/Technical Round";

      const body = `Dear ${activeName},

I hope this email finds you well.

Following a review of your impressive background and experience, we are pleased to invite you to the ${roundName} for the ${manualDesignation || 'Head of Department'} position at ${manualCompany || 'our company'}.

At ${manualCompany || 'our company'}, we value innovation and efficiency. To that end, we utilize an advanced AI-driven audio interview platform. This interactive session is designed to allow you to showcase your professional journey and expertise in a conversational format.

Interview Details:
• Position: ${manualDesignation || 'Head of Department'}
• Round: ${roundName}
• Format: Interactive AI Audio Interview
• Estimated Duration: 15 minutes
• Scheduled Time: [DATE] at [TIME]
• Access Link: ${interviewLink}

Preparation Tips:
• Ensure you are in a quiet environment.
• Use a stable internet connection.
• A headset/microphone is recommended for the best audio quality.

We look forward to hearing your insights.

Best regards,

The Talent Acquisition Team
${manualCompany || 'Smart Scout Recruitment'}`;
      setEmailBody(body);
    } catch (err) {
      console.error(err);
      alert("Failed to generate questions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuestionChange = (index: number, newQuestion: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index].question = newQuestion;
    setQuestions(updatedQuestions);
  };

  const renderQuestions = () => {
    if (questions.length === 0) return null;
    return (
      <div className="mt-6 p-4 bg-slate-800 rounded-xl">
        <h4 className="text-lg font-bold text-white mb-4">Generated Questions:</h4>
        <ul className="space-y-4">
          {questions.map((q, i) => (
            <li key={i} className="text-slate-300 text-sm flex flex-col space-y-2">
              <span className="font-bold text-indigo-400">Question {i + 1}</span>
              <textarea
                value={q.question}
                onChange={(e) => handleQuestionChange(i, e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 min-h-[60px] focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all resize-y"
              />
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const handleSchedule = () => {
    if (!scheduledDate || !scheduledTime) {
      alert("Please select a date and time for the interview.");
      return;
    }
    
    const activeName = initialCandidate?.candidateName || manualCandidateName;
    const activeEmail = manualCandidateEmail || (initialCandidate?.candidateName ? 'candidate@example.com' : '');
    const activeJd = initialJd || manualJd;
    const activeCvText = initialCandidate?.extractedText || manualCvText;

    if (!activeName || !activeEmail || !recruiterEmail) {
      alert("Please ensure candidate name, email, and recruiter email are provided.");
      return;
    }

    if (!activeEmail.includes('@') || !recruiterEmail.includes('@')) {
      alert("Please provide valid email addresses.");
      return;
    }

    const startTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const finalSessionId = sessionId || Math.random().toString(36).substring(7);
    const interviewLink = `https://smartscout.online/?interviewId=${finalSessionId}`;
    
    const session: InterviewSession = {
      id: finalSessionId,
      user_id: user?.id || null,
      candidateName: activeName,
      candidateEmail: activeEmail,
      recruiterEmail: recruiterEmail,
      jd: activeJd,
      cvText: activeCvText,
      questions,
      responses: [],
      status: 'scheduled',
      interviewType: interviewType,
      scheduledAt: startTime.toISOString(),
      emailBody: emailBody.replace('[DATE]', scheduledDate || 'YYYY-MM-DD').replace('[TIME]', scheduledTime || 'HH:MM'),
      designation: manualDesignation,
      company: manualCompany,
      language,
      voicePreference,
      voiceName,
      coreRequirementsMap
    };
    
    setIsSent(true);
    
    // Trigger real email invitation via backend
    fetch('/api/send-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateEmail: activeEmail,
        candidateName: activeName,
        designation: manualDesignation,
        company: manualCompany,
        jd: activeJd,
        emailBody: session.emailBody,
        scheduledAt: startTime.toISOString(),
        interviewLink
      })
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send email');
      }
      return res.json();
    })
    .catch(err => {
      console.error('Failed to send invitation email:', err);
      alert(`Email Error: ${err.message}`);
    });
    
    // Real action: Generate and download .ics
    const ics = generateICS(activeName, recruiterEmail, startTime);
    downloadFile(ics, `${activeName.replace(/\s+/g, '_')}_Interview.ics`, 'text/calendar');
    
    onSchedule(session);
    if (onClose) {
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  if (isSent) {
    const activeName = initialCandidate?.candidateName || manualCandidateName;
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6 glass-panel rounded-2xl border-green-500/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/20 to-transparent"></div>
        <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Interview Scheduled</h3>
          <p className="text-slate-400 text-sm font-medium">Calendar invite (.ics) generated and email sent to {activeName}.</p>
          <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-widest font-bold">Final assessment report will be sent to: {recruiterEmail}</p>
          <div className="mt-8 flex flex-col items-center space-y-4">
             <div className="flex items-center space-x-2 bg-slate-950 p-3 rounded-xl border border-slate-800 w-full max-w-md shadow-inner">
               <input 
                 readOnly 
                 value={`https://smartscout.online/?interviewId=${sessionId}`}
                 className="bg-transparent text-[10px] text-indigo-400 outline-none flex-1 px-2 font-mono"
               />
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText(`https://smartscout.online/?interviewId=${sessionId}`);
                   alert('Link copied to clipboard!');
                 }}
                 className="p-2 hover:bg-slate-900 rounded-lg text-indigo-500 transition-colors"
                 title="Copy Interview Link"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
               </button>
             </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
                <button 
                  onClick={() => {
                    const inviteText = encodeURIComponent(`Hi ${activeName}, you have been invited to complete your AI Audio Interview for the ${manualDesignation || 'position'} role at ${manualCompany || 'our company'}. Please click this link to verify your identity and start your interview: https://smartscout.online/?interviewId=${sessionId}`);
                    window.open(`https://api.whatsapp.com/send?text=${inviteText}`, '_blank');
                  }}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all border border-emerald-400/30 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.802.001-2.618-1.01-5.08-2.86-6.931-1.85-1.85-4.311-2.862-6.93-2.863-5.41 0-9.808 4.397-9.81 9.81-.001 1.73.457 3.42 1.32 4.927l-.994 3.634 3.733-.979zm11.233-7.234c.3-.15.495-.247.585-.397.09-.15.09-.87-.075-1.35-.165-.48-.675-.675-.975-.825-.3-.15-1.275-.47-2.43-.15-1.155.32-2.13 1.055-2.85 1.775-.72.72-2.31 3.54-2.31 5.34 0 1.8 1.17 2.685 1.59 3.135.42.45.825.375 1.125.225.3-.15.675-.675.825-.975.15-.3.225-.6.075-.9-.15-.3-.675-.825-.975-1.125-.3-.3-.63-.45-.3-.975.33-.525.96-1.545 1.395-2.025.435-.48.675-.375.975-.225z"/></svg>
                  <span>Invite via WhatsApp</span>
                </button>
                <button 
                  onClick={() => setIsSent(false)}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl transition-all border border-slate-800 text-[10px] font-bold uppercase tracking-widest w-full sm:w-auto"
                >
                  Schedule Another
                </button>
              </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8 p-3 sm:p-6">
      <button 
        onClick={onCancel}
        className="flex items-center space-x-2 text-slate-500 hover:text-indigo-400 transition-colors text-[10px] font-bold uppercase tracking-widest"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        <span>Cancel & Return to Dashboard</span>
      </button>

      <div className="glass-panel p-5 sm:p-8 rounded-2xl border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
        <div className="flex items-center space-x-4 mb-6 sm:mb-8">
          <div className="p-3 bg-indigo-600/20 rounded-xl text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em]">Interview Scheduling</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Schedule Interview</h2>
            <p className="text-slate-500 text-sm font-medium">
              {initialCandidate?.candidateName ? `Candidate: ${initialCandidate.candidateName}` : 'Set up a new interview session'}
            </p>
          </div>
        </div>

        {!initialCandidate?.candidateName && (
          <div className="grid md:grid-cols-2 gap-6 mb-8 p-6 bg-slate-900/50 rounded-2xl border border-slate-800 relative">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"></div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">01. Candidate & Recruiter Info</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Candidate Full Name (Auto-extracted)"
                  value={manualCandidateName}
                  onChange={(e) => setManualCandidateName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                />
                <input
                  type="text"
                  placeholder="Designation"
                  value={manualDesignation}
                  onChange={(e) => setManualDesignation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                />
                <input
                  type="email"
                  placeholder="Candidate Email Address (Auto-extracted)"
                  value={manualCandidateEmail}
                  onChange={(e) => setManualCandidateEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                />
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Send Report To (Recruiter Email)</label>
                  <input
                    type="email"
                    placeholder="Your Email Address"
                    value={recruiterEmail}
                    onChange={(e) => setRecruiterEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">02. Documents</h3>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="file"
                    id="cv-upload"
                    className="hidden"
                    onChange={handleCvUpload}
                    accept=".pdf,.doc,.docx,.txt"
                  />
                  <label
                    htmlFor="cv-upload"
                    className="flex items-center justify-center space-x-2 w-full bg-slate-950 border border-dashed border-slate-700 hover:border-indigo-500/50 rounded-lg py-2 px-4 text-slate-500 hover:text-white cursor-pointer transition-all text-xs"
                  >
                    {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    <span>{cvFile ? cvFile.name : 'Upload Candidate CV'}</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    id="jd-upload-manual"
                    className="hidden"
                    onChange={handleJdUpload}
                    accept=".pdf,.docx,.txt"
                  />
                  <label
                    htmlFor="jd-upload-manual"
                    className={`flex items-center justify-center space-x-2 w-full bg-slate-950 border border-dashed border-slate-700 hover:border-indigo-500/50 rounded-lg py-2 px-4 text-slate-500 hover:text-white cursor-pointer transition-all mb-2 text-xs ${isJdExtracting ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {isJdExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    <span>{isJdExtracting ? 'Extracting JD...' : 'Upload JD File'}</span>
                  </label>
                </div>
                <textarea
                  placeholder={isJdExtracting ? "Extracting JD text..." : "Paste Job Description here..."}
                  value={manualJd}
                  onChange={(e) => setManualJd(e.target.value)}
                  onBlur={() => {
                    if (manualJd && (!manualCompany || !manualDesignation)) {
                      handleExtractJobDetails();
                    }
                  }}
                  disabled={isJdExtracting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-white text-xs h-24 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none disabled:opacity-50"
                />
                {isJdDetailsExtracting && (
                  <div className="w-full text-[10px] font-bold text-indigo-400 flex items-center justify-center gap-2 py-2 uppercase tracking-widest">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Auto-extracting Company & Role...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Interview Configuration</label>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="block text-[8px] uppercase font-bold text-slate-600 tracking-widest">Interview Round Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['consultant', 'recruiter', 'functional'] as InterviewType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setInterviewType(type)}
                        className={`py-2 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                          interviewType === type 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
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

            <div className="space-y-4">
              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Select Date & Time</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-xs [color-scheme:dark]"
                  />
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-xs [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-widest">Interview Questions</label>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={isGenerating}
                  className="text-[9px] font-bold text-indigo-500 hover:text-indigo-400 flex items-center space-x-1 disabled:opacity-50 uppercase tracking-widest"
                >
                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                  <span>{questions.length > 0 ? 'Regenerate' : 'Generate with AI'}</span>
                </button>
              </div>
              
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner">
                {questions.length > 0 ? (
                  <div className="space-y-4">
                    {questions.map((q, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 group hover:border-indigo-500/30 transition-colors">
                        <p className="text-[9px] font-bold text-indigo-500 mb-1 uppercase tracking-widest">Question 0{idx + 1}</p>
                        <textarea
                          value={q.question}
                          onChange={(e) => handleQuestionChange(idx, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 min-h-[60px] focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all resize-y"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3 py-10">
                    <AlertCircle className="w-10 h-10 opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No questions generated yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Email Invitation Draft</label>
              <textarea
                value={emailBody.replace('[DATE]', scheduledDate || 'YYYY-MM-DD').replace('[TIME]', scheduledTime || 'HH:MM')}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 min-h-[350px] focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none text-left leading-relaxed shadow-inner"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleSchedule}
            disabled={!scheduledDate || !scheduledTime || questions.length === 0}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold uppercase tracking-widest flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Send className="w-4 h-4" />
            <span>Send Invitation & Schedule</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewScheduler;
