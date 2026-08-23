import type { Request, Response, NextFunction } from 'express';
import { recordAuditEvent } from './auditStore.js';
export function auditRecruitingAction(eventType:string){return(req:Request,_res:Response,next:NextFunction)=>{const tenantId=String(req.header('x-tenant-id')||'');const workflowId=String(req.body?.jobId||req.params?.id||'')||null;if(tenantId)void recordAuditEvent({tenantId,workflowId,eventType,actorType:'recruiter',actorId:String(req.header('x-user-id')||'')||null,payload:{method:req.method,path:req.path}}).catch(()=>undefined);next()}}
