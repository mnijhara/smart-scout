# Smart Scout — Recruiting OS Build Roadmap

The Recruiting OS journey is:

**Landing → Hiring prompt → AI JD → Saved job → Sourcing → Candidate intelligence → Audio interview → Decision → Compensation → Offer → Engagement → Onboarding**

A feature is marked **[x]** when the capability exists in the repository. External-provider execution remains open until real provider credentials/tenant contracts are connected and verified.

## Shipped product foundation
- [x] Premium light UI system and responsive shell
- [x] Hiring prompt / JD parsing and saved requisition
- [x] Must-have / nice-to-have extraction
- [x] JD fairness and quality review prompts
- [x] Human JD approval gate before sourcing
- [x] Evidence-backed candidate sourcing with URL/source/evidence validation
- [x] Candidate persistence, scoring and explainable evidence
- [x] CV/profile knockout engine with hard-failure and warning explanations
- [x] Side-by-side candidate comparison API with ranked evidence
- [x] Structured interview planning, answer persistence and audio input
- [x] Decision recommendation with human approval gate
- [x] Compensation recommendation with human approval gate
- [x] Offer drafting, approval and lifecycle transitions
- [x] Offer acceptance gate before engagement/onboarding
- [x] Engagement and onboarding plan generation
- [x] Approval/audit control-plane UI and API
- [x] Firebase-backed workspace identity boundary
- [x] BYOK Gemini/OpenAI/Anthropic credential handling
- [x] Production build verification and recruiting/control-plane smoke tests
- [x] Production integration health endpoint and configuration diagnostics
- [x] Persistent production tables for documents, knockout results, comparisons and integration events
- [x] Screen-based Magic Hiring Demo wired into the public landing experience
- [x] Current Gemini 3.6 Flash model used by AI and sourcing paths
- [x] Production observability: request IDs, structured request/error logs, security headers and graceful shutdown
- [x] Verified-artifact Hostinger deployment workflow restored

## Production integrations still requiring customer/provider activation
- [ ] Official candidate-source credentials/contracts (LinkedIn/Naukri/other licensed APIs)
- [ ] CV/profile file storage provider and production document ingestion job
- [ ] Production calendar OAuth/provider credentials and secure interview-link provider
- [ ] Production transcription provider credentials
- [ ] Production market-data and internal parity compensation connectors
- [ ] Real offer email/SMS/WhatsApp provider activation and acceptance webhooks
- [ ] HRIS employee creation and document/task provider activation
- [ ] Apply Supabase migrations to the production project and verify persistent state end-to-end
- [ ] Full browser E2E journey suite and load/performance/accessibility/security audit
- [ ] Verified live Hostinger deployment after GitHub Actions has valid Hostinger SSH secrets

## Release gate
The product code path is wired as one approval-driven hiring journey and the production integration layer is now connector-ready. Final production release is only declared after provider credentials/contracts are activated, production persistence is verified, the browser E2E/security/performance gates pass, and the verified Hostinger deployment succeeds.
