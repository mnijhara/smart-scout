import type { Request, Response, NextFunction } from 'express';
import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0431516636';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';
const SESSION_SECRET = (() => {
  const explicit = process.env.SMARTSCOUT_SESSION_SECRET || process.env.SMARTSCOUT_VAULT_KEY;
  if (explicit) return explicit;
  const rootSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.GEMINI_API_KEY;
  if (!rootSecret) throw new Error('SMARTSCOUT_SESSION_SECRET or another server-only secret is required');
  return createHash('sha256').update(`smartscout:session:${rootSecret}`).digest('hex');
})();
const SESSION_COOKIE = 'smartscout_workspace';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type FirebaseIdentity = { uid:string; email?:string; emailVerified?:boolean; displayName?:string };
export type WorkspaceIdentity = { kind:'firebase'|'guest'; id:string; email?:string; emailVerified?:boolean; displayName?:string };

function signSession(id:string):string {
  return createHmac('sha256', SESSION_SECRET).update(id).digest('base64url');
}

function validSession(value:string):string|null {
  const [id, signature] = value.split('.');
  if(!id || !signature)return null;
  const expected=signSession(id);
  try {
    if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;
  } catch { return null; }
  return id;
}

function getCookie(req:Request,name:string):string {
  const raw=String(req.headers.cookie||'');
  const prefix=`${name}=`;
  const part=raw.split(';').map(value=>value.trim()).find(value=>value.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : '';
}

export function ensureGuestWorkspace(req:Request,res:Response):WorkspaceIdentity {
  const existing=validSession(getCookie(req,SESSION_COOKIE));
  const id=existing||randomBytes(32).toString('hex');
  if(!existing){
    res.setHeader('Set-Cookie',`${SESSION_COOKIE}=${encodeURIComponent(`${id}.${signSession(id)}`)}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
  }
  return {kind:'guest',id:`guest:${id}`};
}

export async function verifyFirebaseIdToken(token:string):Promise<FirebaseIdentity>{
  if(!FIREBASE_API_KEY)throw new Error('Firebase authentication is not configured on this server');
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:token})});
  const data:any=await response.json();
  const user=data?.users?.[0];
  if(!response.ok||!user?.localId)throw new Error('Invalid Firebase authentication token');
  if(user.disabled)throw new Error('Firebase account is disabled');
  return {uid:String(user.localId),email:user.email,emailVerified:Boolean(user.emailVerified),displayName:user.displayName};
}

export async function resolveWorkspaceIdentity(req:Request,res:Response):Promise<WorkspaceIdentity>{
  const header=String(req.header('authorization')||'');
  const token=header.startsWith('Bearer ')?header.slice(7).trim():'';
  if(token){
    const identity=await verifyFirebaseIdToken(token);
    return {kind:'firebase',id:identity.uid,email:identity.email,emailVerified:identity.emailVerified,displayName:identity.displayName};
  }
  return ensureGuestWorkspace(req,res);
}

export async function requireFirebaseAuth(req:Request,res:Response,next:NextFunction){
  try{
    const header=String(req.header('authorization')||'');
    const token=header.startsWith('Bearer ')?header.slice(7).trim():'';
    if(!token)return res.status(401).json({error:'Authentication required'});
    const identity=await verifyFirebaseIdToken(token);
    (req as any).firebaseUser=identity;
    req.headers['x-tenant-id']=identity.uid;
    next();
  }catch(error:any){res.status(401).json({error:error?.message||'Authentication failed'});}
}

export async function requireWorkspaceAuth(req:Request,res:Response,next:NextFunction){
  try{
    const identity=await resolveWorkspaceIdentity(req,res);
    (req as any).workspaceIdentity=identity;
    req.headers['x-tenant-id']=identity.id;
    next();
  }catch(error:any){res.status(401).json({error:error?.message||'Workspace authentication failed'});}
}

export function authenticatedTenantId(req:Request):string{
  const identity=(req as any).workspaceIdentity as WorkspaceIdentity|undefined;
  if(identity?.id)return identity.id;
  const uid=(req as any).firebaseUser?.uid;
  if(uid)return String(uid);
  throw new Error('Workspace identity is missing');
}

export function workspaceSessionInfo(req:Request,res:Response){
  const identity=ensureGuestWorkspace(req,res);
  res.json({ok:true,workspaceId:identity.id,kind:identity.kind});
}

export function clearWorkspaceCookie(res:Response){
  res.setHeader('Set-Cookie',`${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}

export const firebaseAuthConfig={projectId:FIREBASE_PROJECT_ID};
