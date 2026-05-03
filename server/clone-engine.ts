/**
 * server/clone-engine.ts
 * Pure Playwright scraping engine — no HTTP layer.
 * Used by the Vite dev-server middleware (vite.config.ts) so it runs
 * directly on port 8081 without a separate process.
 */
import { chromium, type Browser } from 'playwright';

// ─── types ────────────────────────────────────────────────────────────────────
export interface SectionResult {
  id: string;
  label: string;
  status: 'found' | 'missing';
  preview: string;
  screenshotBase64?: string;
}

export interface ClonedPage {
  page_name: string;
  headline_template: string;
  subheadline: string;
  subheadline_template: string;
  fallback_headline: string;
  cta_text: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  hero_image_url: string;
  before_image_url: string;
  after_image_url: string;
  about_title: string;
  about_text: string;
  service_area_description: string;
  maps_embed_url: string;
  features: { icon: string; title: string; description: string }[];
  testimonials: { name: string; text: string; rating: number }[];
  template_type: string;
  service_name: string;
}

export interface CloneResult {
  sections: SectionResult[];
  data: ClonedPage;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function absUrl(src: string, base: string): string {
  if (!src) return '';
  try { return new URL(src, base).href; } catch { return src; }
}

function toHex(val: string): string {
  if (!val) return '';
  val = val.trim();
  if (/^#[0-9a-f]{3,6}$/i.test(val)) return val.toLowerCase();
  const m = val.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  return '';
}

function detectVertical(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('chimney') || t.includes('fireplace')) return 'chimney';
  if (t.includes('locksmith')) return 'locksmith';
  if (t.includes('dryer vent') || t.includes('dryer cleaning')) return 'dryer_vent';
  if (t.includes('hvac') || t.includes('air condition') || t.includes('heating & cooling')) return 'hvac';
  if (t.includes('plumb') || t.includes('pipe repair')) return 'plumbing';
  if (t.includes('electric')) return 'electrical';
  if (t.includes('roof')) return 'roofing';
  if (t.includes('pest') || t.includes('termite')) return 'pest_control';
  return 'garage_door';
}

// ─── shared browser (pre-warmed, reused across requests) ─────────────────────
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--single-process',
];

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser) {
    try { await _browser.version(); return _browser; } catch { _browser = null; }
  }
  console.log('[clone-engine] launching browser...');
  _browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });
  console.log('[clone-engine] browser ready');
  return _browser;
}

// Pre-warm on import so the first request is fast
getBrowser().catch(e => console.warn('[clone-engine] warm failed:', e.message));

// ─── screenshot helper ────────────────────────────────────────────────────────
async function screenshotLocator(
  page: import('playwright').Page,
  selectors: string[],
  scrollToIt = false
): Promise<string> {
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel).first();
      const box = await loc.boundingBox();
      if (!box || box.width < 100 || box.height < 50) continue;
      if (scrollToIt) {
        await page.evaluate(y => window.scrollTo(0, Math.max(0, y - 80)), box.y);
        await page.waitForTimeout(400);
      }
      const buf = await page.screenshot({
        clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: Math.min(box.height, 600) },
      });
      return buf.toString('base64');
    } catch { /* try next */ }
  }
  return '';
}

// ─── main export ─────────────────────────────────────────────────────────────
export async function runClone(url: string): Promise<CloneResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    // Navigate — accept both full load and partial load gracefully
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      // If domcontentloaded times out, try commit (fires as soon as server responds)
      try { await page.goto(url, { waitUntil: 'commit', timeout: 10000 }); } catch { /* best effort */ }
    }
    // Wait for JS-rendered content
    await page.waitForTimeout(1500);
    // Trigger lazy-load
    try {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
    } catch { /* ignore scroll errors */ }

    const sections: SectionResult[] = [];
    const data: ClonedPage = {
      page_name: '', headline_template: '', subheadline: '', subheadline_template: '',
      fallback_headline: '', cta_text: 'Call Now', primary_color: '#2563eb',
      secondary_color: '#1e293b', accent_color: '#f59e0b', logo_url: '', hero_image_url: '',
      before_image_url: '', after_image_url: '', about_title: '', about_text: '',
      service_area_description: '', maps_embed_url: '', features: [], testimonials: [],
      template_type: 'garage_door', service_name: '',
    };

    // ── 1. Meta ───────────────────────────────────────────────────────────────
    const meta = await page.evaluate(() => ({
      ogTitle: document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content || '',
      ogDesc:  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content || '',
      ogImg:   document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content || '',
      title:   document.title || '',
    }));
    data.page_name = clean(meta.ogTitle || meta.title);

    // ── 2. Hero section (screenshot + content) ────────────────────────────────
    const heroData = await page.evaluate(() => {
      const h1 = (document.querySelector('h1') as HTMLElement)?.innerText?.trim() || '';
      const h2 = (document.querySelector('h1 + p, h1 ~ p, h2') as HTMLElement)?.innerText?.trim() || '';
      const ctaEl = document.querySelector<HTMLElement>('a[href*="tel"], .hero a, [class*="cta"] a, [class*="btn-primary"], [class*="btn--primary"]');
      const cta = ctaEl?.innerText?.trim() || '';
      const heroImg = (document.querySelector<HTMLImageElement>('.hero img, [class*="hero"] img, [class*="banner"] img') as HTMLImageElement)?.src || '';
      return { h1, h2, cta, heroImg };
    });

    data.headline_template = clean(heroData.h1);
    data.fallback_headline = data.headline_template;
    data.subheadline = clean(heroData.h2);
    data.subheadline_template = data.subheadline;
    data.cta_text = clean(heroData.cta) || 'Call Now';
    data.hero_image_url = absUrl(clean(meta.ogImg) || heroData.heroImg, url);

    const heroShot = await screenshotLocator(page, [
      '.hero', '[class*="hero"]', '[class*="banner"]',
      'main > section:first-child', 'header',
    ]);
    sections.push({
      id: 'hero', label: 'Hero Section',
      status: heroData.h1 ? 'found' : 'missing',
      preview: data.headline_template || '—',
      screenshotBase64: heroShot,
    });

    // ── 3. Brand colors ───────────────────────────────────────────────────────
    const colorData = await page.evaluate(() => {
      const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content || '';
      const headerEl = document.querySelector<HTMLElement>('header, nav, [class*="navbar"]');
      const footerEl = document.querySelector<HTMLElement>('footer, [class*="footer"]');
      const ctaEl  = document.querySelector<HTMLElement>('[class*="btn-primary"], [class*="btn--primary"], [class*="cta"]');
      return {
        theme,
        headerBg: headerEl ? getComputedStyle(headerEl).backgroundColor : '',
        footerBg: footerEl ? getComputedStyle(footerEl).backgroundColor : '',
        ctaBg: ctaEl ? getComputedStyle(ctaEl).backgroundColor : '',
      };
    });
    const px = toHex(colorData.theme) || toHex(colorData.headerBg);
    const sx = toHex(colorData.footerBg);
    const ax = toHex(colorData.ctaBg);
    const INVALID = new Set(['#ffffff', '#000000', '']);
    if (px && !INVALID.has(px)) data.primary_color = px;
    if (sx && !INVALID.has(sx) && sx !== data.primary_color) data.secondary_color = sx;
    if (ax && !INVALID.has(ax) && ax !== data.primary_color) data.accent_color = ax;

    sections.push({
      id: 'colors', label: 'Brand Colors',
      status: px ? 'found' : 'missing',
      preview: `${data.primary_color} / ${data.secondary_color} / ${data.accent_color}`,
    });

    // ── 4. Logo ───────────────────────────────────────────────────────────────
    const logoSrc = await page.evaluate(() =>
      (document.querySelector<HTMLImageElement>(
        'header img, .logo img, [class*="logo"] img, nav img, img[alt*="logo" i]'
      ))?.src || ''
    );
    data.logo_url = absUrl(logoSrc, url);
    sections.push({
      id: 'logo', label: 'Logo',
      status: data.logo_url ? 'found' : 'missing',
      preview: data.logo_url ? 'Image found' : '—',
    });

    // ── 5. Features / Benefits ────────────────────────────────────────────────
    const featuresRaw = await page.evaluate(() => {
      const containers = [
        '.features', '[class*="features"]', '.why-us', '[class*="why"]',
        '.benefits', '[class*="benefit"]', '[class*="service-list"]', '[class*="icon-box"]',
      ];
      for (const sel of containers) {
        const container = document.querySelector(sel);
        if (!container) continue;
        const cards = container.querySelectorAll<HTMLElement>('li, .card, [class*="card"], article, [class*="item"]');
        const results: { title: string; description: string }[] = [];
        for (const card of Array.from(cards).slice(0, 6)) {
          const t = (card.querySelector<HTMLElement>('h3, h4, strong, .title, [class*="title"]'))?.innerText?.trim() || '';
          const d = (card.querySelector<HTMLElement>('p, .desc, [class*="desc"]'))?.innerText?.trim() || '';
          if (t && t.length < 100) results.push({ title: t, description: d });
        }
        if (results.length >= 3) return results.slice(0, 6);
      }
      return [];
    });
    data.features = featuresRaw.map(f => ({ icon: 'star', title: f.title, description: f.description }));

    const featShot = await screenshotLocator(page,
      ['.features', '[class*="features"]', '.why-us', '[class*="benefit"]'], true
    );
    sections.push({
      id: 'features', label: 'Features / Benefits',
      status: data.features.length > 0 ? 'found' : 'missing',
      preview: data.features.length > 0 ? `${data.features.length} items – ${data.features[0]?.title}` : '—',
      screenshotBase64: featShot,
    });

    // ── 6. Testimonials ───────────────────────────────────────────────────────
    const testimonialsRaw = await page.evaluate(() => {
      const selectors = [
        '.testimonials', '[class*="testimonial"]',
        '.reviews', '[class*="review"]', 'blockquote',
      ];
      for (const sel of selectors) {
        const container = document.querySelector(sel);
        if (!container) continue;
        const items = container.querySelectorAll<HTMLElement>(
          'blockquote, [class*="testimonial-item"], [class*="review-item"], li, article'
        );
        const results: { name: string; text: string; rating: number }[] = [];
        for (const item of Array.from(items).slice(0, 5)) {
          const textEl = item.querySelector<HTMLElement>('p, [class*="text"], [class*="body"]') ?? item;
          const nameEl = item.querySelector<HTMLElement>('.name, [class*="name"], .author, [class*="author"], cite, footer');
          const text = textEl.innerText?.trim() || '';
          const name = nameEl?.innerText?.trim() || 'Customer';
          const stars = item.querySelectorAll('[class*="star-fill"], [class*="star--on"], .fa-star').length;
          if (text.length > 20) results.push({ name, text: text.slice(0, 300), rating: stars || 5 });
        }
        if (results.length >= 1) return results.slice(0, 5);
      }
      return [];
    });
    data.testimonials = testimonialsRaw;

    const testShot = await screenshotLocator(page,
      ['.testimonials', '[class*="testimonial"]', '.reviews', '[class*="review"]'], true
    );
    sections.push({
      id: 'testimonials', label: 'Testimonials',
      status: data.testimonials.length > 0 ? 'found' : 'missing',
      preview: data.testimonials.length > 0 ? `${data.testimonials.length} reviews` : '—',
      screenshotBase64: testShot,
    });

    // ── 7. About ──────────────────────────────────────────────────────────────
    const aboutRaw = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('#about, [id*="about"], .about, [class*="about-section"]');
      if (!section) return { title: '', text: '' };
      const title = (section.querySelector<HTMLElement>('h2, h3'))?.innerText?.trim() || '';
      const paras = Array.from(section.querySelectorAll<HTMLElement>('p'))
        .map(p => p.innerText?.trim()).filter(Boolean).slice(0, 3);
      return { title, text: paras.join('\n\n') };
    });
    data.about_title = clean(aboutRaw.title);
    data.about_text = clean(aboutRaw.text);

    const aboutShot = await screenshotLocator(page,
      ['#about', '.about', '[class*="about-section"]', '[class*="about-us"]'], true
    );
    sections.push({
      id: 'about', label: 'About Section',
      status: data.about_text ? 'found' : 'missing',
      preview: (data.about_title || data.about_text).slice(0, 60) || '—',
      screenshotBase64: aboutShot,
    });

    // ── 8. Service Area + Map embed ───────────────────────────────────────────
    const serviceAreaRaw = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>(
        '#service-area, [id*="service-area"], .service-area, [class*="coverage"], [class*="areas"]'
      );
      const iframe = document.querySelector<HTMLIFrameElement>('iframe[src*="google.com/maps"], iframe[src*="maps.google"]');
      const text = section
        ? Array.from(section.querySelectorAll<HTMLElement>('p, li'))
            .map(el => el.innerText?.trim()).filter(Boolean).join('\n')
        : '';
      return { text, mapsUrl: iframe?.src || '' };
    });
    data.service_area_description = clean(serviceAreaRaw.text);
    data.maps_embed_url = serviceAreaRaw.mapsUrl;
    sections.push({
      id: 'service_area', label: 'Service Area',
      status: data.service_area_description || data.maps_embed_url ? 'found' : 'missing',
      preview: data.service_area_description.slice(0, 60) || (data.maps_embed_url ? 'Map embed found' : '—'),
    });

    // ── 9. Before / After images ──────────────────────────────────────────────
    const baRaw = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
      const before = imgs.find(i => /before/i.test(i.alt + i.className));
      const after  = imgs.find(i => /after/i.test(i.alt + i.className));
      return { before: before?.src || '', after: after?.src || '' };
    });
    data.before_image_url = absUrl(baRaw.before, url);
    data.after_image_url  = absUrl(baRaw.after,  url);
    sections.push({
      id: 'before_after', label: 'Before / After',
      status: data.before_image_url || data.after_image_url ? 'found' : 'missing',
      preview: data.before_image_url || data.after_image_url ? 'Images detected' : '—',
    });

    // ── 10. Vertical detection ────────────────────────────────────────────────
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    data.template_type = detectVertical(bodyText);
    sections.push({
      id: 'vertical', label: 'Vertical / Template',
      status: 'found',
      preview: data.template_type,
    });

    return { sections, data };
  } finally {
    await context.close();
  }
}
