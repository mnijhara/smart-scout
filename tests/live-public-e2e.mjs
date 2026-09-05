import { chromium } from 'playwright';

const baseUrl = (process.env.SMARTSCOUT_BASE_URL || 'https://smartscout.online').replace(/\/$/, '');
const expectedRelease = process.env.EXPECTED_RELEASE_SHA;
const browser = await chromium.launch({ headless: true });

async function exerciseHiringJourney(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText('From hiring intent', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Fictional product simulation').waitFor({ state: 'visible', timeout: 5000 });
  const logo = page.locator('img[alt="Smart Scout"]').first();
  if (await logo.count()) await logo.waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /See the magic demo/i }).click();
  await page.getByText('Full hiring journey · fictional demo data').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Screen 1 of 7').waitFor({ state: 'visible', timeout: 5000 });

  for (const [index, label] of [
    ['01', 'Intent'], ['02', 'JD'], ['03', 'Source'], ['04', 'Shortlist'],
    ['05', 'Interview'], ['06', 'Decision'], ['07', 'Offer'],
  ]) {
    await page.getByRole('button', { name: new RegExp(`^${index} ${label}$`) }).first().waitFor({ state: 'visible', timeout: 5000 });
  }

  await page.getByRole('button', { name: /^03 Source$/ }).click();
  await page.getByText('Evidence-backed sourcing').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Profile URL captured').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /^05 Interview$/ }).click();
  await page.getByText('Structured interview').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Answer persistence').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: /^07 Offer$/ }).click();
  await page.getByText('Comp benchmark').waitFor({ state: 'visible', timeout: 5000 });
}

const consoleErrors = [];
const pageErrors = [];

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  desktop.on('pageerror', (error) => pageErrors.push(error.message));

  const response = await desktop.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response || response.status() !== 200) {
    throw new Error(`Live homepage returned ${response?.status() ?? 'no response'}`);
  }

  if (expectedRelease) {
    const releaseResponse = await desktop.request.get(`${baseUrl}/release.json`, { timeout: 15000 });
    if (!releaseResponse.ok()) throw new Error(`Live release endpoint returned ${releaseResponse.status()}`);
    const release = await releaseResponse.json();
    if (release.commit !== expectedRelease) {
      throw new Error(`LIVE_RELEASE_MISMATCH expected=${expectedRelease} actual=${release.commit ?? 'missing'}`);
    }
    const metaRelease = await desktop.locator('meta[name="smart-scout-release"]').getAttribute('content');
    if (metaRelease !== expectedRelease) {
      throw new Error(`LIVE_META_RELEASE_MISMATCH expected=${expectedRelease} actual=${metaRelease ?? 'missing'}`);
    }
  }

  await exerciseHiringJourney(desktop);
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  mobile.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  mobile.on('pageerror', (error) => pageErrors.push(error.message));
  await exerciseHiringJourney(mobile);
  const horizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (horizontalOverflow) throw new Error('Live mobile landing journey has horizontal overflow');
  await mobile.close();

  if (consoleErrors.length || pageErrors.length) {
    throw new Error(`LIVE_BROWSER_ERRORS console=${JSON.stringify(consoleErrors)} page=${JSON.stringify(pageErrors)}`);
  }

  console.log(`LIVE_PUBLIC_E2E_OK ${baseUrl}`);
} finally {
  await browser.close();
}
