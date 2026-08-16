# Smart Scout — Recruiting OS Build Roadmap

The Recruiting OS journey is:

**Landing → Hiring prompt → AI JD → Saved job → Sourcing → Candidate intelligence → Audio interview → Decision → Compensation → Offer → Engagement → Onboarding**

A feature is marked **[x]** when the capability exists in the repository. Production execution/integration items remain open until connected to real infrastructure and verified.

## Shipped product foundation
- [x] Premium light UI system and responsive shell
- [x] Hiring prompt / JD parsing and saved requisition
- [x] Must-have / nice-to-have extraction
- [x] JD fairness and quality review prompts
- [x] Human JD approval gate before sourcing
- [x] Evidence-backed candidate sourcing with URL/source/evidence validation
- [x] Candidate persistence, scoring and explainable evidence
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
- [x] Screen-based Magic Hiring Demo wired into the public landing experience
- [x] Current Gemini 3.6 Flash model used by AI and sourcing paths
- [x] Verified-artifact Hostinger deployment workflow restored

## Production integrations still required
- [ ] Official candidate-source connectors (LinkedIn/Naukri/other licensed APIs)
- [ ] CV/profile ingestion and knockout criteria engine
- [ ] Side-by-side candidate comparison workspace
- [ ] Production calendar scheduling, secure interview links and transcription provider
- [ ] Production market-data and internal parity compensation connectors
- [ ] Real offer email/SMS/WhatsApp delivery and acceptance webhooks
- [ ] HRIS employee creation and document/task orchestration
- [ ] Persistent production database for all Recruiting OS state
- [ ] Observability, centralized error handling, E2E journey tests
- [ ] Performance/accessibility/security review and production configuration audit
- [ ] Verified live Hostinger deployment after the restored workflow completes successfully

## Release gate
The product code path is now wired as one approval-driven hiring journey. Final production release is only declared after the verified build passes, the restored Hostinger deployment succeeds, and the remaining external integrations/persistence requirements are connected and tested.
