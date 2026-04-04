import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Play, Square, CheckCircle, AlertCircle, Loader2, FileText, Download, Mail, Send, ChevronRight } from 'lucide-react';
import { InterviewSession, InterviewQuestion, InterviewReport } from '../types';
import { analyzeInterviewResponses, generateNextInterviewQuestion, transcribeAndGenerateNextQuestion } from '../services/geminiService';
import { updateInterviewSession } from '../services/supabase';
import jsPDF from 'jspdf';

interface AudioInterviewProps {
  session: InterviewSession;
  onComplete: (report: InterviewReport) => void;
}

const AudioInterview: React.FC<AudioInterviewProps> = ({ session, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [responses, setResponses] = useState<{ question: string, answer: string }[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [interviewState, setInterviewState] = useState<'idle' | 'healthCheck' | 'greeting' | 'interviewing' | 'completed'>('idle');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isHealthCheckPassed, setIsHealthCheckPassed] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    let lang = session.language || 'English (Indian)';
    if (lang === 'English') lang = 'English (Indian)';
    
    const map: Record<string, string> = {
      'English (Indian)': 'en-IN',
      'English (US)': 'en-US',
      'English (UK)': 'en-GB',
      'Hindi': 'hi-IN',
      'Punjabi': 'pa-IN',
      'Marathi': 'mr-IN',
      'Tamil': 'ta-IN',
      'Telugu': 'te-IN',
      'Kannada': 'kn-IN',
      'Bengali': 'bn-IN',
      'Gujarati': 'gu-IN',
      'Malayalam': 'ml-IN',
      'Spanish': 'es-ES',
      'French': 'fr-FR',
      'German': 'de-DE'
    };
    return map[lang] || 'en-IN';
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string>('');
  const [isFinalQuestion, setIsFinalQuestion] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('Analyzing response...');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [lastVibe, setLastVibe] = useState<{ confidence: number, clarity: number, enthusiasm: number } | null>(null);
  const [latency, setLatency] = useState<number>(0);

  const thinkingMessages = [
    'Analyzing response...',
    'Evaluating technical depth...',
    'Synthesizing follow-up...',
    'Checking alignment...',
    'Assessing clarity...'
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isThinking) {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % thinkingMessages.length;
        setThinkingMessage(thinkingMessages[i]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isThinking]);

  const hasStartedRef = useRef(hasStarted);
  const interviewStateRef = useRef(interviewState);
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => { hasStartedRef.current = hasStarted; }, [hasStarted]);
  useEffect(() => { interviewStateRef.current = interviewState; }, [interviewState]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [silenceProgress, setSilenceProgress] = useState(0);
  const silenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
    
    setSilenceProgress(0);
    const duration = 8000; // 8 seconds of silence to auto-stop
    const interval = 50;
    let elapsed = 0;
    
    silenceIntervalRef.current = setInterval(() => {
      elapsed += interval;
      setSilenceProgress((elapsed / duration) * 100);
    }, interval);

    silenceTimerRef.current = setTimeout(() => {
      if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
      console.log('Silence detected, stopping recording...');
      stopRecording();
    }, duration);
  };

  useEffect(() => {
    // Initialize Speech Synthesis
    synthesisRef.current = window.speechSynthesis;
    
    const loadVoices = () => {
      if (!synthesisRef.current) return;
      const voices = synthesisRef.current.getVoices();
      if (voices.length > 0) {
        console.log('Voices loaded:', voices.length);
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Fallback for Chrome: check again after a short delay
    const chromeVoiceCheck = setTimeout(loadVoices, 1000);

    // Pre-initialize audio stream for visualizer
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
      } catch (err) {
        console.warn('Microphone access denied for visualizer:', err);
      }
    };
    initAudio();

    return () => {
      if (synthesisRef.current) synthesisRef.current.cancel();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
      if (audioStream) audioStream.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (availableVoices.length > 0) {
      const langPrefix = selectedLanguage.split('-')[0];
      const langVoices = availableVoices.filter(v => v.lang.startsWith(langPrefix));
      
      let preferredVoice = null;
      
      // 1. Try to find by specific voice name (e.g., Rishi, Veena)
      if (session.voiceName) {
        preferredVoice = availableVoices.find(v => v.name.toLowerCase().includes(session.voiceName!.toLowerCase()));
      }
      
      // 2. Try to find by language and preference (male/female)
      if (!preferredVoice && session.voicePreference) {
        const isMale = session.voicePreference === 'male';
        
        // Try exact language match first
        preferredVoice = langVoices.find(v => 
          v.lang === selectedLanguage && 
          (isMale ? v.name.toLowerCase().includes('male') : (v.name.toLowerCase().includes('female') || !v.name.toLowerCase().includes('male')))
        );
        
        // Try any voice in that language family
        if (!preferredVoice) {
          preferredVoice = langVoices.find(v => 
            isMale ? v.name.toLowerCase().includes('male') : (v.name.toLowerCase().includes('female') || !v.name.toLowerCase().includes('male'))
          );
        }
      }

      // 3. Last resort fallbacks
      if (!preferredVoice) {
        preferredVoice = langVoices.find(v => v.lang === selectedLanguage && !v.name.toLowerCase().includes('male')) || 
                         langVoices.find(v => v.lang === selectedLanguage) ||
                         langVoices[0] ||
                         availableVoices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('male')) ||
                         availableVoices.find(v => v.lang.startsWith('en')) || 
                         availableVoices[0];
      }
      setSelectedVoice(preferredVoice);
    }
  }, [availableVoices, selectedLanguage, session.voicePreference, session.voiceName]);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm'; // Fallback
  };

  const startRecording = async () => {
    console.log('startRecording called. State:', interviewStateRef.current, 'isListening:', isListening);
    try {
      let stream = audioStream;
      if (!stream || !stream.active) {
        console.log('Requesting new audio stream...');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
      }
      
      // Mic level monitoring
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyzer = audioContextRef.current.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      const updateLevel = () => {
        if (interviewStateRef.current !== 'completed' && interviewStateRef.current !== 'idle') {
          analyzer.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setMicLevel(average);
          if (average > 25) setIsHealthCheckPassed(true);
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      // Only start MediaRecorder if we are actually recording an answer/consent
      if (interviewStateRef.current === 'greeting' || interviewStateRef.current === 'interviewing') {
        const mimeType = getSupportedMimeType();
        console.log('Starting MediaRecorder with mimeType:', mimeType);
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.onstart = () => {
          console.log('MediaRecorder started');
        };

        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
        };

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped. Chunks:', audioChunksRef.current.length);
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('Created blob:', blob.size, blob.type);
          if (blob.size < 100) {
            console.warn('Blob too small, likely no audio captured');
            setIsThinking(false);
            setIsListening(true);
            return;
          }
          setAudioBlob(blob);
          await processAudioAnswer(blob);
        } else {
          console.warn('No audio chunks captured');
          setIsThinking(false);
          setIsListening(true);
        }
      };

        mediaRecorder.start();
        setIsRecording(true);
        setIsListening(true);
        startSilenceTimer();
      } else {
        console.log('MediaRecorder NOT started (Health Check mode)');
        setIsRecording(false);
        setIsListening(false);
      }
    } catch (err) {
      console.error('Error in startRecording:', err);
      setError('Microphone access denied or not available. Please check your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  };

  const finalizeInterview = async (newResponses: { question: string, answer: string }[]) => {
    setInterviewState('completed');
    setIsAnalyzing(true);
    try {
      const report = await analyzeInterviewResponses(
        session.jd,
        session.cvText || '',
        newResponses,
        session.interviewType
      );
      
      // Trigger Webhook if available
      if (session.webhookUrl) {
        try {
          await fetch(session.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'INTERVIEW_COMPLETED',
              candidate: session.candidateName,
              email: session.candidateEmail,
              report
            })
          });
        } catch (err) {
          console.error('Webhook failed:', err);
        }
      }

      // Send report to recruiter via email
      if (session.recruiterEmail) {
        try {
          await fetch('/api/send-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recruiterEmail: session.recruiterEmail,
              candidateName: report.candidateName,
              overallScore: report.overallScore,
              status: report.status,
              reason: report.reason,
              parameters: report.parameters,
              responses: report.responses,
              emailBody: session.emailBody
            })
          });
        } catch (emailErr) {
          console.error('Failed to trigger email report:', emailErr);
        }
      }
      
      // Mark interview as completed
      await updateInterviewSession(session.id, { status: 'completed' });
      
      onComplete(report);
    } catch (err) {
      setError('Failed to analyze interview responses.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processAudioAnswer = async (blob: Blob) => {
    if (isAnalyzing || isThinking || interviewState === 'healthCheck') {
      console.log('Skipping audio processing. State:', { isAnalyzing, isThinking, interviewState });
      return;
    }
    
    setIsThinking(true);
    const startTime = Date.now();
    console.log('Processing audio answer. Blob size:', blob.size);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Audio = await base64Promise;
      if (!base64Audio) throw new Error('Failed to encode audio');

      console.log('Sending audio to Gemini for transcription and next question...');
      const mimeType = getSupportedMimeType();
      const result = await transcribeAndGenerateNextQuestion(
        base64Audio,
        mimeType,
        session.jd,
        session.cvText || '',
        responses,
        currentQuestionIndex + 1,
        session.interviewType,
        session.language || 'English'
      );

      console.log('Gemini response received:', result);
      setLatency(Date.now() - startTime);
      const candidateAnswer = result.transcription;
      setTranscript(candidateAnswer);
      if (result.vibeAnalysis) setLastVibe(result.vibeAnalysis);
      
      // Handle consent in greeting stage
      if (interviewState === 'greeting') {
        const lowerTranscript = candidateAnswer.toLowerCase();
        const positiveWords = ['yes', 'sure', 'ok', 'okay', 'proceed', 'go ahead', 'ready', 'accept', 'i do', 'yeah', 'yep', 'yup', 'yes please', 'absolutely'];
        const hasConsent = positiveWords.some(word => lowerTranscript.includes(word));
        
        if (hasConsent) {
          setInterviewState('interviewing');
          setCurrentQuestionIndex(0);
          const firstQuestion = session.questions[0].question;
          setActiveQuestion(firstQuestion);
          setResponses([]);
          setTimeout(() => speak(firstQuestion), 500);
        } else {
          const repeatGreeting = "I'm sorry, I didn't catch that. Do you accept to proceed with this interview and have it recorded? Please say 'Yes' or 'Accept' to begin.";
          speak(repeatGreeting);
        }
        return;
      }

      const currentQuestionText = activeQuestion || session.questions[currentQuestionIndex].question;
      const newResponses = [...responses, { question: currentQuestionText, answer: candidateAnswer }];
      setResponses(newResponses);

      if (result.nextQuestion.isFinal || currentQuestionIndex >= 5) {
        stopRecording();
        await finalizeInterview(newResponses);
      } else {
        setActiveQuestion(result.nextQuestion.question);
        setCurrentQuestionIndex(prev => prev + 1);
        setIsFinalQuestion(result.nextQuestion.isFinal);
        
        // Speak the next question
        setTimeout(() => {
          speak(result.nextQuestion.question);
        }, 1000);
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(`Failed to process your answer: ${err instanceof Error ? err.message : 'Unknown error'}. Please try speaking again.`);
      setIsListening(true);
    } finally {
      setIsThinking(false);
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (interviewState === 'interviewing' && transcript) {
      // Keep transcript updated
    }
  }, [transcript, interviewState]);

  const speak = (text: string) => {
    console.log('Attempting to speak:', text);
    if (!synthesisRef.current) {
      console.error('Speech synthesis not supported');
      setError('Your browser does not support speech synthesis. Please use a modern browser like Chrome or Safari.');
      // Fallback: move to listening state anyway so the user can still interact
      setTimeout(() => startListening(), 2000);
      return;
    }
    
    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Safety timeout to ensure we start listening even if onend doesn't fire
    // (Common issue on some mobile browsers/OS versions)
    const safetyTimeout = setTimeout(() => {
      if (isSpeakingRef.current) {
        console.warn('Speech safety timeout reached, forcing end of speaking state');
        setIsSpeaking(false);
        if (interviewStateRef.current !== 'completed') startListening();
      }
    }, (text.length * 100) + 5000); // Rough estimate of speech duration + buffer

    utterance.onstart = () => {
      console.log('Speech started');
      setIsSpeaking(true);
      stopListening(); // Stop listening while speaking to avoid feedback
    };

    utterance.onend = () => {
      console.log('Speech ended');
      clearTimeout(safetyTimeout);
      setIsSpeaking(false);
      // Try to start listening automatically, but handle failure
      if (interviewStateRef.current !== 'completed') {
        try {
          startListening();
        } catch (err) {
          console.warn('Failed to start listening automatically:', err);
        }
      }
    };

    utterance.onerror = (err) => {
      console.error('Speech synthesis error:', err);
      clearTimeout(safetyTimeout);
      // Fallback: try speaking without a specific voice if the first attempt fails
      if (utterance.voice) {
        console.log('Retrying with default voice...');
        const fallbackUtterance = new SpeechSynthesisUtterance(text);
        fallbackUtterance.onstart = utterance.onstart;
        fallbackUtterance.onend = utterance.onend;
        fallbackUtterance.onerror = (err2) => {
          console.error('Fallback speech synthesis error:', err2);
          setIsSpeaking(false);
          if (interviewStateRef.current !== 'completed') startListening();
        };
        synthesisRef.current?.speak(fallbackUtterance);
      } else {
        setIsSpeaking(false);
        if (interviewStateRef.current !== 'completed') startListening();
      }
    };
    
    console.log('Calling synthesis.speak()');
    synthesisRef.current.speak(utterance);
  };

  const startListening = () => {
    if (isSpeakingRef.current) return;
    startRecording();
  };

  const stopListening = () => {
    stopRecording();
  };

  const handleNext = async () => {
    stopRecording();
  };

  useEffect(() => {
    console.log("AudioInterview mounted. session:", session, "hasStarted:", hasStarted, "interviewState:", interviewState);
  }, [session]);

  useEffect(() => {
    console.log("AudioInterview state updated - hasStarted:", hasStarted, "interviewState:", interviewState);
  }, [hasStarted, interviewState]);

  const testVoice = () => {
    if (!synthesisRef.current || !selectedVoice) return;
    synthesisRef.current.cancel();
    const testMessage = "Hello, this is a test of the Indian female voice. Does it sound correct?";
    const utterance = new SpeechSynthesisUtterance(testMessage);
    utterance.voice = selectedVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synthesisRef.current.speak(utterance);
  };

  const startInterview = () => {
    console.log("startInterview called. Current hasStarted:", hasStarted);
    setHasStarted(true);
    setInterviewState('healthCheck');
    startRecording();
  };

  const generatePDF = (report: InterviewReport) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Interview Report', 20, 20);
    
    doc.setFontSize(14);
    doc.text(`Candidate: ${report.candidateName}`, 20, 35);
    doc.text(`Overall Score: ${report.overallScore}%`, 20, 45);
    doc.text(`Status: ${report.status}`, 20, 55);
    
    doc.setFontSize(12);
    doc.text('Reasoning:', 20, 70);
    const splitReason = doc.splitTextToSize(report.reason, 170);
    doc.text(splitReason, 20, 80);
    
    if (report.interestLevel) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Interest Level Assessment', 20, 20);
      doc.setFontSize(12);
      doc.text(`Overall Interest Score: ${report.interestLevel.score}%`, 20, 35);
      doc.text(`Location Fit: ${report.interestLevel.locationFit}`, 20, 45);
      doc.text(`Salary Expectation: ${report.interestLevel.salaryExpectation}`, 20, 55);
      doc.text(`Role Alignment: ${report.interestLevel.roleAlignment}`, 20, 65);
      doc.text(`Company Alignment: ${report.interestLevel.companyAlignment}`, 20, 75);
      doc.text('Feedback:', 20, 85);
      const splitInterestFeedback = doc.splitTextToSize(report.interestLevel.feedback, 170);
      doc.text(splitInterestFeedback, 20, 95);
    }

    let y = 100;
    if (report.interestLevel) y = 20; // Start new page if interest level was added
    doc.text('Parameters:', 20, y);
    y += 10;
    report.parameters.forEach(p => {
      doc.text(`${p.name}: ${p.score}% - ${p.feedback}`, 20, y);
      y += 10;
    });

    doc.addPage();
    doc.text('Q&A Transcript:', 20, 20);
    y = 35;
    report.responses.forEach((r, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      const splitQ = doc.splitTextToSize(`Q${i+1}: ${r.question}`, 170);
      doc.text(splitQ, 20, y);
      y += (splitQ.length * 7);
      
      doc.setFont('helvetica', 'normal');
      const splitA = doc.splitTextToSize(`A: ${r.answer}`, 170);
      doc.text(splitA, 20, y);
      y += (splitA.length * 7) + 5;
    });

    doc.save(`${report.candidateName}_Interview_Report.pdf`);
  };

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    console.log("AudioInterview session:", session, "hasStarted:", hasStarted, "interviewState:", interviewState);
  }, [session, hasStarted, interviewState]);

  if (session.status === 'completed' && session.report) {
    const report = session.report;
    return (
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8 p-2 sm:p-6 animate-fadeIn">
        {session.recruiterEmail && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 sm:p-4 rounded-xl flex items-center space-x-3 text-emerald-500 shadow-lg shadow-emerald-500/10">
            <Mail className="w-3 h-3 sm:w-5 h-5 shrink-0" />
            <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest leading-tight">
              <span className="text-emerald-400">Report Sent:</span> A detailed summary and PDF report have been emailed to <span className="underline text-white">{session.recruiterEmail}</span>.
            </div>
          </div>
        )}

        <div className="glass-panel p-4 sm:p-8 rounded-xl sm:rounded-2xl border-slate-800/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start mb-8 sm:mb-10 gap-6">
            <div className="flex items-center space-x-4 sm:space-x-6">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black border-2 shadow-2xl shrink-0 ${report.status === 'Selected' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/30 shadow-red-500/20'}`}>
                {report.overallScore}
              </div>
              <div>
                <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight mb-1 leading-tight">{report.candidateName}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border ${report.status === 'Selected' ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5' : 'text-red-500 border-red-500/30 bg-red-500/5'}`}>
                    {report.status}
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-slate-600 uppercase tracking-widest">Evaluation Complete</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => generatePDF(report)}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-800 text-[10px] font-black uppercase tracking-widest shadow-xl"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 mb-8 sm:mb-12">
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Executive Summary</h3>
                </div>
                <div className="bg-slate-950/50 p-4 sm:p-6 rounded-xl border border-slate-800/50 relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-800"></div>
                  <p className="text-slate-400 leading-relaxed italic text-xs">"{report.reason}"</p>
                </div>
              </div>

              {report.interestLevel && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Interest Level Assessment</h3>
                  </div>
                  <div className="bg-indigo-500/5 p-4 sm:p-6 rounded-xl border border-indigo-500/20 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Interest Score</span>
                      <span className="text-base sm:text-lg font-black text-indigo-500">{report.interestLevel.score}%</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { label: 'Location Fit', val: report.interestLevel.locationFit },
                        { label: 'Salary Expectation', val: report.interestLevel.salaryExpectation },
                        { label: 'Role Alignment', val: report.interestLevel.roleAlignment },
                        { label: 'Company Alignment', val: report.interestLevel.companyAlignment }
                      ].map((item, i) => (
                        <div key={i} className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 flex flex-col gap-1">
                          <span className="text-[7px] sm:text-[8px] text-slate-500 uppercase tracking-widest font-bold">{item.label}</span>
                          <p className="text-[9px] sm:text-[10px] text-white font-medium">{item.val}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 leading-relaxed italic">"{report.interestLevel.feedback}"</p>
                  </div>
                </div>
              )}

              {report.softSkills && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Soft Skills & Communication</h3>
                  </div>
                  <div className="bg-slate-950/30 p-4 sm:p-6 rounded-xl border border-slate-800/30 space-y-4">
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                      {[
                        { label: 'Confidence', val: report.softSkills.confidence },
                        { label: 'Clarity', val: report.softSkills.clarity },
                        { label: 'Enthusiasm', val: report.softSkills.enthusiasm }
                      ].map((s, i) => (
                        <div key={i} className="text-center p-2 sm:p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                          <div className="text-base sm:text-lg font-black text-white">{s.val}%</div>
                          <div className="text-[7px] sm:text-[8px] text-slate-500 uppercase tracking-widest">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 leading-relaxed">{report.softSkills.feedback}</p>
                  </div>
                </div>
              )}

              {report.biasAudit && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Fairness Audit</h3>
                  </div>
                  <div className="bg-emerald-500/5 p-4 sm:p-6 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Fairness Score</span>
                      <span className="text-base sm:text-lg font-black text-emerald-500">{report.biasAudit.score}%</span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 leading-relaxed mb-3">{report.biasAudit.feedback}</p>
                    <div className="p-3 bg-slate-950 rounded border border-emerald-500/10 text-[8px] sm:text-[9px] text-emerald-300 italic">
                      Audit Check: {report.biasAudit.fairnessCheck}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Score Breakdown</h3>
                </div>
                <div className="space-y-4 sm:space-y-5 bg-slate-950/30 p-4 sm:p-6 rounded-xl border border-slate-800/30">
                  {report.parameters.map((p, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">{p.name}</span>
                        <span className="text-white">{p.score}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                        <div 
                          className={`h-full transition-all duration-1000 ${p.score >= 70 ? 'bg-emerald-500' : p.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${p.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Internal Comments</h3>
                </div>
                <div className="bg-slate-950/50 p-4 sm:p-6 rounded-xl border border-slate-800/50 space-y-4">
                  <div className="space-y-3 max-h-32 sm:max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <div className="flex justify-between mb-1">
                        <span className="text-[8px] font-black text-indigo-400 uppercase">System</span>
                        <span className="text-[8px] text-slate-600">Just Now</span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-slate-400">Report finalized. Ready for recruiter review.</p>
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Add internal comment..." 
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button className="absolute right-2 top-1.5 text-indigo-500 hover:text-indigo-400">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Interview Transcript & Evaluation</h3>
            </div>
            <div className="space-y-4 sm:space-y-6">
              {report.responses.map((res, idx) => (
                <div key={idx} className="bg-slate-950/50 p-5 sm:p-8 rounded-2xl border border-slate-800/50 space-y-4 sm:space-y-6 relative group hover:border-slate-700 transition-colors">
                  <div className="absolute top-3 sm:top-4 right-4 sm:right-6 text-[7px] sm:text-[8px] text-slate-700 uppercase tracking-widest">Section {idx + 1}</div>
                  <div>
                    <p className="text-[8px] sm:text-[9px] font-black text-indigo-500 mb-1 sm:mb-2 uppercase tracking-[0.2em]">Question {idx + 1}</p>
                    <p className="text-white font-bold text-base sm:text-lg leading-tight">{res.question}</p>
                  </div>
                  <div className="pl-4 sm:pl-6 border-l-2 border-slate-800 py-1 sm:py-2">
                    <p className="text-xs sm:text-sm text-slate-400 italic leading-relaxed">"{res.answer}"</p>
                  </div>
                  <div className="pt-4 sm:pt-6 border-t border-slate-800/50 flex items-start space-x-3 sm:space-x-4">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500 shrink-0 border border-indigo-500/20">
                      <FileText className="w-4 h-4 sm:w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                        <span className="text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-widest">Analysis Summary</span>
                        <span className="w-fit text-[8px] sm:text-[10px] font-bold px-2 py-0.5 bg-slate-900 text-indigo-400 rounded border border-slate-800 uppercase tracking-widest">Score: {res.score}/100</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500 leading-relaxed">{res.feedback}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-20 space-y-8 glass-panel rounded-2xl border-slate-800/50 max-w-2xl mx-auto animate-pulse">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative z-10" />
        </div>
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-black text-white uppercase tracking-tight">Analyzing Performance</h3>
          <p className="text-slate-500 text-xs uppercase tracking-widest">Evaluating responses against job requirements...</p>
        </div>
        <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div className="h-full bg-indigo-500 animate-progress"></div>
        </div>
      </div>
    );
  }

  const [displayRole, setDisplayRole] = useState(session.designation || 'this role');
  const [displayCompany, setDisplayCompany] = useState(session.company || 'our company');

  useEffect(() => {
    const extractMissingDetails = async () => {
      if (!session.designation || !session.company) {
        try {
          const { extractJobDetails } = await import('../services/geminiService');
          const details = await extractJobDetails(session.jd);
          if (!session.designation && details.role && details.role !== 'Unknown') {
            setDisplayRole(details.role);
          }
          if (!session.company && details.company && details.company !== 'Unknown') {
            setDisplayCompany(details.company);
          }
        } catch (err) {
          console.error("Failed to extract missing details from JD:", err);
        }
      }
    };
    extractMissingDetails();
  }, [session]);

  const currentQuestion = session.questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-8 p-1 sm:p-6 animate-fadeIn">
      <div className="glass-panel p-3 sm:p-10 rounded-xl sm:rounded-3xl border-slate-800/50 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
        
        {/* Professional Header - Only show on active interview states */}
        {hasStarted && interviewState !== 'completed' && (
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-12 gap-4 sm:gap-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">AI Interview</h2>
              <div className="flex items-center space-x-2">
                <span className="text-[8px] sm:text-[10px] text-slate-500 uppercase tracking-widest font-medium">Candidate:</span>
                <span className="text-[8px] sm:text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{session.candidateName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 bg-slate-950/80 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:xl border border-slate-800 shadow-inner">
              <div className="relative">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="absolute inset-0 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 blur-sm animate-pulse"></div>
              </div>
              <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-500">Live Connection</span>
            </div>
          </div>
        )}

        {!hasStarted && (
          <div className="text-center py-6 sm:py-16 px-2 animate-fadeIn max-w-3xl mx-auto space-y-8 sm:space-y-10">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex flex-col items-center space-y-4 sm:space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
                  <div className="relative inline-flex items-center justify-center p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl">
                    {session.branding?.logoUrl ? (
                      <img src={session.branding.logoUrl} alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Volume2 className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-500" />
                    )}
                  </div>
                </div>
                {session.branding?.companyName && (
                  <h2 className="text-xl font-bold text-white uppercase tracking-widest">
                    {session.branding.companyName}
                  </h2>
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h1 className="text-2xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                  Audio <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600">Interview</span>
                </h1>
                <div className="max-w-xl mx-auto space-y-1 sm:space-y-2">
                  <p className="text-base sm:text-xl text-slate-300 font-medium">
                    Welcome, <span className="text-white font-bold">{session.candidateName}</span>
                  </p>
                  <p className="text-xs sm:text-lg text-slate-400 leading-relaxed">
                    You are interviewing for the <span className="text-indigo-400 font-bold">{displayRole}</span> position.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3 sm:gap-6 pt-4">
                {[
                  { label: 'Duration', value: '15 Mins', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                  { label: 'Privacy', value: 'Audio Only', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-900/50 px-4 py-3 rounded-2xl border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400">
                      {item.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{item.label}</p>
                      <span className="text-xs font-bold text-white uppercase tracking-widest">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
              <div className="space-y-4 sm:space-y-6 pt-2 sm:pt-4">
                <button
                  onClick={startInterview}
                  className="group relative w-full sm:w-auto px-8 py-4 sm:px-12 sm:py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center space-x-3 mx-auto transition-all transform hover:scale-[1.02] shadow-2xl shadow-indigo-500/40 active:scale-95 border border-indigo-400/50 uppercase tracking-widest"
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current group-hover:animate-pulse" />
                  <span>Start Interview</span>
                </button>
                <p className="text-[8px] sm:text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                  Please ensure you are in a quiet environment
                </p>
              </div>
          </div>
        )}

        {hasStarted && (
          <div className="space-y-6 sm:space-y-10">
            {interviewState === 'healthCheck' && (
          <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-8 space-y-6 sm:space-y-12 max-w-4xl mx-auto w-full">
            <div className="text-center space-y-3 sm:space-y-6">
              {session.branding?.logoUrl ? (
                <img src={session.branding.logoUrl} alt={session.branding.companyName} className="h-10 sm:h-16 mx-auto mb-2 sm:mb-4 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="inline-flex items-center px-3 py-1 sm:px-4 sm:py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest animate-pulse">
                  Mic Check
                </div>
              )}
              <h2 className="text-2xl sm:text-6xl font-bold text-white leading-tight tracking-tight">
                Audio <span className="text-indigo-500">Check</span>
              </h2>
              <p className="text-slate-400 text-xs sm:text-lg max-w-xl mx-auto">
                {session.branding?.companyName || 'Our team'} wants to ensure your audio is clear for the best evaluation.
              </p>
            </div>

            <div className="w-full max-w-md space-y-8">
              <div className="space-y-4">
                {[
                  { label: 'Microphone Access', status: audioStream ? 'Ready' : 'Pending', icon: <Mic className="w-4 h-4" /> },
                  { label: 'Audio Input Level', status: micLevel > 10 ? 'Active' : 'Waiting', icon: <Volume2 className="w-4 h-4" /> },
                  { label: 'System Readiness', status: isHealthCheckPassed ? 'Verified' : 'Checking', icon: <CheckCircle className="w-4 h-4" /> }
                ].map((check, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${check.status === 'Ready' || check.status === 'Active' || check.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                        {check.icon}
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">{check.label}</span>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${check.status === 'Ready' || check.status === 'Active' || check.status === 'Verified' ? 'text-emerald-500' : 'text-slate-600'}`}>
                      {check.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full transition-all duration-100 ${isHealthCheckPassed ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, (micLevel / 100) * 100)}%` }}
                  />
                </div>
                <p className="text-[8px] text-center text-slate-600 uppercase tracking-widest font-bold">Speak into your microphone to verify input</p>
              </div>
              
              <div className="flex justify-center">
                <button 
                  onClick={testVoice}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-700 transition-all"
                >
                  <Volume2 className="w-3 h-3" />
                  Test AI Voice
                </button>
              </div>
            </div>

              <div className="flex flex-col items-center gap-4 w-full">
                <button
                  onClick={() => {
                    setInterviewState('greeting');
                    const greeting = `Hello ${session.candidateName}, I am your AI interviewer for the ${session.designation || 'position'} at ${session.company || 'our company'}. Before we begin, I need your consent to record this session for evaluation. Do you accept?`;
                    speak(greeting);
                  }}
                  className="w-full sm:w-auto px-10 py-4 sm:px-12 sm:py-5 rounded-2xl font-bold text-lg sm:text-xl transition-all flex items-center justify-center space-x-4 uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 border border-indigo-400/50"
                >
                  <span>Proceed to Interview</span>
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                
                <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">
                  {isHealthCheckPassed ? 'Microphone verified' : 'Microphone check optional - click proceed to start'}
                </p>
              </div>
          </div>
        )}

        {interviewState === 'greeting' && (
              <div className="bg-slate-950/80 p-4 sm:p-16 rounded-2xl sm:rounded-3xl border border-slate-800 text-center space-y-6 sm:space-y-10 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
                {session.branding?.logoUrl ? (
                  <img src={session.branding.logoUrl} alt={session.branding.companyName} className="h-10 sm:h-16 mx-auto mb-2 sm:mb-4 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 sm:w-20 sm:h-20 bg-indigo-500/10 rounded-xl sm:rounded-3xl flex items-center justify-center mx-auto border border-indigo-500/20 shadow-2xl">
                    <CheckCircle className="w-6 h-6 sm:w-10 sm:h-10 text-indigo-500" />
                  </div>
                )}
                <div className="space-y-2 sm:space-y-4">
                  <h3 className="text-lg sm:text-4xl font-bold text-white tracking-tight leading-tight">Welcome to your Interview</h3>
                  <div className="max-w-lg mx-auto">
                    <p className="text-[10px] sm:text-lg text-slate-400 leading-relaxed">
                      Hello <span className="text-white font-bold">{session.candidateName}</span>. You are interviewing for the <span className="text-indigo-400 font-bold">{session.designation || 'role'}</span> position at <span className="text-indigo-400 font-bold">{session.company || 'our company'}</span>.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-6">
                  <button
                    onClick={() => {
                      console.log('Manual consent button clicked');
                      setInterviewState('interviewing');
                      setCurrentQuestionIndex(0);
                      const firstQuestion = session.questions[0].question;
                      setActiveQuestion(firstQuestion);
                      setResponses([]);
                      setTimeout(() => speak(firstQuestion), 500);
                    }}
                    className="w-full sm:w-auto px-10 py-4 sm:px-12 sm:py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg sm:text-xl transition-all flex items-center justify-center space-x-4 shadow-2xl shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 border border-indigo-400/50 uppercase tracking-widest"
                  >
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                    <span>Start Interview</span>
                  </button>
                  <div className="flex items-center space-x-3">
                    <span className="h-[1px] w-8 bg-slate-800"></span>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      Voice Command: Say <span className="text-white">"Yes"</span> to proceed
                    </p>
                    <span className="h-[1px] w-8 bg-slate-800"></span>
                  </div>
                </div>
              </div>
            )}
  
            {interviewState === 'interviewing' && (
              <div className="bg-slate-950/80 p-4 sm:p-10 rounded-xl sm:rounded-2xl border border-slate-800 flex flex-col items-stretch gap-4 sm:gap-8 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                <div className="flex-1 space-y-3 sm:space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      <div className={`p-1.5 sm:p-3 rounded-lg sm:xl transition-all duration-500 ${isSpeaking ? 'bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/20' : 'bg-slate-900 text-slate-600 border border-slate-800'}`}>
                        <Volume2 className={`w-4 h-4 sm:w-6 h-6 ${isSpeaking ? 'animate-pulse' : ''}`} />
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[7px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Question</span>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[6px] sm:text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Live Connection</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[8px] sm:text-[10px] font-medium text-indigo-400 uppercase tracking-widest">Question {currentQuestionIndex + 1} of {session.questions.length}</span>
                          {latency > 0 && (
                            <span className="text-[6px] sm:text-[8px] text-slate-600 font-mono">AI Latency: {latency}ms</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => speak(activeQuestion || session.questions[currentQuestionIndex].question)}
                        className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-indigo-400 rounded-lg border border-slate-800 transition-all flex items-center gap-1.5"
                        title="Repeat Question"
                      >
                        <Play className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Repeat</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm("Are you sure you want to finish the interview now? Your current responses will be analyzed.")) {
                            finalizeInterview(responses);
                          }
                        }}
                        className="p-2 bg-slate-900 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg border border-slate-800 hover:border-red-500/20 transition-all flex items-center gap-1.5"
                        title="Finish Interview Early"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Finish</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm sm:text-2xl text-white font-bold leading-snug sm:leading-tight tracking-tight overflow-y-auto max-h-[30vh] font-sans">
                    {activeQuestion || session.questions[currentQuestionIndex].question}
                  </p>
                </div>
              </div>
            )}
  
            <div className="relative group">
              <div className={`absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-3xl blur-xl opacity-20 transition-all duration-1000 ${isListening ? 'opacity-60 animate-pulse' : 'opacity-0'}`}></div>
              <div className="relative bg-slate-950 p-4 sm:p-10 rounded-2xl sm:rounded-3xl border border-slate-800 min-h-[120px] sm:min-h-[200px] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className={`p-2 sm:p-3 rounded-lg sm:xl transition-all duration-500 ${isListening ? 'bg-red-500/20 text-red-500 shadow-lg shadow-red-500/20' : 'bg-slate-900 text-slate-600 border border-slate-800'}`}>
                      {isListening ? <Mic className="w-5 h-5 sm:w-6 h-6 animate-bounce" /> : <MicOff className="w-5 h-5 sm:w-6 h-6" />}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Microphone</span>
                      <span className={`text-[8px] sm:text-[10px] font-medium uppercase tracking-widest block ${isListening ? 'text-red-400' : 'text-slate-600'}`}>
                        {isListening ? 'Recording...' : 'Waiting'}
                      </span>
                    </div>
                  </div>

                  {isListening && audioStream && (
                    <div className="flex-1 max-w-[100px] sm:max-w-[200px] h-8 sm:h-10 mx-2 sm:mx-4">
                      <AudioVisualizer stream={audioStream} isListening={isListening} />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    {isListening && (
                      <button
                        onClick={stopRecording}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Done Speaking</span>
                      </button>
                    )}
                    {isListening && silenceProgress > 0 && (
                      <div className="flex flex-col items-end space-y-1 sm:space-y-2">
                        <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold tracking-widest">Next Question In</span>
                        <div className="w-24 sm:w-32 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-75 ease-linear shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                            style={{ width: `${silenceProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex items-center py-4">
                  {isThinking ? (
                    <div className="flex items-center space-x-3 sm:space-x-4 animate-pulse">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500 animate-spin" />
                      <div className="space-y-1">
                        <p className="text-lg sm:text-3xl font-bold text-indigo-400 uppercase tracking-tight">
                          Processing Response...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 w-full">
                      <p className={`text-sm sm:text-3xl font-medium leading-relaxed transition-all duration-300 ${transcript ? 'text-white' : 'text-slate-700 italic'}`}>
                        {transcript || (isListening ? "Listening..." : "Ready")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-10 p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-between text-red-400 shadow-lg shadow-red-500/5 animate-slideUp">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest terminal-text">System_Error</span>
                <p className="text-sm font-mono">{error}</p>
              </div>
            </div>
            {(error.includes('Microphone') || error.includes('Speech')) && (
              <button 
                onClick={startListening} 
                className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 terminal-text shrink-0"
              >
                Retry Connection
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioInterview;

const AudioVisualizer: React.FC<{ stream: MediaStream, isListening: boolean }> = ({ stream, isListening }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);

  useEffect(() => {
    if (!isListening || !stream) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Digital "Dot" style visualizer
        const dotCount = 8;
        const dotGap = 2;
        const dotHeight = (canvas.height - (dotCount - 1) * dotGap) / dotCount;
        const activeDots = Math.floor((barHeight / canvas.height) * dotCount);

        for (let j = 0; j < dotCount; j++) {
          const isActive = j < activeDots;
          ctx.fillStyle = isActive ? '#6366f1' : '#1e293b'; // indigo-500 or slate-800
          ctx.fillRect(x, canvas.height - (j + 1) * (dotHeight + dotGap), barWidth, dotHeight);
        }

        x += barWidth + 2;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [isListening, stream]);

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={40} 
      className="w-full h-full opacity-60"
    />
  );
};
