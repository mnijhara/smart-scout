import React, { useState, useEffect } from 'react';
import { supabase, isVirtual } from '../services/supabase';

interface AuthProps {
  initialMode?: 'login' | 'register';
  onLogin: (user: any) => void;
  onClose?: () => void;
}

const Auth: React.FC<AuthProps> = ({ initialMode = 'login', onLogin, onClose }) => {
  const [authMode, setAuthMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setStep('otp');
      
      setMessage({ type: 'success', text: 'Magic link sent! Please check your email inbox.' });
      if (isVirtual) {
        console.log("VIRTUAL MODE HINT: Use OTP 000000 to sign in.");
      }

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup', 
      });
      if (error) throw error;
      if (data.user) onLogin(data.user);
    } catch (err: any) {
      setMessage({ type: 'error', text: "Invalid verification code. Please check your email." });
    } finally {
      setLoading(false);
    }
  };
  
  const switchMode = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setMessage(null);
    setStep('email');
    setOtp('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors z-50"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}

      <div className="w-full max-w-md relative z-10 glass-card rounded-3xl p-8 sm:p-12 animate-slideUp border border-white/10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
               <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">{authMode === 'login' ? 'Welcome Back' : 'Create an Account'}</h2>
            <p className="text-zinc-500 text-sm">{authMode === 'login' ? 'Sign in to access your dashboard' : 'Get started with 10 free credits'}</p>
          </div>

          {message && (
            <div className={`mb-6 p-3 rounded-lg text-xs font-medium text-center ${message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {message.text}
            </div>
          )}
          
          <form onSubmit={step === 'email' ? handleSendOtp : handleVerifyOtp} className="space-y-4">
            {step === 'email' ? (
              <>
                <div className="space-y-2">
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-surfaceHighlight/50 border border-white/5 p-4 rounded-xl text-white placeholder:text-zinc-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none text-sm" 
                    placeholder="name@company.com" 
                  />
                </div>
                
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0a0a0a] px-2 text-zinc-500">Or continue with</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { data, error } = await supabase.auth.signInWithGoogle();
                      if (error) setMessage({ type: 'error', text: error.message });
                      else if (data?.user) onLogin(data.user);
                    } catch (err: any) {
                      setMessage({ type: 'error', text: err.message });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                    <input 
                    type="text" 
                    required 
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    className="w-full bg-surfaceHighlight/50 border border-white/5 p-4 rounded-xl text-white placeholder:text-zinc-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none text-center font-mono tracking-widest text-lg" 
                    placeholder="000000" 
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                           Secure Code
                        </span>
                    </div>
                </div>
                <button type="button" onClick={() => setStep('email')} className="text-xs text-zinc-500 hover:text-white transition-colors w-full text-center">Change Email</button>
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primaryGlow text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {step === 'email' ? (authMode === 'login' ? 'Continue' : 'Register') : 'Verify & Enter'}
            </button>
          </form>
          
          <div className="text-center mt-6">
              <button onClick={() => switchMode(authMode === 'login' ? 'register' : 'login')} className="text-xs text-zinc-500 hover:text-white transition-colors">
                  {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
          </div>
      </div>
    </div>
  );
};

export default Auth;
