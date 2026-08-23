import fs from 'node:fs';

const required = [
  'components/LandingPageRelease.tsx',
  'components/AuthGateRelease.tsx',
  'components/HiringLifecycleRelease.tsx',
  'components/BrowserSourceConnect.tsx',
  'services/recruiting/browserSourcing.ts',
  'services/recruiting/browserSourceRoutes.ts',
  'services/recruiting/firebaseAuth.ts',
  'services/recruiting/controlPlane.ts',
  'tests/public-e2e.mjs',
  '.github/workflows/refresh-dist.yml'
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Release contract missing: ${file}`);
}
const landing = fs.readFileSync('components/LandingPageRelease.tsx','utf8');
const lifecycle = fs.readFileSync('components/HiringLifecycleRelease.tsx','utf8');
const workflow = fs.readFileSync('.github/workflows/refresh-dist.yml','utf8');
for (const text of [landing,lifecycle]) {
  for (const marker of ['BYOK','human','sourcing','interview','compensation','onboarding']) {
    if (!text.toLowerCase().includes(marker.toLowerCase())) throw new Error(`Release contract missing ${marker}`);
  }
}
for (const marker of ['npm run build','node --check server.js','PUBLIC_MAGIC_DEMO_E2E_OK']) {
  if (!workflow.includes(marker)) throw new Error(`Workflow missing ${marker}`);
}
console.log('RELEASE_CONTRACT_OK');
