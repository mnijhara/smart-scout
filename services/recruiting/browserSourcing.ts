import { chromium, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

export type BrowserSource = 'linkedin' | 'naukri';
export type BrowserCandidate = {
  name: string;
  headline?: string;
  location?: string;
  profileUrl: string;
  source: BrowserSource;
  summary?: string;
  evidence: string[];
};

const PROFILE_ROOT = process.env.SMARTSCOUT_BROWSER_PROFILE_DIR || path.join(process.cwd(), '.smartscout-browser');

function searchUrl(source: BrowserSource, query: string) {
  if (source === 'linkedin') return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
  return `https://www.naukri.com/search?keyword=${encodeURIComponent(query)}`;
}

function sourceHost(source: BrowserSource) {
  return source === 'linkedin' ? 'linkedin.com' : 'naukri.com';
}

async function ensureProfileDir(tenantId: string) {
  const safe = tenantId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'default';
  const dir = path.join(PROFILE_ROOT, safe);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function openContext(tenantId: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(await ensureProfileDir(tenantId), {
    headless: process.env.SMARTSCOUT_BROWSER_HEADLESS !== 'false',
    viewport: { width: 1440, height: 1000 },
    locale: 'en-IN',
  });
}

async function collectLinkedIn(page: Page, limit: number): Promise<BrowserCandidate[]> {
  return page.locator('a[href*="/in/"]').evaluateAll((links, max) => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const link of links as HTMLAnchorElement[]) {
      const href = link.href.split('?')[0];
      const name = (link.textContent || '').trim().replace(/\s+/g, ' ');
      if (!href || !name || seen.has(href) || !href.includes('linkedin.com/in/')) continue;
      seen.add(href);
      const card = link.closest('li') || link.parentElement?.parentElement;
      const text = (card?.textContent || link.textContent || '').trim().replace(/\s+/g, ' ');
      out.push({ name, profileUrl: href, source: 'linkedin', evidence: text ? [text.slice(0, 500)] : [] });
      if (out.length >= Number(max)) break;
    }
    return out;
  }, limit);
}

async function collectNaukri(page: Page, limit: number): Promise<BrowserCandidate[]> {
  return page.locator('a[href*="/profile/"]').evaluateAll((links, max) => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const link of links as HTMLAnchorElement[]) {
      const href = link.href.split('?')[0];
      const name = (link.textContent || '').trim().replace(/\s+/g, ' ');
      if (!href || !name || seen.has(href) || !href.includes('naukri.com/profile/')) continue;
      seen.add(href);
      const card = link.closest('article') || link.closest('li') || link.parentElement?.parentElement;
      const text = (card?.textContent || link.textContent || '').trim().replace(/\s+/g, ' ');
      out.push({ name, profileUrl: href, source: 'naukri', evidence: text ? [text.slice(0, 500)] : [] });
      if (out.length >= Number(max)) break;
    }
    return out;
  }, limit);
}

export async function searchBrowserCandidates(tenantId: string, source: BrowserSource, query: string, limit = 8) {
  if (!tenantId) throw new Error('Workspace identity is missing');
  if (!query.trim()) throw new Error('Search query is required');
  const context = await openContext(tenantId);
  try {
    const page = await context.newPage();
    await page.goto(searchUrl(source, query), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1200);

    const body = (await page.locator('body').innerText()).slice(0, 4000);
    if (/captcha|verify you are human|unusual traffic|access denied/i.test(body)) {
      throw new Error(`${source} requires a human verification step. Complete it in the browser session and retry.`);
    }
    const current = page.url();
    if (source === 'linkedin' && /login|authwall/i.test(current)) throw new Error('LinkedIn session is not signed in. Sign in once in the SmartScout browser profile, then retry.');
    if (source === 'naukri' && /login/i.test(current)) throw new Error('Naukri session is not signed in. Sign in once in the SmartScout browser profile, then retry.');

    const candidates = source === 'linkedin' ? await collectLinkedIn(page, limit) : await collectNaukri(page, limit);
    return candidates.map(c => ({ ...c, source: sourceHost(source) }));
  } finally {
    await context.close();
  }
}
