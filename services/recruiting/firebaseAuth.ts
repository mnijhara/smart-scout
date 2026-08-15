import type { Request, Response, NextFunction } from 'express';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0431516636';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCK2ESnkH49-h9lUenEsvQvQwJSeRr3aVw';

export type FirebaseIdentity = { uid:string; email?:string; emailVerified?:boolean; displayName?:string };

export async function verifyFirebaseIdToken(token:string):Promise<FirebaseIdentity>{
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:token})});
  const data:any=await response.json();
  const user=data?.users?.[0];
  if(!response.ok||!user?.localId)throw new Error('Invalid Firebase authentication token');
  if(user.disabled)throw new Error('Firebase account is disabled');
  return {uid:String(user.localId),email:user.email,emailVerified:Boolean(user.emailVerified),displayName:user.displayName};
}

export async function requireFirebaseAuth(req:Request,res:Response,next:NextFunction){
  try{
    const header=String(req.header('authorization')||'');
    const token=header.startsWith('Bearer ')?header.slice(7).trim():'';
    if(!token)return res.status(401).json({error:'Authentication required'});
    const identity=await verifyFirebaseIdToken(token);
    (req as any).firebaseUser=identity;
    next();
  }catch(error:any){res.status(401).json({error:error?.message||'Authentication failed'});}
}

export function authenticatedTenantId(req:Request):string{
  const uid=(req as any).firebaseUser?.uid;
  if(!uid)throw new Error('Authenticated tenant identity is missing');
  return String(uid);
}

export const firebaseAuthConfig={projectId:FIREBASE_PROJECT_ID};
