# Smart Scout Production Release Plan

## Product home

The Recruiting Lifecycle is the canonical product experience at `/`. The legacy dashboard is retained at `/old` for rollback/reference, and the marketing/onboarding landing page is available at `/home`.

## Release gates

A release is not considered production-ready until all of these are true:

1. TypeScript/typecheck passes.
2. Vite frontend build passes.
3. Production Node server build passes.
4. Gemini compatibility transformation passes when required.
5. Production artifact verification passes.
6. Recruiting API smoke tests pass.
7. Approval gates are enforced server-side for rejection, final decision, compensation, offer and employee creation.
8. Tenant identity is authenticated server-side; no client-supplied tenant ID is trusted for authorization.
9. Provider credentials are stored server-side and encrypted; provider secrets never enter browser storage or rendered HTML.
10. Persistent production storage is enabled for jobs, candidates, interviews, approvals, audit events and usage.
11. Live deployment is verified by a health check plus an authenticated end-to-end smoke test.

## External integrations

The product uses adapter boundaries so connectors can be enabled independently:

- AI: Gemini / OpenAI / Anthropic through the provider gateway.
- Sourcing: official APIs first; browser automation only where the customer is authorized and the source terms permit it. Never bypass CAPTCHA, bot detection or access controls.
- Calendar: interview scheduling and meeting-link adapters.
- Communications: email/SMS/WhatsApp adapters with consent and auditability.
- Compensation: market/internal benchmark adapters with source and freshness metadata.
- HRIS: employee creation adapters with field mapping, validation, approval and idempotency.

## Irreversible-action policy

AI may recommend and prepare actions. It must not autonomously execute irreversible employment decisions. Candidate rejection, final hiring decision, compensation, offer and employee creation require explicit customer approval and an audit event.

## Deployment truthfulness

A GitHub build being green is not the same as a live deployment. The release status must only be marked **Live** after the actual hosting environment returns the new build identifier and the live smoke test succeeds.
