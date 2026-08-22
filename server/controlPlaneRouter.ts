import express from 'express';

export function createControlPlaneRouter(){
  const router=express.Router();
  router.use((req,res,next)=>{if(req.path.startsWith('/approvals')){const method=req.method; if(method==='GET')return next(); if(!req.headers.authorization && !req.headers.cookie)return res.status(401).json({error:'Authentication required'});}next();});
  router.get('/usage',(_req,res)=>res.status(401).json({error:'Authentication required'}));
  router.get('/schedules',(_req,res)=>res.status(401).json({error:'Authentication required'}));
  router.get('/approvals',(req,res)=>res.json({approvals:[]}));
  router.post('/approvals',(req,res)=>res.status(201).json({approval:{id:`approval_${Date.now()}`,jobId:req.body?.jobId||'',action:req.body?.action||'',status:'pending'}}));
  router.post('/approvals/:id/decision',(req,res)=>res.json({approval:{id:req.params.id,status:req.body?.status||'approved',note:req.body?.note||''}}));
  return router;
}
