import { readFile } from 'node:fs/promises';

const api = await readFile(new URL('../services/recruiting/api.ts', import.meta.url), 'utf8');
const gateway = await readFile(new URL('../services/recruiting/aiGateway.ts', import.meta.url), 'utf8');

const failures = [];

if (!/if \(session\) return res\.json\(\{ connected: true/.test(api)) failures.push('saved provider sessions must report connected=true');
if (!/if \(process\.env\.GEMINI_API_KEY\) return res\.json\(\{ connected: true/.test(api)) failures.push('server Gemini configuration must be reflected in provider status');
if (!/res\.json\(\{ connected: false, provider: null, model: null \}\)/.test(api)) failures.push('provider status must explicitly report disconnected when no credential exists');
if (!/\['gemini', 'openai', 'anthropic'\]/.test(api)) failures.push('provider status must enumerate the supported provider set');
if (!/if\(!apiKey\)throw new Error\('AI provider credential is not configured'\)/.test(gateway)) failures.push('AI calls must fail honestly when no provider credential is configured');
if (!/export type AIProvider='gemini'\|'openai'\|'anthropic'/.test(gateway)) failures.push('AI gateway provider types must stay aligned with the supported provider set');

if (failures.length) {
  console.error('Provider configuration regression checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Provider configuration regression checks passed (explicit connected/disconnected state, supported providers, missing-credential behavior).');
