import React, { useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
import { auth } from '../firebase';
import { KeyRound, X, CheckCircle2, Loader2, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

type Provider = 'gemini' | 'openai' | 'anthropic';

const providers: { id: Provider; name: string; hint: string }[] = [
  { id: 'gemini', name: 'Google Gemini', hint: 'Recommended for the fastest setup' },
  { id: 'openai', name: 'OpenAI', hint: 'Use your OpenAI API account' },
  { id: 'anthropic', name: 'Anthropic', hint: 'Use your Anthropic API account' },
];

export default function ByokWidget() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function connect() {
    setStatus('connecting');
    setMessage('');
    try {
      let current = user;
      if (!current) {
        current = await signInWithPopup(auth, new GoogleAuthProvider()).then(result => result.user);
        setUser(current);
      }
      const token = await current.getIdToken();
      const response = await fetch('/api/recruiting/ai/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, apiKey: apiKey.trim(), model: model || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to connect this key');
      setStatus('connected');
      setApiKey('');
      setMessage(`${data.provider} is connected. Your key stays on Smart Scout's secure server-side credential vault.`);
    } catch (error: any) {
      setStatus('error');
      const code = String(error?.code || '');
      setMessage(code === 'auth/unauthorized-domain'
        ? 'Google sign-in is not enabled for smartscout.online yet. Add the domain to Firebase Authentication → Authorized domains.'
        : error?.message || 'Unable to connect your AI provider.');
    }
  }

  return <>
    <button onClick={() => setOpen(true)} aria-label="Bring your own AI key" className="fixed bottom-5 left-4 z-40 flex items-center gap-2 rounded-2xl border border-violet-200 bg-white/95 px-4 py-3 text-left shadow-xl shadow-violet-100 backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-2xl sm:bottom-6 sm:left-6">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white"><KeyRound className="h-4 w-4" /></span>
      <span><span className="block text-[10px] font-black uppercase tracking-[.16em] text-violet-600">BYOK</span><span className="block text-xs font-black text-slate-950">Your AI. Your key. Lower cost.</span></span>
    </button>

    {open && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/65 p-3 backdrop-blur-md sm:items-center sm:p-6" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl sm:rounded-[32px]" onClick={event => event.stopPropagation()}>
        <div className="border-b border-slate-100 bg-gradient-to-br from-violet-50 via-white to-white p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white"><KeyRound className="h-5 w-5" /></span>
              <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-600">Smart Scout BYOK</div><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Bring your own AI.</h2></div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-white"><X className="h-5 w-5" /></button>
          </div>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600">Use your own Gemini, OpenAI or Anthropic account. Smart Scout charges for the hiring workspace — <b>your AI usage stays on your AI account.</b></p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-black text-slate-600"><div className="rounded-xl border border-slate-200 bg-white p-3">Your key</div><div className="rounded-xl border border-slate-200 bg-white p-3">Your usage</div><div className="rounded-xl border border-slate-200 bg-white p-3">Your control</div></div>
        </div>
        <div className="space-y-5 p-5 sm:p-7">
          <div><label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">AI provider</label><div className="grid gap-2 sm:grid-cols-3">{providers.map(item => <button key={item.id} onClick={() => { setProvider(item.id); setStatus('idle'); setMessage(''); if (item.id === 'gemini') setModel('gemini-3.6-flash'); else setModel(''); }} className={`rounded-xl border p-3 text-left transition ${provider === item.id ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 hover:border-slate-300'}`}><div className="text-xs font-black">{item.name}</div><div className="mt-1 text-[10px] leading-4 text-slate-400">{item.hint}</div></button>)}</div></div>
          <div><label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">API key</label><input value={apiKey} onChange={event => setApiKey(event.target.value)} type="password" autoComplete="off" placeholder={`Paste your ${provider} API key`} className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></div>
          {provider === 'gemini' && <div><label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Model <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></label><input value={model} onChange={event => setModel(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /></div>}
          <button disabled={!apiKey.trim() || status === 'connecting'} onClick={connect} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50">{status === 'connecting' ? <><Loader2 className="h-4 w-4 animate-spin" />Connecting securely…</> : <><Sparkles className="h-4 w-4" />Connect my AI</>}</button>
          {status === 'connected' && <div className="flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><b>AI connected.</b><div className="mt-1 text-xs leading-5">{message}</div><button onClick={() => window.location.assign('/hire')} className="mt-3 inline-flex items-center gap-1 font-black underline">Open hiring workspace <ExternalLink className="h-3 w-3" /></button></div></div>}
          {status === 'error' && <div className="rounded-2xl bg-rose-50 p-4 text-xs leading-5 text-rose-700"><b>Connection failed.</b><div className="mt-1">{message}</div></div>}
          <div className="flex items-start gap-2 text-[11px] leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />Your key is never displayed back after saving. Smart Scout uses the existing encrypted server-side credential vault; it is not stored in browser localStorage.</div>
        </div>
      </div>
    </div>}
  </>;
}
