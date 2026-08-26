import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { recordAuditEvent } from './auditStore.js';

export type HiringState = { id:string; tenantId:string; jobId:string; candidateId?:string; type:string; payload:any; createdAt:string; updatedAt:string };
const filePath = process.env.SMARTSCOUT_HIRING_STATE_STORE || path.join(process.cwd(), '.smartscout-hiring-state.json');
let writeQueue = Promise.resolve();
async function readAll():Promise<HiringState[]> { try { return JSON.parse(await fs.readFile(filePath,'utf8')); } catch { return []; } }
export async function saveHiringState(tenantId:string, jobId:string, type:string, payload:any, candidateId?:string):Promise<HiringState>{
 const now=new Date().toISOString(); const state:HiringState={id:`state_${crypto.randomUUID()}`,tenantId,jobId,candidateId,type,payload,createdAt:now,updatedAt:now};
 writeQueue=writeQueue.then(async()=>{const all=await readAll();all.unshift(state);await fs.writeFile(filePath,JSON.stringify(all.slice(0,2000),null,2),'utf8');}); await writeQueue;
 void recordAuditEvent({tenantId,workflowId:jobId,candidateId:candidateId||null,eventType:`hiring_state_${type}_saved`,actorType:'system',actorId:'hiring-lifecycle',payload:{stateId:state.id,stateType:type}}).catch(()=>undefined);
 return state;
}
export async function listHiringStates(tenantId:string,jobId:string,type?:string):Promise<HiringState[]>{const all=await readAll();return all.filter(x=>x.tenantId===tenantId&&x.jobId===jobId&&(!type||x.type===type));}
