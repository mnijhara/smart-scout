# Smart Scout

Smart Scout is a private, AI-assisted recruiting workspace that supports the hiring workflow from hiring intent and JD quality review through sourcing, candidate evidence, interviews, human approvals, compensation, offers and onboarding preparation.

## Production architecture

- React/Vite frontend with a Node/Express production server.
- Workspace authentication with Firebase identity tokens or an isolated signed guest workspace session.
- Optional BYOK for Gemini, OpenAI and Anthropic. Credentials are encrypted server-side and never returned to the browser after saving.
- Supabase is used for credential/document persistence where configured.
- Recruiting state is tenant-scoped and protected by workspace authentication.
- Human approval gates remain in the workflow before consequential hiring actions.
- Browser-assisted LinkedIn/Naukri sourcing requires the recruiter's own signed-in browser session and does not bypass CAPTCHA or access controls.

## Local development

**Prerequisites:** Node.js 22

1. Install dependencies:
   `npm install`
2. Configure the required server environment variables for the integrations you intend to use.
3. Start the development server:
   `npm run dev`

## Production verification

The GitHub Actions production build performs TypeScript checks, frontend/server builds, artifact verification, API smoke tests and the public browser E2E journey before the production artifact is eligible for deployment.

Do not commit `.env.local`, service-role keys, AI provider secrets, or other credentials to the repository.
