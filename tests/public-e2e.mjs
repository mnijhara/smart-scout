import { chromium } from 'playwright';

const baseUrl = process.env.SMARTSCOUT_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText('Watch the hiring work happen on screen.', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Smart Scout · product simulation').waitFor({ state: 'visible', timeout: 5000 });
  for (const label of ['Command', 'JD', 'Source', 'Shortlist', 'Interview', 'Decision', 'Comp', 'Offer']) {
    if (!(await page.getByRole('button', { name: new RegExp(`\\b${label}\\b`) }).count())) throw new Error(`Landing journey is missing stage: ${label}`);
  }

  await page.getByRole('button', { name: /Play full hiring run/i }).click();
  await page.getByText('VP HR · Gurgaon · fictional demo data').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Screen 1 of 8').waitFor({ state: 'visible', timeout: 5000 });

  for (const [number, label] of [['01', 'Command'], ['02', 'JD'], ['03', 'Source'], ['04', 'Shortlist'], ['05', 'Interview'], ['06', 'Decision'], ['07', 'Comp'], ['08', 'Offer']]) {
    await page.getByRole('button', { name: new RegExp(`^${number} ${label}$`) }).first().waitFor({ state: 'visible', timeout: 5000 });
  }

  await page.getByRole('button', { name: /^03 Source$/ }).click();
  await page.getByText('Evidence-backed sourcing').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Profile URL captured').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /^05 Interview$/ }).click();
  await page.getByText('Structured audio interview').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Answer persistence').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /^08 Offer$/ }).click();
  await page.getByText('Comp benchmark').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: /Run your real hiring need/i }).waitFor({ state: 'visible', timeout: 5000 });

  console.log('PUBLIC_MAGIC_DEMO_E2E_OK');
} finally {
  await browser.close();
}
