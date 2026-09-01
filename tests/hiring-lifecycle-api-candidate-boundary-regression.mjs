import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/api.ts', import.meta.url), 'utf8');

const decisionBlock = source.match(/router\.post\('\/decision'[\s\S]*?\n\}\);/)?.[0] || '';
const compensationBlock = source.match(/router\.post\('\/compensation\/recommend'[\s\S]*?\n\}\);/)?.[0] || '';
const offerDraftBlock = source.match(/router\.post\('\/offer\/draft'[\s\S]*?\n\}\);/)?.[0] || '';
const offerTransitionBlock = source.match(/router\.post\('\/offer\/transition'[\s\S]*?\n\}\);/)?.[0] || '';

if (!decisionBlock) throw new Error('Decision route missing');
if (!compensationBlock) throw new Error('Compensation route missing');
if (!offerDraftBlock) throw new Error('Offer draft route missing');
if (!offerTransitionBlock) throw new Error('Offer transition route missing');

if (!/saveHiringState\(tenantId\(req\), jobId, 'decision', payload, candidateId\)/.test(decisionBlock)) {
  throw new Error('Decision persistence must remain candidate-scoped');
}
if (!/saveHiringState\(tenantId\(req\), jobId, 'compensation', payload, req\.body\?\.candidateId\)/.test(compensationBlock)) {
  throw new Error('Compensation persistence must remain candidate-scoped');
}
if (!/saveHiringState\(tenantId\(req\), jobId, 'offer', payload, candidateId\)/.test(offerDraftBlock)) {
  throw new Error('Offer drafting persistence must remain candidate-scoped');
}
if (!/listHiringStates\(tenantId\(req\), jobId, 'offer', candidateId\)/.test(offerTransitionBlock)) {
  throw new Error('Offer transition lookup must remain candidate-scoped');
}
if (!/saveHiringState\(tenantId\(req\), jobId, 'offer', payload, candidateId\)/.test(offerTransitionBlock)) {
  throw new Error('Offer transition persistence must remain candidate-scoped');
}

console.log('hiring lifecycle API candidate boundary regression passed');
