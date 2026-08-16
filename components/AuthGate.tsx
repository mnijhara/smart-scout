import React,{useEffect,useState}from'react';
import{GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signInWithRedirect,getRedirectResult,signOut,User}from'firebase/auth';
import{Loader2,ShieldCheck,LogOut,ArrowLeft,UserRound}from'lucide-react';
import{auth}from'../firebase';

function formatAuthError(code:string,message?:string){
 if(code==='auth/admin-restricted-operation')return'Google sign-in is disabled in the existing Firebase project.';
 if(code==='auth/unauthorized-domain')return'The current Smart Scout domain is not in the existing Firebase Authentication authorized-domain list.';
 if(code==='auth/popup-blocked')return'Google sign-in popup was blocked. Retrying with the secure redirect flow…';
 if(code==='auth/popup-closed-by-user')return'Google sign-in was cancelled. Tap Sign in with Google again to continue.';
 if(code==='auth/cancelled-popup-request')return'Another Google sign-in request is already running. Please tap once and wait for it to finish.';
 if(code==='auth/operation-not-supported-in-this-environment')return'Using the secure Google redirect sign-in flow for this browser.';
 return message||'Google sign-in failed. Please try again.';
}

export default function AuthGate({children}:{children:React.ReactNode}){
 const[user,setUser]=useState<User|null>(null);const[workspaceReady,setWorkspaceReady]=useState(false);const[loading,setLoading]=useState(true);const[busy,setBusy]=useState(false);const[authNotice,setAuthNotice]=useState('');
 useEffect(()=>{let mounted=true;const unsub=onAuthStateChanged(auth,u=>{if(mounted)setUser(u)});void Promise.all([fetch('/api/recruiting/session',{credentials:'include'}).then(r=>{if(!r.ok)throw new Error('Unable to start private workspace')}),getRedirectResult(auth).catch((e:any)=>{const code=String(e?.code||'');if(code)setAuthNotice(formatAuthError(code,e?.message));return null})]).then(()=>{if(mounted)setWorkspaceReady(true)}).catch(e=>{if(mounted)setAuthNotice(e?.message||'Unable to start private workspace')}).finally(()=>{if(mounted)setLoading(false)});return()=>{mounted=false;unsub()}},[]);
 useEffect(()=>{const original=window.fetch;window.fetch=async(input:any,init:any={})=>{const url=typeof input==='string'?input:input?.url||'';if(url.includes('/api/recruiting/')||url.includes('/api/control-plane/')){const headers=new Headers(init.headers||{});if(user){const token=await user.getIdToken();headers.set('Authorization',`Bearer ${token}`);}return original(input,{...init,credentials:init.credentials||'include',headers})}return original(input,init)};return()=>{window.fetch=original}},[user]);
 async function loginWithGoogle(){if(busy)return;setBusy(true);setAuthNotice('');const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});try{
   // Mobile Chrome and embedded browsers are more reliable with redirect than popup.
   const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||window.matchMedia?.('(pointer:coarse)').matches;
   if(isMobile){await signInWithRedirect(auth,provider);return;}
   await signInWithPopup(auth,provider);
 }catch(e:any){const code=String(e?.code||'');
   if(['auth/popup-blocked','auth/popup-closed-by-user','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(code)){
     setAuthNotice(formatAuthError(code,e?.message));
     try{await signInWithRedirect(auth,provider);return}catch(redirectError:any){setAuthNotice(formatAuthError(String(redirectError?.code||''),redirectError?.message))}
   }else setAuthNotice(formatAuthError(code,e?.message));
 }finally{setBusy(false)}}
 async function logout(){if(busy)return;setBusy(true);setAuthNotice('');try{await signOut(auth);setUser(null)}catch(e:any){setAuthNotice(formatAuthError(String(e?.code||''),e?.message))}finally{setBusy(false)}}
 if(loading)return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-7 w-7 animate-spin text-violet-600"/></div>;
 if(!workspaceReady)return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6"><div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-xl sm:p-9"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white"><ShieldCheck className="h-7 w-7"/></div><h1 className="mt-6 text-2xl font-black tracking-tight">Smart Scout workspace unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">{authNotice||'Please try again.'}</p><button onClick={()=>window.location.reload()} className="mt-7 w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white">Retry securely</button><button onClick={()=>window.location.assign('/')} className="mx-auto mt-5 inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="h-3.5 w-3.5"/>Back to Smart Scout</button></div></div>;
 return <div className="relative"><div className="sticky top-0 z-40 flex justify-end border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:px-6"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><span className="hidden sm:inline">{user?.email||user?.displayName||'Private workspace'}</span>{user?<button onClick={logout} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold disabled:opacity-60"><LogOut className="h-3.5 w-3.5"/>{busy?'Signing out…':'Sign out'}</button>:<button onClick={loginWithGoogle} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-bold transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"><UserRound className="h-3.5 w-3.5"/>{busy?'Connecting…':'Sign in with Google'}</button>}</div></div>{!user&&<div className="border-b border-violet-100 bg-violet-50/60 px-3 py-2 text-center text-[10px] font-semibold text-violet-800 sm:text-xs">Private workspace active. Google account sign-in uses the existing Firebase configuration.</div>}{authNotice&&<div className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-center text-[10px] font-semibold text-amber-800 sm:text-xs">{authNotice}</div>}{children}</div>;
}
