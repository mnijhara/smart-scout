import { chromium } from 'playwright';

const baseUrl = process.env.SMARTSCOUT_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText('From hiring intent', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Fictional product simulation').waitFor({ state: 'visible', timeout: 5000 });
  for (const label of ['Intent', 'JD', 'Source', 'Shortlist', 'Interview', 'Decision', 'Offer']) {
    if (!(await page.getByRole('button', { name: new RegExp(label) }).count())) throw new Error(`Landing journey is missing stage: ${label}`);
  }

  await page.getByRole('button', { name: /See the magic demo/i }).click();
  await page.getByText('Full hiring journey · fictional demo data').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Screen 1 of 7').waitFor({ state: 'visible', timeout: 5000 });

  for (const label of ['Intent', 'JD', 'Source', 'Shortlist', 'Interview', 'Decision', 'Offer']) {
    await page.getByRole('button', { name: new RegExp(`^\\d+ ${label}$`) }).first().waitFor({ state: 'visible', timeout: 5000 });
  }

  await page.getByRole('button', { name: /^03 Source$/ }).click();
  await page.getByText('Evidence-backed sourcing').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Profile URL captured').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /^05 Interview$/ }).click();
  await page.getByText('Structured interview').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Answer persistence').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /^07 Offer$/ }).click();
  await page.getByText('Comp benchmark').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: /Use your own hiring need/i }).waitFor({ state: 'visible', timeout: 5000 });

  console.log('PUBLIC_MAGIC_DEMO_E2E_OK');
} finally {
  await browser.close();
}
