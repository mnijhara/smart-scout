import React,{useEffect,useState}from'react';
import{GoogleAuthProvider,onIdTokenChanged,signInWithPopup,signInWithRedirect,getRedirectResult,setPersistence,browserLocalPersistence,signOut,User}from'firebase/auth';
import{Loader2,ShieldCheck,LogOut,ArrowLeft,UserRound}from'lucide-react';
import{auth}from'../firebase';

function message(code:string,fallback?:string){
 if(code==='auth/unauthorized-domain')return'This Smart Scout domain is not authorised in the existing Firebase project.';
 if(code==='auth/popup-blocked')return'Google sign-in popup was blocked. Switching to secure redirect sign-in.';
 if(code==='auth/popup-closed-by-user')return'Google sign-in was cancelled. Tap once more to continue.';
 if(code==='auth/cancelled-popup-request')return'A Google sign-in request is already running. Please wait for it to finish.';
 return fallback||'Google sign-in failed. Please try again.';
}

export default function AuthGateRelease({children}:{children:React.ReactNode}){
 const[user,setUser]=useState<User|null>(null);const[workspaceReady,setWorkspaceReady]=useState(false);const[loading,setLoading]=useState(true);const[busy,setBusy]=useState(false);const[notice,setNotice]=useState('');
 useEffect(()=>{let mounted=true;let unsubscribe=()=>{};(async()=>{try{
   await setPersistence(auth,browserLocalPersistence);
   unsubscribe=onIdTokenChanged(auth,u=>{if(mounted)setUser(u)});
   const redirect=await getRedirectResult(auth);
   const restored=redirect?.user||auth.currentUser;
   if(mounted&&restored)setUser(restored);
   const session=await fetch('/api/recruiting/session',{credentials:'include'});
   if(!session.ok)throw new Error('Unable to start private workspace');
   if(mounted)setWorkspaceReady(true);
 }catch(e:any){if(mounted)setNotice(e?.message||'Unable to start private workspace')}finally{if(mounted)setLoading(false)}})();return()=>{mounted=false;unsubscribe()}},[]);
 useEffect(()=>{const original=window.fetch;window.fetch=async(input:any,init:any={})=>{const url=typeof input==='string'?input:input?.url||'';if(url.includes('/api/recruiting/')||url.includes('/api/control-plane/')){const headers=new Headers(init.headers||{});const active=auth.currentUser||user;if(active){try{const token=await active.getIdToken();headers.set('Authorization',`Bearer ${token}`)}catch{}}return original(input,{...init,credentials:init.credentials||'include',headers})}return original(input,init)};return()=>{window.fetch=original}},[user]);
 async function login(){if(busy)return;setBusy(true);setNotice('');const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});try{await setPersistence(auth,browserLocalPersistence);const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||window.matchMedia?.('(pointer:coarse)').matches;if(mobile){await signInWithRedirect(auth,provider);return}const result=await signInWithPopup(auth,provider);setUser(result.user);window.dispatchEvent(new Event('smartscout-auth-changed'))}catch(e:any){const code=String(e?.code||'');if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(code)){try{await signInWithRedirect(auth,provider);return}catch(re:any){setNotice(message(String(re?.code||''),re?.message))}}else setNotice(message(code,e?.message))}finally{setBusy(false)}}
 async function logout(){if(busy)return;setBusy(true);try{await signOut(auth);setUser(null)}catch(e:any){setNotice(message(String(e?.code||''),e?.message))}finally{setBusy(false)}}
 if(loading)return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-7 w-7 animate-spin text-violet-600"/></div>;
 if(!workspaceReady)return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white"><ShieldCheck className="h-7 w-7"/></div><h1 className="mt-6 text-2xl font-black">Smart Scout workspace unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">{notice||'Please try again.'}</p><button onClick={()=>window.location.reload()} className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white">Retry securely</button><button onClick={()=>window.location.assign('/')} className="mx-auto mt-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="h-3.5 w-3.5"/>Back to Smart Scout</button></div></div>;
 return <div className="relative"><div className="sticky top-0 z-40 flex justify-end border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:px-6"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500">{user?<><span className="hidden max-w-[260px] truncate sm:inline">{user.email||user.displayName||'Signed in'}</span><button onClick={logout} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold"><LogOut className="h-3.5 w-3.5"/>{busy?'Signing out…':'Sign out'}</button></>:<button onClick={login} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-bold"><UserRound className="h-3.5 w-3.5"/>{busy?'Connecting…':'Sign in with Google'}</button>}</div></div>{!user&&<div className="border-b border-violet-100 bg-violet-50/60 px-3 py-2 text-center text-[10px] font-semibold text-violet-800 sm:text-xs">Private workspace active. Sign in with the existing Firebase configuration to save hiring work to your account.</div>}{notice&&<div className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-center text-[10px] font-semibold text-amber-800">{notice}</div>}{children}</div>;
}
