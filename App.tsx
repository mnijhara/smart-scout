import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import JDInput from './components/JDInput';
import CandidateUploader from './components/CandidateUploader';
import AnalysisDashboard from './components/AnalysisDashboard';
import AnalyticsView from './components/AnalyticsView';
import PoolManagement from './components/PoolManagement';
import PostingAssistantModal from './components/PostingAssistantModal';
import BuyCreditsModal from './components/BuyCreditsModal';
import Pricing from './components/Pricing';
import DemoNarration from './components/DemoNarration';
import { 
  analyzeResumes, 
  generateInitialChatMessage, 
  analyzeProfileFromUrl, 
  extractTextFromFile,
} from './services/geminiService';
import AudioInterview from './components/AudioInterview';
import { CheckCircle } from 'lucide-react';
import InterviewScheduler from './components/InterviewScheduler';
import BulkInterviewScheduler from './components/BulkInterviewScheduler';
import { 
  ResumeAnalysis, 
  ChatMessage, 
  TalentDensityReport, 
  InterviewSession, 
  InterviewReport 
} from './types';
import { 
  DUMMY_JD, 
  createDummyCvFiles, 
  DUMMY_ANALYSIS_RESULTS, 
  DUMMY_TALENT_DENSITY_REPORT, 
  DUMMY_INITIAL_CHAT_MESSAGE 
} from './utils/demoData';
import { 
  supabase, 
  updateUserCredits, 
  saveBenchmarkingSession,
  saveInterviewSession,
  getInterviewSession
} from './services/supabase';

const App: React.FC = () => {
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') + 1));
    return (searchParams.get('interviewId') || hashParams.get('interviewId')) ? 'interview' : 'dashboard';
  });
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPostingAssistant, setShowPostingAssistant] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  
  // User Session
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);

  // Core Data
  const [jd, setJd] = useState('');
  const [candidates, setCandidates] = useState<File[]>([]);
  const [results, setResults] = useState<ResumeAnalysis[]>([]);
  const [talentDensity, setTalentDensity] = useState<TalentDensityReport | null>(null);
  const [initialChatMessage, setInitialChatMessage] = useState<ChatMessage | null>(null);

  // Audio Interview State
  const [interviewSessions, setInterviewSessions] = useState<InterviewSession[]>([]);
  const [activeInterviewSession, setActiveInterviewSession] = useState<InterviewSession | null>(null);
  const [schedulingCandidate, setSchedulingCandidate] = useState<ResumeAnalysis | null>(null);
  const [interviewComplete, setInterviewComplete] = useState(false);

  // Status & Progress
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ count: number, total: number, fileName: string } | null>(null);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState<'none' | 'intro' | 'posting' | 'sourcing' | 'analysis' | 'results' | 'comparison' | 'outreach'>('none');
  const [demoNarration, setDemoNarration] = useState('');

  const resultsRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const unsubscribeCreditsRef = useRef<(() => void) | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<{ title: string; message: string } | null>(null);

  const handlePurchase = (credits: number, priceId: string, packageName: string) => {
    if (!user) {
      setAuthMode('register');
      setShowAuth(true);
      return;
    }
    // Stripe handles the redirect now, this is just a fallback or for local testing
    console.log(`Initiating purchase for ${packageName} (${credits} credits) with priceId ${priceId}`);
  };

  // Handle Stripe Success/Cancel
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatus = searchParams.get('payment');
    const creditsToAdd = searchParams.get('credits');
    const packageName = searchParams.get('package');

    if (paymentStatus === 'success' && creditsToAdd && user) {
      const numCredits = parseInt(creditsToAdd);
      updateUserCredits((credits || 0) + numCredits).then(updated => {
        if (updated !== null) setCredits(updated);
        setShowSuccess({
          title: 'Payment Successful!',
          message: `Your purchase of ${packageName} was successful. ${numCredits} credits have been added to your account.`
        });
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    } else if (paymentStatus === 'cancel') {
      // Handle cancel if needed
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, credits]);

  // Auth & Credits Effect
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state changed:", _event, session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Cleanup previous listener if it exists
      if (unsubscribeCreditsRef.current) {
        unsubscribeCreditsRef.current();
        unsubscribeCreditsRef.current = null;
      }

      if (currentUser) {
        setShowAuth(false);
        // Listen to user document for credits
        const { onSnapshot, doc } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        
        unsubscribeCreditsRef.current = onSnapshot(doc(db, 'users', currentUser.id), (docSnap) => {
          if (docSnap.exists()) {
            setCredits(docSnap.data().credits ?? 0);
          } else {
            // Initialize credits for new user
            setCredits(10);
          }
        });
      } else {
        setCredits(0);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (unsubscribeCreditsRef.current) {
        unsubscribeCreditsRef.current();
      }
    };
  }, []);

  useEffect(() => {
    console.log("App state - activeTab:", activeTab, "activeInterviewSession:", !!activeInterviewSession);
  }, [activeTab, activeInterviewSession]);

  // Interview Link Effect
  const interviewHandledRef = useRef(false);
  const [isCandidateView, setIsCandidateView] = useState(() => {
    if (typeof window === 'undefined') return false;
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') + 1));
    return !!(searchParams.get('interviewId') || hashParams.get('interviewId'));
  });

  useEffect(() => {
    const checkCandidateView = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') + 1));
      const hasId = !!(searchParams.get('interviewId') || hashParams.get('interviewId'));
      setIsCandidateView(hasId);
      return hasId;
    };

    const handleUrlParams = async () => {
      const hasId = checkCandidateView();
      if (!hasId) {
        setIsInitializing(false);
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') + 1));
      const interviewId = searchParams.get('interviewId') || hashParams.get('interviewId');
      
      console.log("Checking for interviewId. Found:", interviewId, "Handled:", interviewHandledRef.current);
      
      if (interviewId && !interviewHandledRef.current) {
        try {
          const session = await getInterviewSession(interviewId);
          if (session) {
            setActiveInterviewSession(session as InterviewSession);
            setActiveTab('interview');
            interviewHandledRef.current = true;
            setInterviewError(null);
          } else {
            setInterviewError("This interview link appears to be invalid or has expired. Please contact your recruiter for a new link.");
          }
        } catch (error) {
          console.error("Failed to load interview session:", error);
          setInterviewError("There was a problem loading your interview. Please try refreshing the page.");
        } finally {
          setIsInitializing(false);
        }
      } else {
        setIsInitializing(false);
      }
    };

    handleUrlParams();
    
    const onPopState = () => {
      interviewHandledRef.current = false; 
      handleUrlParams();
    };
    
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleStartAnalysis = async () => {
    if (!jd.trim() || candidates.length === 0) return;
    
    // Check credits
    if (user && (credits || 0) < candidates.length) {
        setShowBuyCredits(true);
        return;
    }

    setIsAnalyzing(true);
    setResults([]);
    setInitialChatMessage(null);

    try {
      const analysisResults = await analyzeResumes(jd, candidates, (count, total, fileName) => {
        setAnalysisProgress({ count, total, fileName });
      });
      
      setResults(analysisResults);
      
      const chatMsgText = await generateInitialChatMessage(analysisResults);
      setInitialChatMessage({ role: 'model', text: chatMsgText });

      // Save to history and update credits if logged in
      if (user) {
        await saveBenchmarkingSession(user.id, "Resume Analysis", jd, analysisResults);
        const newCredits = Math.max(0, (credits || 0) - candidates.length);
        const updatedCredits = await updateUserCredits(newCredits);
        if (updatedCredits !== null) setCredits(updatedCredits);
      }

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);

    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const startMagicDemo = async () => {
    if (isDemoRunning) return;
    setIsDemoRunning(true);
    setActiveTab('dashboard');
    setResults([]);
    setJd('');
    setCandidates([]);
    
    // Step 1: Intro
    setDemoStep('intro');
    setDemoNarration("Welcome! I'll show you how Smart Scout finds the needle in the haystack.");
    await new Promise(r => setTimeout(r, 3000));

    // Step 2: JD Creation
    setDemoStep('posting');
    setDemoNarration("I'm inputting a Senior Engineer JD. Note the specific requirements for AWS and leadership.");
    setJd(DUMMY_JD);
    await new Promise(r => setTimeout(r, 2500));

    // Step 3: Candidate Sourcing
    setDemoStep('sourcing');
    setDemoNarration("Next, I'll upload 7 candidates. Our AI parses PDF, Word, and Text files instantly.");
    setCandidates(createDummyCvFiles());
    await new Promise(r => setTimeout(r, 3000));

    // Step 4: Analysis
    setDemoStep('analysis');
    setIsAnalyzing(true);
    setDemoNarration("Smart Scout is now scoring candidates based on technical mastery, experience, and role fit.");
    
    const dummyFiles = createDummyCvFiles();
    for (let i = 0; i < dummyFiles.length; i++) {
        setAnalysisProgress({ count: i + 1, total: dummyFiles.length, fileName: dummyFiles[i].name });
        await new Promise(r => setTimeout(r, 800));
    }

    // Step 5: Results Visualization
    setDemoStep('results');
    setIsAnalyzing(false);
    setAnalysisProgress(null);
    setResults(DUMMY_ANALYSIS_RESULTS);
    setTalentDensity(DUMMY_TALENT_DENSITY_REPORT);
    setInitialChatMessage({ role: 'model', text: DUMMY_INITIAL_CHAT_MESSAGE });
    setDemoNarration("Analysis complete! Rohan Gupta is our standout candidate with a 96% score.");
    
    setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 500);
    await new Promise(r => setTimeout(r, 4000));

    // Step 6: Comparison Modal
    setDemoStep('comparison');
    setDemoNarration("Notice how Rohan's 10+ years of infrastructure experience compares to Amit's backend focus.");
    await new Promise(r => setTimeout(r, 12000));

    // Step 7: Transition to Outreach
    setDemoStep('results');
    setDemoNarration("Closing the report. Let's reach out to our top pick.");
    await new Promise(r => setTimeout(r, 3000));

    // Step 8: Outreach Modal
    setDemoStep('outreach');
    setDemoNarration("I've drafted a hyper-personalized email for Rohan, mentioning his Kubernetes skills.");
    await new Promise(r => setTimeout(r, 8000));

    // Wrap Up
    setDemoStep('none');
    setDemoNarration("Demo finished! You can now explore the interactive dashboard or sign up to analyze your own pool.");
    setIsDemoRunning(false);
    
    setActiveTab('dashboard');
    await new Promise(r => setTimeout(r, 7000));
    setDemoNarration('');
  };

  const handleSourceUrl = async (url: string) => {
    try {
        const file = await analyzeProfileFromUrl(url);
        setCandidates(prev => [...prev, file]);
    } catch (e) {
        console.error("URL Sourcing failed", e);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-t-indigo-500 rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-indigo-400 font-bold tracking-[0.3em] uppercase text-xs">Smart Scout AI</p>
            <p className="text-slate-500 text-sm">Preparing your interview environment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isCandidateView && interviewError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4">
        <div className="max-w-md w-full glass-panel p-6 sm:p-10 rounded-2xl sm:rounded-3xl border-red-500/20 text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Interview Not Found</h2>
            <p className="text-slate-400 leading-relaxed">
              {interviewError}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      user={user} 
      credits={credits}
      onLogout={() => supabase.auth.signOut()}
      onLoginClick={() => { setAuthMode('login'); setShowAuth(true); }}
      onSignUpClick={() => { setAuthMode('register'); setShowAuth(true); }}
      onLoadDemo={startMagicDemo}
      isDemoRunning={isDemoRunning}
      isCandidateView={isCandidateView}
    >
      <DemoNarration text={demoNarration} />

      {activeTab === 'dashboard' && !isCandidateView && (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-fadeIn">
          {/* Dashboard Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em]">System Ready</span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tighter uppercase">Recruiter Dashboard</h2>
              <p className="text-slate-500 text-sm font-medium">AI-Powered Candidate Intelligence & Interview Orchestration</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Credits:</span>
                <span className="text-xs font-bold text-white">{credits ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Top Section: Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:min-h-[600px] items-start">
             <JDInput 
                value={jd} 
                onChange={setJd} 
                onFileChange={async (file) => {
                  try {
                    const text = await extractTextFromFile(file);
                    setJd(text);
                  } catch (err) {
                    console.error("Failed to extract JD text:", err);
                    alert("Failed to extract text from JD file. Please try pasting it manually.");
                  }
                }}
                readOnly={isAnalyzing || isDemoRunning}
                onEdit={() => { setResults([]); setInitialChatMessage(null); }}
                onOpenPostingAssistant={() => setShowPostingAssistant(true)}
             />
             <CandidateUploader 
                files={candidates} 
                onFilesChange={setCandidates} 
                onSourceUrl={handleSourceUrl}
                creditLimit={user ? (credits || 0) : 10}
                onLimitExceeded={() => setShowBuyCredits(true)}
                user={user}
                onSignUpRequest={() => { setAuthMode('register'); setShowAuth(true); }}
                readOnly={isAnalyzing || isDemoRunning}
             />
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={handleStartAnalysis}
                disabled={!jd.trim() || candidates.length === 0 || isAnalyzing || isDemoRunning}
                className="w-full sm:w-auto px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
              >
                {isAnalyzing ? (
                   <>
                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing...
                   </>
                ) : (
                    <>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Score & Rank Candidates
                    </>
                )}
              </button>
              
              {results.length > 0 && !isAnalyzing && (
                  <button onClick={() => { setResults([]); setCandidates([]); setJd(''); }} className="text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
                      Clear Board
                  </button>
              )}
          </div>

          {/* Results View */}
          <div ref={resultsRef} className="pt-8">
            <AnalysisDashboard 
                results={results} 
                isLoading={isAnalyzing} 
                progress={analysisProgress}
                jobDescription={jd}
                onReset={() => { setResults([]); setInitialChatMessage(null); }}
                initialChatMessage={initialChatMessage}
                talentDensityReport={talentDensity}
                demoModalSequence={demoStep}
                onMoveToInterview={(candidate) => {
                  setSchedulingCandidate(candidate);
                  setActiveTab('interview');
                }}
            />
          </div>
        </div>
      )}

      {activeTab === 'analytics' && <AnalyticsView results={results} />}
      {activeTab === 'pool' && <PoolManagement userId={user?.id} />}
      {activeTab === 'pricing' && (
          <Pricing 
            onPurchaseRequest={handlePurchase} 
            onSignUpRequest={() => { setAuthMode('register'); setShowAuth(true); }} 
            userId={user?.id}
          />
      )}

      {activeTab === 'interview' && (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-fadeIn">
          {activeInterviewSession ? (
            <div className="space-y-6">
              {/* Only show back button if user is logged in (recruiter view) AND not in candidate view */}
              {user && !isCandidateView && (
                <button 
                  onClick={() => setActiveInterviewSession(null)}
                  className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                  <span>Back to Sessions</span>
                </button>
              )}
              
              <AudioInterview 
                session={activeInterviewSession} 
                onComplete={async (report) => {
                  const updatedSession = { ...activeInterviewSession, status: 'completed' as const, report };
                  await saveInterviewSession(updatedSession);
                  setInterviewSessions(prev => prev.map(s => s.id === activeInterviewSession.id ? updatedSession : s));
                  setActiveInterviewSession(null);
                  if (!user) setInterviewComplete(true);
                }} 
              />
            </div>
          ) : interviewComplete ? (
            <div className="max-w-2xl mx-auto py-20 px-6 text-center animate-fadeIn">
              <div className="glass-panel p-12 rounded-3xl border-green-500/20 space-y-8">
                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-green-500/30">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold text-white tracking-tight">Interview Complete!</h2>
                  <p className="text-xl text-slate-400 leading-relaxed">
                    Thank you for your time. Your responses have been securely recorded and sent to the recruitment team for review.
                  </p>
                </div>
                <div className="pt-8 border-t border-slate-800">
                  <p className="text-sm text-slate-500">You can now safely close this window.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {schedulingCandidate ? (
                <div className="space-y-6">
                  <button 
                    onClick={() => setSchedulingCandidate(null)}
                    className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors ml-6"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    <span>Back to Bulk Scheduling</span>
                  </button>
                  <InterviewScheduler 
                    candidate={schedulingCandidate} 
                    jd={jd} 
                    user={user}
                    onLoginRequest={() => { setAuthMode('login'); setShowAuth(true); }}
                    onSchedule={async (session) => {
                      await saveInterviewSession(session);
                      setInterviewSessions(prev => [...prev, session]);
                    }}
                    onClose={() => setSchedulingCandidate(null)}
                    onCancel={() => setSchedulingCandidate(null)}
                  />
                </div>
              ) : (
                <div className="space-y-12">
                  <BulkInterviewScheduler 
                    initialJd={jd}
                    user={user}
                    onLoginRequest={() => { setAuthMode('login'); setShowAuth(true); }}
                    onSchedule={async (session) => {
                      await saveInterviewSession(session);
                      setInterviewSessions(prev => [...prev, session]);
                    }}
                  />
                  
                  {interviewSessions.length > 0 && (
                    <div className="max-w-5xl mx-auto px-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white">Interview History</h3>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {interviewSessions.length} Total
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {interviewSessions.map((session) => (
                          <div key={session.id} className="glass-panel p-5 rounded-2xl border-slate-800 hover:border-indigo-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                              <div className="min-w-0">
                                <h4 className="font-bold text-white truncate">{session.candidateName}</h4>
                                <p className="text-xs text-slate-500 truncate">{session.candidateEmail}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest ${
                                session.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                                session.status === 'analyzed' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {session.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                              <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] text-slate-400">
                                  {session.questions.length}Q
                                </div>
                              </div>
                              <button 
                                onClick={() => setActiveInterviewSession(session)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-indigo-500/10"
                              >
                                {session.status === 'completed' ? 'View Results' : 'Open Hub'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showAuth && (
          <Auth 
            initialMode={authMode} 
            onLogin={(u) => { setUser(u); setShowAuth(false); }} 
            onClose={() => setShowAuth(false)} 
          />
      )}
      
      {showPostingAssistant && (
          <PostingAssistantModal 
            jobDescription={jd} 
            onClose={() => setShowPostingAssistant(false)} 
          />
      )}

      {showBuyCredits && (
          <BuyCreditsModal 
            onClose={() => setShowBuyCredits(false)} 
            onViewPlans={() => { setActiveTab('pricing'); setShowBuyCredits(false); }} 
          />
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setShowSuccess(null)}>
          <div className="w-full max-w-md bg-slate-900 rounded-3xl p-8 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-6 border border-emerald-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{showSuccess.title}</h2>
            <p className="text-slate-400 text-sm mb-8">{showSuccess.message}</p>
            <button 
              onClick={() => setShowSuccess(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Great!
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;