import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export type SavedCandidate = { id:string; tenantId:string; jobId:string; candidate:any; score?:any; createdAt:string; updatedAt:string };
const filePath=process.env.SMARTSCOUT_CANDIDATE_STORE||path.join(process.cwd(),'.smartscout-candidates.json');
let writeQueue=Promise.resolve();
function db(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;return url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null}
function workflowUuid(id:string){return id.startsWith('job_')?id.slice(4):id}
function publicCandidate(row:any):SavedCandidate{return{id:`candidate_${row.id}`,tenantId:row.tenant_id,jobId:`job_${row.workflow_id}`,candidate:{id:`candidate_${row.id}`,name:row.name,email:row.email,phone:row.phone,profileUrl:row.profile_url,source:row.source,resumeText:row.resume_text,evidence:row.evidence,status:row.status},score:row.score,createdAt:row.created_at,updatedAt:row.updated_at}}
async function readAll():Promise<SavedCandidate[]>{try{return JSON.parse(await fs.readFile(filePath,'utf8'))}catch{return[]}}
export async function saveCandidates(tenantId:string,jobId:string,candidates:any[]):Promise<SavedCandidate[]>{
 const client=db();
 if(client){const workflowId=workflowUuid(jobId);const rows=candidates.map(c=>({tenant_id:tenantId,workflow_id:workflowId,name:c.name||'Unknown candidate',email:c.email||null,phone:c.phone||null,profile_url:c.profileUrl||c.profile_url||null,source:c.source||'browser',resume_text:c.resumeText||c.resume_text||null,score:c.score||null,status:c.status||'discovered',evidence:c.evidence||[]}));const {data,error}=await client.from('recruiting_candidates').insert(rows).select('*');if(error)throw new Error(`Unable to persist candidates: ${error.message}`);return(data||[]).map(publicCandidate)}
 const now=new Date().toISOString();const saved=candidates.map(candidate=>({id:`candidate_${crypto.randomUUID()}`,tenantId,jobId,candidate,createdAt:now,updatedAt:now}));writeQueue=writeQueue.then(async()=>{const all=await readAll(),kept=all.filter(x=>!(x.tenantId===tenantId&&x.jobId===jobId));await fs.writeFile(filePath,JSON.stringify([...saved,...kept].slice(0,5000),null,2),'utf8')});await writeQueue;return saved;
}
export async function listCandidates(tenantId:string,jobId:string):Promise<SavedCandidate[]>{const client=db();if(client){const {data,error}=await client.from('recruiting_candidates').select('*').eq('tenant_id',tenantId).eq('workflow_id',workflowUuid(jobId)).order('updated_at',{ascending:false});if(error)throw new Error(`Unable to list candidates: ${error.message}`);return(data||[]).map(publicCandidate)}return(await readAll()).filter(x=>x.tenantId===tenantId&&x.jobId===jobId)}
export async function updateCandidateScore(tenantId:string,id:string,score:any):Promise<SavedCandidate|null>{const client=db();if(client){const candidateId=id.startsWith('candidate_')?id.slice(10):id;const {data,error}=await client.from('recruiting_candidates').update({score,updated_at:new Date().toISOString()}).eq('tenant_id',tenantId).eq('id',candidateId).select('*').maybeSingle();if(error)throw new Error(`Unable to update candidate score: ${error.message}`);return data?publicCandidate(data):null}const all=await readAll(),index=all.findIndex(x=>x.tenantId===tenantId&&x.id===id);if(index<0)return null;all[index]={...all[index],score,updatedAt:new Date().toISOString()};await fs.writeFile(filePath,JSON.stringify(all,null,2),'utf8');return all[index]}
