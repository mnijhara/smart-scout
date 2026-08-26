import { chromium } from 'playwright';

const baseUrl = process.env.SMARTSCOUT_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText('From hiring intent', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });

  const missingNames = await page.locator('button, a, input, select, textarea').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })
      .filter((element) => {
        const text = (element.textContent || '').trim();
        const aria = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby');
        const title = element.getAttribute('title');
        const placeholder = element.getAttribute('placeholder');
        const value = element.getAttribute('value');
        return !text && !aria && !title && !placeholder && !value;
      })
      .map((element) => ({ tag: element.tagName, html: element.outerHTML.slice(0, 160) }))
  );

  if (missingNames.length) {
    throw new Error(`Accessible-name regression: ${JSON.stringify(missingNames)}`);
  }

  const stageButtons = page.getByRole('button', { name: /^(Intent|JD|Source|Shortlist|Interview|Decision|Offer)$/ });
  if (await stageButtons.count() < 7) throw new Error('Expected all hiring lifecycle stage controls to be accessible by role/name');

  await page.getByRole('button', { name: /See the magic demo/i }).focus();
  if (!(await page.evaluate(() => document.activeElement?.tagName === 'BUTTON'))) {
    throw new Error('Keyboard focus regression: primary demo control is not focusable');
  }

  console.log('ACCESSIBILITY_REGRESSION_OK');
} finally {
  await browser.close();
}
