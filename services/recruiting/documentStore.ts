import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function saveRecruitingDocument(input: {
  tenantId: string;
  jobId?: string;
  candidateId?: string;
  filename: string;
  mimeType: string;
  extractedText: string;
}) {
  if (!input.tenantId) throw new Error('tenantId is required');
  const { data, error } = await getAdminClient().from('recruiting_documents').insert({
    tenant_id: input.tenantId,
    job_id: input.jobId || null,
    candidate_id: input.candidateId || null,
    filename: input.filename,
    mime_type: input.mimeType,
    extracted_text: input.extractedText,
  }).select('id,filename,mime_type,created_at').single();
  if (error) throw new Error(`Unable to persist document: ${error.message}`);
  return data;
}
