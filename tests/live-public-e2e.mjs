import { chromium } from 'playwright';

const baseUrl = (process.env.SMARTSCOUT_BASE_URL || 'https://smartscout.online').replace(/\/$/, '');
const expectedRelease = process.env.EXPECTED_RELEASE_SHA;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response || response.status() !== 200) {
    throw new Error(`Live homepage returned ${response?.status() ?? 'no response'}`);
  }

  if (expectedRelease) {
    const releaseResponse = await page.request.get(`${baseUrl}/release.json`, { timeout: 15000 });
    if (!releaseResponse.ok()) throw new Error(`Live release endpoint returned ${releaseResponse.status()}`);
    const release = await releaseResponse.json();
    if (release.commit !== expectedRelease) {
      throw new Error(`LIVE_RELEASE_MISMATCH expected=${expectedRelease} actual=${release.commit ?? 'missing'}`);
    }
    const metaRelease = await page.locator('meta[name="smart-scout-release"]').getAttribute('content');
    if (metaRelease !== expectedRelease) {
      throw new Error(`LIVE_META_RELEASE_MISMATCH expected=${expectedRelease} actual=${metaRelease ?? 'missing'}`);
    }
  }

  await page.getByText('From hiring intent', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Fictional product simulation').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /See the magic demo/i }).click();
  await page.getByText('Full hiring journey · fictional demo data').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Screen 1 of 7').waitFor({ state: 'visible', timeout: 5000 });

  for (const [index, label] of [
    ['01', 'Intent'], ['02', 'JD'], ['03', 'Source'], ['04', 'Shortlist'],
    ['05', 'Interview'], ['06', 'Decision'], ['07', 'Offer'],
  ]) {
    await page.getByRole('button', { name: new RegExp(`^${index} ${label}$`) }).first().waitFor({ state: 'visible', timeout: 5000 });
  }

  await page.getByRole('button', { name: /^02 JD$/ }).click();
  await page.getByRole('button', { name: /^03 Source$/ }).click();
  await page.getByText('Evidence-backed sourcing').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Profile URL captured').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /^04 Shortlist$/ }).click();
  await page.getByRole('button', { name: /^05 Interview$/ }).click();
  await page.getByText('Structured interview').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Answer persistence').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /^06 Decision$/ }).click();
  await page.getByRole('button', { name: /^07 Offer$/ }).click();
  await page.getByText('Comp benchmark').waitFor({ state: 'visible', timeout: 5000 });

  console.log(`LIVE_PUBLIC_E2E_OK ${baseUrl}`);
} finally {
  await browser.close();
}
