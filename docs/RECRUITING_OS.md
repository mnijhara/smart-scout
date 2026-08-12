# Smart Scout Recruiting OS

Smart Scout is being evolved from a resume scoring/interview tool into an end-to-end recruiting orchestration platform.

## Product flow

1. Job Intelligence — create the JD and turn it into structured hiring requirements.
2. Talent Sourcing — search connected sources, normalize profiles and deduplicate candidates.
3. Candidate Intelligence — score candidates against the requirement with evidence and explainable recommendations.
4. AI Interviews — schedule and run structured audio interviews and evaluate the responses.
5. Final Decision — combine resume, sourcing and interview evidence into a recommendation. Rejection and hiring decisions remain behind explicit human approval gates.
6. Compensation Intelligence — combine customer-provided internal data with connected market compensation datasets.
7. Offer & Engagement — generate approved offers and run a configurable preboarding engagement plan.
8. Onboarding — map the selected candidate to the customer's HRIS/ATS and create the employee through an approved API workflow.

## BYOK model

Smart Scout is the orchestration and workflow layer. Customers can connect their own AI provider account (Gemini, OpenAI or Anthropic) so model usage is billed to the customer rather than Smart Scout.

**Important:** provider API keys must never be stored in browser state, local storage, source code or Firestore documents accessible to the browser. Production implementation should use a server-side encrypted tenant credential vault and short-lived server-side provider sessions.

## Sourcing connectors

The sourcing engine should use an adapter model:

- official API connector when the source provides an API;
- browser connector using Playwright only where the customer's access and the source's terms permit browser automation;
- customer ATS/career-site connector for first-party candidate pools.

A connector must expose normalized operations such as `search`, `getProfile`, `getContact`, and `saveCandidate`. Site-specific selectors, authentication and rate limits belong inside the connector adapter rather than the core recruiting workflow.

Do not design the product around defeating CAPTCHA, bot detection, access controls or other platform restrictions.

## Approval model

AI can prepare and recommend. The customer controls irreversible employment actions.

Recommended approval gates:

- publish JD
- candidate outreach where required by policy
- final interview decision
- rejection
- compensation
- offer
- employee creation in HRIS

Every recommendation should retain the evidence used, model/provider, timestamp and workflow action for auditability.

## Current implementation slice

The `RecruitingOS` workspace provides the first end-to-end product surface and workflow model. It is intentionally separated from the existing dashboard while the underlying services are migrated. Open it with `?os=1` during development.

The next implementation phases are:

1. tenant authentication + server-side encrypted credential vault;
2. AI gateway with provider adapters;
3. Playwright/API sourcing connector runtime;
4. persistent hiring workflows and candidate records;
5. interview-to-decision scoring pipeline;
6. compensation data connectors;
7. offer/engagement automation;
8. HRIS integration SDK and onboarding execution;
9. production audit logging, rate limits and approval enforcement.
