# Smart Scout — Release Readiness

This document is the production gate for the Recruiting OS release.

## Product flow

1. Hiring command creates a saved role workspace.
2. JD is generated and quality/fairness review prompts are shown.
3. Human JD approval unlocks sourcing.
4. LinkedIn/Naukri sourcing uses browser automation with human sign-in/verification handoff; official source APIs are not required.
5. Candidates require source attribution, public profile URL and concrete evidence.
6. Candidate knockout, scoring and comparison use job-relevant requirements.
7. Interview planning captures structured evidence.
8. Decision recommendation is followed by a human approval gate.
9. Compensation recommendation is followed by approval before offer drafting/sending.
10. Offer, engagement and onboarding remain explicit workflow stages.

## Trust and safety gates

- AI recommendations are advisory, not autonomous hiring decisions.
- Protected attributes and common proxy language are surfaced for human review.
- Vague requirements are surfaced for review.
- Candidate rankings require evidence and source attribution.
- Approval state is persisted in the control plane and reloaded when the workspace is reopened.
- Candidate-source credentials are not stored in source-code or frontend bundles.
- BYOK credentials are handled through the recruiting credential flow rather than embedded in the landing-page demo.

## Production verification

The GitHub production workflow must pass:

- lint/type validation
- Vite production build
- production Node server bundle
- artifact integrity checks
- authenticated recruiting smoke tests
- unauthenticated access-control checks
- knockout and candidate-comparison smoke tests
- public E2E journey

Hostinger deployment is considered complete only after the verified artifact is deployed and the live site is independently checked.

## Remaining external activation

- Calendar/interview-link OAuth credentials
- Automated transcription provider credentials
- Compensation market-data/internal parity connectors
- Real offer communication and acceptance webhooks
- HRIS employee creation/document/task provider
- Production Supabase migrations
- Authenticated browser E2E and performance/accessibility/security audit
- Independent Hostinger verification
