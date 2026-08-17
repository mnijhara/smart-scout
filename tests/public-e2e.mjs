import { chromium } from 'playwright';

const baseUrl = process.env.SMARTSCOUT_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText('Watch the hiring work happen on screen.').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: /Play full hiring run/i }).click();
  await page.getByText('Recruiter command').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('New hiring request').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Type a hiring command').waitFor({ state: 'visible', timeout: 5000 });

  for (const label of ['Command', 'JD', 'Source', 'Shortlist', 'Interview', 'Decision', 'Comp', 'Offer']) {
    if (!(await page.getByText(label, { exact: true }).count())) throw new Error(`Magic demo journey is missing stage: ${label}`);
  }

  await page.getByRole('button', { name: /^Source$/ }).click();
  await page.getByText('Naukri search').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('LinkedIn search').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Evidence captured').first().waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /^Interview$/ }).click();
  await page.getByText('Structured audio interview').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('TRANSCRIPTION COMPLETE').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /^Comp$/ }).click();
  await page.getByText('Compensation benchmark').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('₹88L — ₹96L fixed').waitFor({ state: 'visible', timeout: 5000 });

  console.log('PUBLIC_MAGIC_DEMO_E2E_OK');
} finally {
  await browser.close();
}
