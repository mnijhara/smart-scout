# Smart Scout — Remaining Production Work

## Critical product gates
- Candidate sourcing via Playwright browser workflows with visible consent/login handoff; no official API dependency.
- CV/profile ingestion and evidence extraction.
- Knockout criteria and candidate comparison.
- Interview scheduling, candidate links, transcription/review.
- Human decision approval and audit trail.
- Compensation policy/data and offer delivery.
- Engagement delivery and HRIS/onboarding execution.
- Persistent production state, observability, E2E coverage, accessibility/performance/security hardening.

## Demo quality gates
- Magic demo must show the complete hiring journey, not a disconnected screen sequence.
- Horizontal journey must track the actual screen shown.
- Approval transitions must unlock sourcing.
- BYOK value proposition must be visible on the public landing page and share metadata.
- Branding/favicon/social preview assets must be crisp and production-ready.

## Deployment gate
- Build must pass typecheck, frontend build, production server build, artifact verification and Playwright smoke tests.
- Only the verified artifact should be deployed to Hostinger.
- Verify the live domain after deployment before declaring production shipped.
