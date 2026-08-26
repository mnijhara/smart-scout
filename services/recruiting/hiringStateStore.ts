import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { recordAuditEvent } from './auditStore.js';

export type HiringState = { id:string; tenantId:string; jobId:string; candidateId?:string; type:string; payload:any; createdAt:string; updatedAt:string };
const filePath = process.env.SMARTSCOUT_HIRING_STATE_STORE || path.join(process.cwd(), '.smartscout-hiring-state.json');
let writeQueue = Promise.resolve();
function db(){
 const url=process.env.SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return null;
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function workflowUuid(id:string){return id.startsWith('job_')?id.slice(4):id;}
function publicState(row:any):HiringState{return {id:`state_${row.id}`,tenantId:row.tenant_id,jobId:`job_${row.workflow_id}`,candidateId:row.candidate_id||undefined,type:row.state_type,payload:row.payload||{},createdAt:row.created_at,updatedAt:row.updated_at};}
async function readAll():Promise<HiringState[]>{try{return JSON.parse(await fs.readFile(filePath,'utf8'));}catch{return [];}}
export async function saveHiringState(tenantId:string,jobId:string,type:string,payload:any,candidateId?:string):Promise<HiringState>{
 if(!tenantId||!jobId)throw new Error('tenantId and jobId are required');
 const client=db();
 if(client){
  const id=crypto.randomUUID(); const {data,error}=await client.from('hiring_state_history').insert({id,tenant_id:tenantId,workflow_id:workflowUuid(jobId),candidate_id:candidateId||null,state_type:type,payload:payload||{}}).select('*').single();
  if(error)throw new Error(`Unable to persist hiring state: ${error.message}`);
  const state=publicState(data);
  await recordAuditEvent({tenantId,workflowId:jobId,candidateId:candidateId||null,eventType:`hiring_state_${type}_saved`,actorType:'system',actorId:'hiring-lifecycle',payload:{stateId:state.id,stateType:type}});
  return state;
 }
 if(process.env.NODE_ENV==='production')throw new Error('Persistent hiring state storage is not configured');
 const now=new Date().toISOString(); const state:HiringState={id:`state_${crypto.randomUUID()}`,tenantId,jobId,candidateId,type,payload,createdAt:now,updatedAt:now};
 writeQueue=writeQueue.then(async()=>{const all=await readAll();all.unshift(state);await fs.writeFile(filePath,JSON.stringify(all.slice(0,2000),null,2),'utf8');}); await writeQueue;
 await recordAuditEvent({tenantId,workflowId:jobId,candidateId:candidateId||null,eventType:`hiring_state_${type}_saved`,actorType:'system',actorId:'hiring-lifecycle',payload:{stateId:state.id,stateType:type}});
 return state;
}
export async function listHiringStates(tenantId:string,jobId:string,type?:string):Promise<HiringState[]>{
 const client=db();
 if(client){
  let query=client.from('hiring_state_history').select('*').eq('tenant_id',tenantId).eq('workflow_id',workflowUuid(jobId)).order('created_at',{ascending:false});
  if(type)query=query.eq('state_type',type);
  const {data,error}=await query; if(error)throw new Error(`Unable to list hiring states: ${error.message}`); return (data||[]).map(publicState);
 }
 if(process.env.NODE_ENV==='production')throw new Error('Persistent hiring state storage is not configured');
 const all=await readAll();return all.filter(x=>x.tenantId===tenantId&&x.jobId===jobId&&(!type||x.type===type));
}
