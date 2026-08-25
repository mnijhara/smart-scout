# Interview persistence migration note

The interview service remains filesystem-backed unless the production interview persistence adapter is activated. Before enabling a Supabase-backed adapter, verify the production schema exposes a recruiting_interviews table with tenant_id, workflow_id, candidate_id, plan, answers, evidence, status, created_at and updated_at, plus a uniqueness constraint for tenant/workflow/candidate.

Until that schema is verified and migrated, do not claim production interview persistence is active. The application continues using its safe local fallback.
