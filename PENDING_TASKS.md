# Smart Scout — Release Checklist

## Completed in the current release
- [x] Magic demo: horizontal journey and active screen stay synchronized.
- [x] Magic demo: actual visual product screens for command, JD, browser sourcing, shortlist, interview, decision and offer.
- [x] Landing page: no fabricated live hiring metrics; demo data is explicitly labelled fictional.
- [x] BYOK value proposition is visible on the homepage and social-share asset.
- [x] Favicon and vector brand assets are present.
- [x] Google sign-in state restores correctly after redirect and shows the signed-in account.
- [x] JD approval state reloads from the control plane so an approved JD does not fall back to the locked sourcing state.
- [x] Playwright LinkedIn/Naukri sourcing workflow and human sign-in/verification handoff are wired.
- [x] Evidence-backed candidate capture, scoring, knockout and comparison.
- [x] Interview evidence, decision, compensation, offer, engagement and onboarding workflow foundations.
- [x] Build, smoke-test and public-demo E2E gates are defined.

## Next production activation gates
- [ ] Calendar OAuth / interview-link provider credentials.
- [ ] Transcription provider credentials for automated transcription.
- [ ] Compensation market-data/internal parity connectors.
- [ ] Real offer communication provider and acceptance webhooks.
- [ ] HRIS employee creation/document/task provider.
- [ ] Apply and verify production Supabase migrations.
- [ ] Authenticated full-browser E2E plus performance/accessibility/security audit.
- [ ] Verify the Hostinger deployment for the current release commit.

Candidate-source official APIs are intentionally not required; the chosen sourcing path is Playwright browser automation with a human sign-in/verification handoff.
