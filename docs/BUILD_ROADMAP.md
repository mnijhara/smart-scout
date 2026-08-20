# Smart Scout — Recruiting OS Build Roadmap

The Recruiting OS journey is:

**Landing → Hiring prompt → AI JD → Saved job → Sourcing → Candidate intelligence → Audio interview → Decision → Compensation → Offer → Engagement → Onboarding**

## Product release status
- [x] Premium light UI and responsive shell
- [x] Hiring prompt / JD parsing and saved requisition
- [x] Must-have / nice-to-have extraction
- [x] JD fairness and quality review prompts
- [x] Human JD approval gate before sourcing, with approval state reloaded from the control plane
- [x] Evidence-backed candidate sourcing with URL/source/evidence validation
- [x] Playwright browser sourcing path for LinkedIn/Naukri with human sign-in/verification handoff
- [x] Candidate persistence, scoring and explainable evidence
- [x] CV/profile knockout engine and side-by-side candidate comparison
- [x] Structured interview planning, answer persistence and audio/text evidence capture
- [x] Decision recommendation with human approval gate
- [x] Compensation recommendation with human approval gate
- [x] Offer drafting, approval and lifecycle transitions
- [x] Offer acceptance gate before engagement/onboarding
- [x] Engagement and onboarding plan generation
- [x] Approval/audit control plane
- [x] Firebase-backed workspace identity boundary and Google sign-in state restoration
- [x] BYOK Gemini/OpenAI/Anthropic credential handling
- [x] Production build verification, Playwright smoke tests and public magic-demo E2E
- [x] BYOK-first landing page, crisp vector brand/share asset and favicon
- [x] Magic Hiring Demo uses a horizontal journey whose active stage matches the screen shown
- [x] Public landing page labels fictional demo data instead of presenting demo metrics as live production data

## Intentionally not using official candidate-source APIs
The product uses the requested Playwright browser workflow rather than direct LinkedIn/Naukri APIs. The browser-source UI provides a normal sign-in / human-verification handoff and the server-side Playwright session captures only profile URLs, source attribution and evidence it can access.

## Provider activation still required for real external execution
- [ ] Production calendar OAuth/provider credentials and secure interview-link provider
- [ ] Production transcription provider credentials for automated transcription beyond browser speech/text capture
- [ ] Production market-data/internal parity compensation connectors
- [ ] Real offer email/SMS/WhatsApp provider activation and acceptance webhooks
- [ ] HRIS employee creation and document/task provider activation
- [ ] Apply Supabase migrations to the production project and verify persistent state end-to-end
- [ ] Full authenticated browser E2E journey, load/performance/accessibility/security audit
- [ ] Verify the latest Hostinger deployment after the current GitHub build completes

These are external-account activation items, not UI-flow blockers. The product keeps explicit human gates around actions that can create employment commitments.
