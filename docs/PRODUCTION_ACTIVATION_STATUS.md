# Production activation status

## Code-complete foundations
- Hiring workflow persistence
- Candidate persistence
- Audit event persistence
- Interview persistence adapter + schema migration
- Evidence-backed browser sourcing
- Human approval gates
- BYOK credential vault
- Authentication and API authorization
- Build, smoke-test and E2E release gates

## Requires real production activation
- Apply Supabase migrations `001` through `006` to the production project and verify schema.
- Configure/verify calendar provider credentials before claiming meeting-link creation is active.
- Configure/verify transcription provider credentials before claiming automated transcription is active.
- Configure/verify compensation data provider before claiming live market benchmarking is active.
- Configure/verify offer communication provider/webhooks before claiming delivery is active.
- Configure/verify HRIS provider before claiming employee creation/onboarding execution is active.
- Run authenticated browser E2E against the deployed environment.
- Independently verify the Hostinger deployment and production artifact.

Do not represent any provider-backed action as completed when the required production credential is absent.
