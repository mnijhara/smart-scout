import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { recordAuditEvent } from './auditStore.js';

export type HiringState = { id:string; tenantId:string; jobId:string; candidateId?:string; type:string; payload:any; createdAt:string; updatedAt:string };
const filePath = process.env.SMARTSCOUT_HIRING_STATE_STORE || path.join(process.cwd(), '.smartscout-hiring-state.json');
const MAX_HIRING_STATE_PAYLOAD_BYTES = 64 * 1024;
const MAX_HIRING_STATE_TYPE_LENGTH = 128;
const MAX_HIRING_STATE_IDENTITY_LENGTH = 256;
const MAX_HIRING_STATE_LIST_ROWS = 2000;
let writeQueue = Promise.resolve();
function db(){
 const url=process.env.SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return null;
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function workflowUuid(id:string){return id.startsWith('job_')?id.slice(4):id;}
function publicState(row:any):HiringState{return {id:`state_${row.id}`,tenantId:row.tenant_id,jobId:`job_${row.workflow_id}`,candidateId:row.candidate_id||undefined,type:row.state_type,payload:row.payload||{},createdAt:row.created_at,updatedAt:row.updated_at};}
function requireLifecycleIdentity(tenantId:string,jobId:string,candidateId?:string){
 if(!tenantId?.trim())throw new Error('Hiring state tenantId is required');
 if(tenantId.trim().length>MAX_HIRING_STATE_IDENTITY_LENGTH)throw new Error(`Hiring state tenantId exceeds ${MAX_HIRING_STATE_IDENTITY_LENGTH} characters`);
 if(!jobId?.trim())throw new Error('Hiring state jobId is required');
 if(jobId.trim().length>MAX_HIRING_STATE_IDENTITY_LENGTH)throw new Error(`Hiring state jobId exceeds ${MAX_HIRING_STATE_IDENTITY_LENGTH} characters`);
 if(candidateId !== undefined && !candidateId.trim())throw new Error('Hiring state candidateId is required when provided');
 if(candidateId !== undefined && candidateId.trim().length>MAX_HIRING_STATE_IDENTITY_LENGTH)throw new Error(`Hiring state candidateId exceeds ${MAX_HIRING_STATE_IDENTITY_LENGTH} characters`);
}
function requireStatePayload(payload:unknown){let serialized:string;try{serialized=JSON.stringify(payload ?? {});}catch{throw new Error('Hiring state payload must be JSON serializable');}if(Buffer.byteLength(serialized,'utf8')>MAX_HIRING_STATE_PAYLOAD_BYTES)throw new Error(`Hiring state payload exceeds ${MAX_HIRING_STATE_PAYLOAD_BYTES} bytes`);}
async function readAll():Promise<HiringState[]>{
 try { return JSON.parse(await fs.readFile(filePath,'utf8')); }
 catch (error:any) {
  if (error?.code === 'ENOENT') return [];
  throw new Error('Hiring state storage is unreadable; refusing to replace potentially corrupted state');
 }
}
export async function saveHiringState(tenantId:string,jobId:string,type:string,payload:any,candidateId?:string):Promise<HiringState>{
 requireLifecycleIdentity(tenantId,jobId,candidateId);
 const normalizedTenantId=tenantId.trim(); const normalizedJobId=jobId.trim(); const normalizedCandidateId=candidateId?.trim(); const normalizedType=type?.trim();
 if(!normalizedType)throw new Error('Hiring state type is required');
 if(normalizedType.length>MAX_HIRING_STATE_TYPE_LENGTH)throw new Error(`Hiring state type exceeds ${MAX_HIRING_STATE_TYPE_LENGTH} characters`);
 requireStatePayload(payload);
 const client=db();
 if(client){
  const id=crypto.randomUUID(); const {data,error}=await client.from('hiring_state_history').insert({id,tenant_id:normalizedTenantId,workflow_id:workflowUuid(normalizedJobId),candidate_id:normalizedCandidateId||null,state_type:normalizedType,payload:payload||{}}).select('*').single();
  if(error)throw new Error(`Unable to persist hiring state: ${error.message}`);
  const state=publicState(data);
  await recordAuditEvent({tenantId:normalizedTenantId,workflowId:normalizedJobId,candidateId:normalizedCandidateId||null,eventType:`hiring_state_${normalizedType}_saved`,actorType:'system',actorId:'hiring-lifecycle',payload:{stateId:state.id,stateType:normalizedType}});
  return state;
 }
 if(process.env.NODE_ENV==='production')throw new Error('Persistent hiring state storage is not configured');
 const now=new Date().toISOString(); const state:HiringState={id:`state_${crypto.randomUUID()}`,tenantId:normalizedTenantId,jobId:normalizedJobId,candidateId:normalizedCandidateId,type:normalizedType,payload,createdAt:now,updatedAt:now};
 writeQueue=writeQueue.then(async()=>{const all=await readAll();all.unshift(state);await fs.writeFile(filePath,JSON.stringify(all,null,2),'utf8');}); await writeQueue;
 await recordAuditEvent({tenantId:normalizedTenantId,workflowId:normalizedJobId,candidateId:normalizedCandidateId||null,eventType:`hiring_state_${normalizedType}_saved`,actorType:'system',actorId:'hiring-lifecycle',payload:{stateId:state.id,stateType:normalizedType}});
 return state;
}
export async function listHiringStates(tenantId:string,jobId:string,type?:string):Promise<HiringState[]>{
 requireLifecycleIdentity(tenantId,jobId);
 const normalizedTenantId=tenantId.trim(); const normalizedJobId=jobId.trim(); const normalizedType=type?.trim();
 if(type !== undefined && !normalizedType)throw new Error('Hiring state type is required when provided');
 if(normalizedType && normalizedType.length>MAX_HIRING_STATE_TYPE_LENGTH)throw new Error(`Hiring state type exceeds ${MAX_HIRING_STATE_TYPE_LENGTH} characters`);
 const client=db();
 if(client){
  let query=client.from('hiring_state_history').select('*').eq('tenant_id',normalizedTenantId).eq('workflow_id',workflowUuid(normalizedJobId)).order('created_at',{ascending:false}).limit(MAX_HIRING_STATE_LIST_ROWS);
  if(normalizedType)query=query.eq('state_type',normalizedType);
  const {data,error}=await query; if(error)throw new Error(`Unable to list hiring states: ${error.message}`); return (data||[]).map(publicState);
 }
 if(process.env.NODE_ENV==='production')throw new Error('Persistent hiring state storage is not configured');
 const all=await readAll();return all.filter(x=>x.tenantId===normalizedTenantId&&x.jobId===normalizedJobId&&(!normalizedType||x.type===normalizedType)).slice(0,MAX_HIRING_STATE_LIST_ROWS);
}
