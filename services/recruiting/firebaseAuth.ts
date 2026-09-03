import type { Request, Response, NextFunction } from 'express';
import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';
const FIREBASE_LOOKUP_TIMEOUT_MS = 8_000;
const MAX_FIREBASE_TOKEN_LENGTH = 4096;
const SESSION_SECRET = (() => {
  const explicit = process.env.SMARTSCOUT_SESSION_SECRET || process.env.SMARTSCOUT_VAULT_KEY;
  if (explicit) return explicit;
  const rootSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.GEMINI_API_KEY;
  if (!rootSecret) throw new Error('SMARTSCOUT_SESSION_SECRET or another server-only secret is required');
  return createHash('sha256').update(`smartscout:session:${rootSecret}`).digest('hex');
})();
const SESSION_COOKIE = 'smartscout_workspace';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const MAX_COOKIE_VALUE_LENGTH = 512;

export type FirebaseIdentity = { uid:string; email?:string; emailVerified?:boolean; displayName?:string };
export type WorkspaceIdentity = { kind:'firebase'|'guest'; id:string; email?:string; emailVerified?:boolean; displayName?:string };

function signSession(payload:string):string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function validSession(value:string):string|null {
  if(value.length > MAX_COOKIE_VALUE_LENGTH) return null;
  const parts = value.split('.');
  if(parts.length !== 3) return null;
  const [id, expiresAtRaw, signature] = parts;
  if(!id || !expiresAtRaw || !signature) return null;
  const expiresAt = Number(expiresAtRaw);
  if(!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return null;
  const payload = `${id}.${expiresAtRaw}`;
  const expected=signSession(payload);
  try {
    if(signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;
  } catch { return null; }
  return id;
}

function getCookie(req:Request,name:string):string {
  const raw=String(req.headers.cookie||'');
  const prefix=`${name}=`;
  const part=raw.split(';').map(value=>value.trim()).find(value=>value.startsWith(prefix));
  if(!part) return '';
  try { return decodeURIComponent(part.slice(prefix.length)); } catch { return ''; }
}

export function ensureGuestWorkspace(req:Request,res:Response):WorkspaceIdentity {
  const existing=validSession(getCookie(req,SESSION_COOKIE));
  const id=existing||randomBytes(32).toString('hex');
  if(!existing){
    const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
    const payload = `${id}.${expiresAt}`;
    res.setHeader('Set-Cookie',`${SESSION_COOKIE}=${encodeURIComponent(`${payload}.${signSession(payload)}`)}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
  }
  return {kind:'guest',id:`guest:${id}`};
}

export async function verifyFirebaseIdToken(token:string):Promise<FirebaseIdentity>{
  if(!FIREBASE_API_KEY)throw new Error('Firebase authentication is not configured on this server');
  if(token.length > MAX_FIREBASE_TOKEN_LENGTH)throw new Error('Invalid Firebase authentication token');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FIREBASE_LOOKUP_TIMEOUT_MS);
  try {
    const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:token}),signal:controller.signal});
    const data:any=await response.json();
    const user=data?.users?.[0];
    if(!response.ok||!user?.localId)throw new Error('Invalid Firebase authentication token');
    if(user.disabled)throw new Error('Firebase account is disabled');
    return {uid:String(user.localId),email:user.email,emailVerified:Boolean(user.emailVerified),displayName:user.displayName};
  } catch(error:any) {
    if(error?.name === 'AbortError') throw new Error('Firebase authentication service timed out');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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
  }catch(error:any){
    console.error('Firebase authentication failure:', error);
    res.status(401).json({error:'Authentication failed'});
  }
}

export async function requireWorkspaceAuth(req:Request,res:Response,next:NextFunction){
  try{
    const identity=await resolveWorkspaceIdentity(req,res);
    (req as any).workspaceIdentity=identity;
    req.headers['x-tenant-id']=identity.id;
    next();
  }catch(error:any){
    console.error('Workspace authentication failure:', error);
    res.status(401).json({error:'Workspace authentication failed'});
  }
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
