import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export type SavedJob = {
  id: string;
  tenantId: string;
  prompt: string;
  analysis: any;
  createdAt: string;
  updatedAt: string;
};

const filePath = process.env.SMARTSCOUT_JOB_STORE || path.join(process.cwd(), '.smartscout-jobs.json');
let writeQueue = Promise.resolve();

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function requireTenantId(tenantId: string) {
  if (!tenantId?.trim()) throw new Error('tenantId is required');
  return tenantId.trim();
}
function workflowUuid(id: string) { return id.startsWith('job_') ? id.slice(4) : id; }
function publicJob(row: any): SavedJob { return { id: `job_${row.id}`, tenantId: row.tenant_id, prompt: row.description || '', analysis: row.requirements || {}, createdAt: row.created_at, updatedAt: row.updated_at }; }
async function readAll(): Promise<SavedJob[]> { try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { return []; } }

export async function createJob(tenantId: string, prompt: string, analysis: any): Promise<SavedJob> {
  tenantId = requireTenantId(tenantId);
  const client = db();
  if (client) {
    const id = crypto.randomUUID();
    const { data, error } = await client.from('hiring_workflows').insert({ id, tenant_id: tenantId, title: analysis?.title || analysis?.role || 'New role', description: prompt, stage: 'job', requirements: analysis || {}, approval_gates: [] }).select('*').single();
    if (error) throw new Error(`Unable to persist job: ${error.message}`);
    return publicJob(data);
  }
  const now = new Date().toISOString();
  const job: SavedJob = { id: `job_${crypto.randomUUID()}`, tenantId, prompt, analysis, createdAt: now, updatedAt: now };
  writeQueue = writeQueue.then(async () => { const jobs = await readAll(); jobs.unshift(job); await fs.writeFile(filePath, JSON.stringify(jobs.slice(0, 500), null, 2), 'utf8'); });
  await writeQueue;
  return job;
}
export const saveJob = createJob;

export async function getJob(tenantId: string, id: string): Promise<SavedJob | null> {
  tenantId = requireTenantId(tenantId);
  const client = db();
  if (client) {
    const { data, error } = await client.from('hiring_workflows').select('*').eq('tenant_id', tenantId).eq('id', workflowUuid(id)).maybeSingle();
    if (error) throw new Error(`Unable to load job: ${error.message}`);
    return data ? publicJob(data) : null;
  }
  return (await readAll()).find(job => job.tenantId === tenantId && job.id === id) || null;
}

export async function listJobs(tenantId: string): Promise<SavedJob[]> {
  tenantId = requireTenantId(tenantId);
  const client = db();
  if (client) {
    const { data, error } = await client.from('hiring_workflows').select('*').eq('tenant_id', tenantId).order('updated_at', { ascending: false });
    if (error) throw new Error(`Unable to list jobs: ${error.message}`);
    return (data || []).map(publicJob);
  }
  return (await readAll()).filter(job => job.tenantId === tenantId);
}
