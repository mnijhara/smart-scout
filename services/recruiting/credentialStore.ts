import { createClient } from '@supabase/supabase-js';
import { decryptCredential, encryptCredential, type StoredCredential } from './credentialVault';
import type { AIProvider } from './aiGateway';

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Supabase server credentials are not configured');
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function asStored(row: any): StoredCredential {
  return {
    tenantId: row.tenant_id,
    provider: row.provider,
    ciphertext: row.ciphertext,
    iv: row.iv,
    tag: row.tag,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveAICredential(tenantId: string, provider: AIProvider, apiKey: string) {
  if (!tenantId) throw new Error('tenantId is required');
  const encrypted = encryptCredential(apiKey, tenantId, provider);
  const { error } = await getAdminClient().from('tenant_ai_credentials').upsert({
    tenant_id: encrypted.tenantId,
    provider: encrypted.provider,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    tag: encrypted.tag,
    updated_at: encrypted.updatedAt,
  }, { onConflict: 'tenant_id,provider' });
  if (error) throw new Error(`Unable to store AI credential: ${error.message}`);
  return { tenantId, provider, updatedAt: encrypted.updatedAt };
}

export async function getAICredential(tenantId: string, provider: AIProvider): Promise<string | null> {
  const { data, error } = await getAdminClient().from('tenant_ai_credentials')
    .select('tenant_id,provider,ciphertext,iv,tag,created_at,updated_at')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw new Error(`Unable to load AI credential: ${error.message}`);
  return data ? decryptCredential(asStored(data)) : null;
}

export async function deleteAICredential(tenantId: string, provider: AIProvider) {
  const { error } = await getAdminClient().from('tenant_ai_credentials')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('provider', provider);
  if (error) throw new Error(`Unable to delete AI credential: ${error.message}`);
}

export async function listAIProviders(tenantId: string): Promise<AIProvider[]> {
  const { data, error } = await getAdminClient().from('tenant_ai_credentials')
    .select('provider')
    .eq('tenant_id', tenantId);
  if (error) throw new Error(`Unable to list AI credentials: ${error.message}`);
  return Array.from(new Set((data || []).map((row: any) => row.provider as AIProvider)));
}
