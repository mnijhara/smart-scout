import React, { useEffect, useState } from 'react';
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthProps {
  initialMode?: 'login' | 'register';
  onLogin: (user: any) => void;
  onClose?: () => void;
}

const EMAIL_KEY = 'smartscout_email_for_signin';
const ACTION_SETTINGS = { url: window.location.origin, handleCodeInApp: true };

const Auth: React.FC<AuthProps> = ({ initialMode = 'login', onLogin, onClose }) => {
  const [authMode, setAuthMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    let active = true;
    const finishEmailLinkSignIn = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) return;
      const savedEmail = window.localStorage.getItem(EMAIL_KEY);
      if (!savedEmail) return;
      setLoading(true);
      try {
        const result = await signInWithEmailLink(auth, savedEmail, window.location.href);
        window.localStorage.removeItem(EMAIL_KEY);
        if (active) onLogin({ ...result.user, id: result.user.uid });
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error: any) {
        if (active) setMessage({ type: 'error', text: error?.message || 'This sign-in link is invalid or expired.' });
      } finally {
        if (active) setLoading(false);
      }
    };
    void finishEmailLinkSignIn();
    return () => { active = false; };
  }, [onLogin]);

  const handleSendLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setLoading(true);
    setMessage(null);
    try {
      await sendSignInLinkToEmail(auth, normalizedEmail, ACTION_SETTINGS);
      window.localStorage.setItem(EMAIL_KEY, normalizedEmail);
      setStep('sent');
      setMessage({ type: 'success', text: 'Secure sign-in link sent. Open the link from this device to continue.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Unable to send the sign-in link.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      onLogin({ ...result.user, id: result.user.uid });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Google sign-in failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      {onClose && <button onClick={onClose} aria-label="Close" className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors z-50"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
      <div className="w-full max-w-md relative z-10 glass-card rounded-3xl p-8 sm:p-12 animate-slideUp border border-white/10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6"><svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg></div>
          <h2 className="text-2xl font-heading font-bold text-white mb-2">{authMode === 'login' ? 'Welcome Back' : 'Create an Account'}</h2>
          <p className="text-zinc-500 text-sm">{authMode === 'login' ? 'Sign in to access your dashboard' : 'Get started with Smart Scout'}</p>
        </div>
        {message && <div className={`mb-6 p-3 rounded-lg text-xs font-medium text-center ${message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{message.text}</div>}
        {step === 'email' ? (
          <>
            <form onSubmit={handleSendLink} className="space-y-4">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-surfaceHighlight/50 border border-white/5 p-4 rounded-xl text-white placeholder:text-zinc-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none text-sm" placeholder="name@company.com" autoComplete="email" />
              <button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all">{loading ? 'Sending secure link…' : 'Email me a sign-in link'}</button>
            </form>
            <div className="relative py-6"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0a0a0a] px-2 text-zinc-500">Or continue with</span></div></div>
            <button type="button" disabled={loading} onClick={handleGoogle} className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>Google</button>
          </>
        ) : (
          <div className="space-y-5 text-center">
            <div className="text-4xl">✉️</div>
            <h3 className="text-lg font-bold text-white">Check your email</h3>
            <p className="text-sm text-zinc-400 leading-6">We sent a secure sign-in link to <strong className="text-white">{email}</strong>. The link expires and can only be used to complete Firebase sign-in.</p>
            <button type="button" onClick={() => { setStep('email'); setMessage(null); }} className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl text-sm">Use a different email</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
