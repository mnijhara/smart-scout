# Recruiting OS implementation status

This document tracks the production build-out after the initial Recruiting OS workspace.

## Implemented

### 1. Provider-agnostic AI gateway
`services/recruiting/aiGateway.ts` supports Gemini, OpenAI and Anthropic through one server-side contract. Provider-specific HTTP details stay behind adapters, while the rest of Recruiting OS works with a common `generateAI()` interface.

### 2. Encrypted tenant credential vault
`services/recruiting/credentialVault.ts` uses AES-256-GCM. The encryption key comes only from the server environment (`SMARTSCOUT_VAULT_KEY`). The plaintext provider key is never returned by the persistence layer.

`services/recruiting/credentialStore.ts` persists the encrypted payload through a server-side Supabase service-role connection. The browser must never use the service-role key.

### 3. Tenant-scoped persistence model
Supabase migrations now define:

- `tenant_ai_credentials`
- `hiring_workflows`
- `recruiting_candidates`
- `recruiting_audit_events`

Browser roles are explicitly denied access to these tables; application access belongs in authenticated server routes.

### 4. Sourcing connector framework
`services/recruiting/connectors.ts` introduces a source-neutral connector contract and a safe JSON API adapter. It also normalizes and deduplicates candidates before they enter the hiring workflow.

The adapter architecture intentionally favors official APIs and customer-owned systems. Browser automation should only be added where customer access and the source's terms permit it; Smart Scout must not bypass CAPTCHA, bot detection or access controls.

## Next build slice

1. Verify the existing Firebase identity on the server and derive a trusted tenant context.
2. Add authenticated routes for saving/testing/removing AI credentials.
3. Wire the Recruiting OS AI settings panel to those routes.
4. Persist a real hiring workflow and candidate records.
5. Replace demo candidate scoring with the AI gateway + evidence/audit events.
6. Add official ATS/job-board connectors one at a time.
7. Add approval endpoints before any rejection, compensation, offer or employee-creation action.

## Security rule

Never accept a tenant identifier from an unauthenticated browser request as proof of tenancy. Every credential, candidate, workflow and audit operation must derive `tenant_id` from a verified authenticated identity/session on the server.
