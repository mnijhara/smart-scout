# Smart Scout — Recruiting OS Build Roadmap

The Recruiting OS is being shipped feature-by-feature. The current product journey is:

**Landing → Hiring prompt → AI JD → Saved job → Sourcing → Candidate intelligence → Audio interview → Decision → Compensation → Offer → Engagement → Onboarding**

A feature is marked **[x]** only when the capability exists in the repository. Production execution/integration items remain explicitly open until they are connected to real infrastructure and verified.

## Phase 1 — Product foundation
- [x] Premium light UI system
- [x] Responsive application shell and navigation
- [x] Hiring dashboard and pipeline view
- [x] Activity feed, metrics and quick actions
- [x] New Job interaction

## Phase 2 — Job Intelligence
- [x] Hiring prompt / JD parsing and structured requirements
- [x] Must-have vs nice-to-have extraction
- [x] Create requisition with explicit recruiter approval workflow
- [ ] JD upload / paste / URL ingestion
- [ ] Bias / quality checks surfaced in the hiring UI
- [x] Human approval gate wired into the JD stage

## Phase 3 — Talent Sourcing
- [x] Candidate normalization and deduplication primitives
- [x] Search strategy / sourcing foundation
- [x] Candidate persistence against the saved Job
- [ ] Production candidate source connectors using official APIs
- [ ] Evidence-backed candidate profiles with source attribution
- [ ] Outreach workflow and delivery tracking

## Phase 4 — Candidate Intelligence
- [x] Candidate / profile scoring foundation
- [x] Explainable scoring evidence
- [ ] CV / profile ingestion across supported document formats in the OS flow
- [ ] Knockout criteria engine
- [x] Recruiter shortlist / interview selection
- [ ] Side-by-side candidate comparison workspace

## Phase 5 — AI Interviews
- [x] Interview plan generation
- [x] Persistent interview records
- [x] Audio interview experience
- [x] Answer persistence and structured evidence
- [ ] Production scheduling/calendar integration
- [ ] Secure candidate interview links
- [ ] Production transcription provider and resilient retry path
- [ ] Human review and approval UI

## Phase 6 — Hiring Decision
- [x] Evidence aggregation foundation
- [x] Profile + interview decision payload
- [x] Decision recommendation foundation
- [x] Approval/audit control-plane primitives
- [ ] Decision approval UI integrated into the lifecycle
- [ ] Immutable production audit trail

## Phase 7 — Compensation
- [x] Market/internal benchmark input foundation
- [x] Compensation recommendation
- [x] Approval control-plane primitive
- [ ] Production market-data connector
- [ ] Internal parity data integration
- [ ] Compensation approval UI and policy rules

## Phase 8 — Offer & Engagement
- [x] Offer generation
- [x] Persisted offer lifecycle transitions
- [x] Engagement plan generation
- [ ] Offer versioning and approval UI
- [ ] Real email/SMS/WhatsApp candidate communication
- [ ] Offer acceptance webhook/status integration
- [ ] Candidate engagement delivery tracking

## Phase 9 — Onboarding
- [x] Onboarding plan foundation
- [ ] HRIS integrations
- [ ] Employee creation execution
- [ ] Document / task orchestration
- [ ] Handoff confirmation and retry handling

## Phase 10 — Production hardening
- [x] Authentication and Firebase-backed tenant identity / isolation boundary
- [x] BYOK AI credential handling foundation
- [ ] Persistent production database for all Recruiting OS state
- [x] Control-plane API foundation for approvals, audit, scheduling and metering
- [x] Production build smoke tests for recruiting/control-plane APIs
- [ ] Observability and centralized error handling
- [x] Usage / credits metering foundation
- [ ] End-to-end tests across the complete hiring journey
- [x] Mobile polish
- [ ] Performance and accessibility pass
- [ ] Security review and secrets/configuration audit

## Final release
The Recruiting OS is now the root `/` product experience behind an authenticated release boundary. Final production release still requires persistent production state, real external integrations, approval/delivery workflows, end-to-end verification, observability, security review and a verified live deployment.
