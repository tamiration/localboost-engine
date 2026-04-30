/**
 * server/clone-page.ts
 * Pixel-perfect section-by-section page cloner using Playwright.
 * Runs as a local Express server proxied by Vite.
 */
import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

export const app = express();
app.use(cors());
app.use(express.json());

// ─── types ────────────────────────────────────────────────────────────────────
export interface SectionData {
  id: string;
  label: string;
  status: 'found' | 'missing';
  preview: string;
  screenshotBase64?: string;
}

export interface CloneResult {
  sections: SectionData[];
  data: {
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
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function clean(s: string | null | undefined) {
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
  const m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  return '';
}

function detectVertical(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('chimney') || t.includes('fireplace')) return 'chimney';
  if (t.includes('locksmith')) return 'locksmith';
  if (t.includes('dryer vent') || t.includes('dryer cleaning')) return 'dryer_vent';
  if (t.includes('hvac') || t.includes('air condition') || t.includes('heating')) return 'hvac';
  if (t.includes('plumb') || t.includes('pipe repair')) return 'plumbing';
  if (t.includes('electric')) return 'electrical';
  if (t.includes('roof')) return 'roofing';
  if (t.includes('pest') || t.includes('termite')) return 'pest_control';
  return 'garage_door';
}

// ─── route ────────────────────────────────────────────────────────────────────
app.post('/api/clone-page', async (req, res) => {
  const { url } = req.body as { url: string };
  if (!url) return res.status(400).json({ error: 'url is required' });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // Navigate and wait for full render
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // Scroll to trigger lazy-load
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const base = url;
    const sections: SectionData[] = [];
    const data: CloneResult['data'] = {
      page_name: '',
      headline_template: '',
      subheadline: '',
      subheadline_template: '',
      fallback_headline: '',
      cta_text: 'Call Now',
      primary_color: '#2563eb',
      secondary_color: '#1e293b',
      accent_color: '#f59e0b',
      logo_url: '',
      hero_image_url: '',
      before_image_url: '',
      after_image_url: '',
      about_title: '',
      about_text: '',
      service_area_description: '',
      maps_embed_url: '',
      features: [],
      testimonials: [],
      template_type: 'garage_door',
      service_name: '',
    };

    // ── Section 1: Page meta ──────────────────────────────────────────────────
    const meta = await page.evaluate(() => ({
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
      ogDesc:  document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
      ogImg:   document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
      title:   document.title || '',
    }));
    data.page_name = clean(meta.ogTitle || meta.title);

    // ── Section 2: Hero ───────────────────────────────────────────────────────
    const heroData = await page.evaluate(() => {
      const heroEl =
        document.querySelector('.hero, [class*="hero"], [class*="banner"], header + section, main > section:first-child') as HTMLElement
        ?? document.querySelector('main') as HTMLElement;

      const h1 = document.querySelector('h1')?.innerText?.trim() || '';
      const h2 = (document.querySelector('h1 + p, h1 ~ p, h2') as HTMLElement)?.innerText?.trim() || '';

      // CTA: prefer tel links, then visible buttons
      const ctaEl = document.querySelector('a[href*="tel"], .hero a, [class*="cta"] a, [class*="btn"]:not([class*="close"]), button[type="submit"]') as HTMLElement;
      const cta = ctaEl?.innerText?.trim() || '';

      // Colors from hero element
      const heroStyle = heroEl ? window.getComputedStyle(heroEl) : null;
      const heroBg = heroStyle?.backgroundColor || '';

      // Hero image
      const heroImg = heroEl?.querySelector('img')?.getAttribute('src') || '';

      return { h1, h2, cta, heroBg, heroImg };
    });

    data.headline_template = clean(heroData.h1);
    data.fallback_headline = data.headline_template;
    data.subheadline = clean(heroData.h2);
    data.subheadline_template = data.subheadline;
    data.cta_text = clean(heroData.cta) || 'Call Now';
    data.hero_image_url = absUrl(
      clean(meta.ogImg) || heroData.heroImg,
      base
    );

    // Screenshot the hero section
    let heroScreenshot = '';
    try {
      const heroLocator = page.locator('.hero, [class*="hero"], [class*="banner"], main > section:first-child, header').first();
      const heroBox = await heroLocator.boundingBox();
      if (heroBox) {
        const buf = await page.screenshot({
          clip: { x: heroBox.x, y: heroBox.y, width: heroBox.width, height: Math.min(heroBox.height, 600) },
        });
        heroScreenshot = buf.toString('base64');
      }
    } catch { /* non-fatal */ }

    sections.push({
      id: 'hero',
      label: 'Hero Section',
      status: heroData.h1 ? 'found' : 'missing',
      preview: data.headline_template,
      screenshotBase64: heroScreenshot,
    });

    // ── Section 3: Brand colors ───────────────────────────────────────────────
    const colorData = await page.evaluate(() => {
      const theme = document.querySelector('meta[name="theme-color"]')?.getAttribute('content') || '';
      const headerEl = document.querySelector('header, nav, [class*="navbar"], [class*="header"]') as HTMLElement;
      const headerBg = headerEl ? window.getComputedStyle(headerEl).backgroundColor : '';
      const footerEl = document.querySelector('footer, [class*="footer"]') as HTMLElement;
      const footerBg = footerEl ? window.getComputedStyle(footerEl).backgroundColor : '';
      const ctaEl = document.querySelector('a.button, .btn, [class*="btn-primary"], [class*="cta"], [class*="cta-btn"]') as HTMLElement;
      const ctaBg = ctaEl ? window.getComputedStyle(ctaEl).backgroundColor : '';
      return { theme, headerBg, footerBg, ctaBg };
    });

    const primaryHex = toHex(colorData.theme) || toHex(colorData.headerBg) || '';
    const secondaryHex = toHex(colorData.footerBg) || '';
    const accentHex = toHex(colorData.ctaBg) || '';

    if (primaryHex && primaryHex !== '#ffffff' && primaryHex !== '#000000') data.primary_color = primaryHex;
    if (secondaryHex && secondaryHex !== '#ffffff' && secondaryHex !== data.primary_color) data.secondary_color = secondaryHex;
    if (accentHex && accentHex !== '#ffffff' && accentHex !== data.primary_color) data.accent_color = accentHex;

    sections.push({
      id: 'colors',
      label: 'Brand Colors',
      status: primaryHex ? 'found' : 'missing',
      preview: [data.primary_color, data.secondary_color, data.accent_color].join(' / '),
    });

    // ── Section 4: Logo ───────────────────────────────────────────────────────
    const logoSrc = await page.evaluate(() => {
      const el = document.querySelector('header img, .logo img, [class*="logo"] img, nav img, img[alt*="logo" i]') as HTMLImageElement;
      return el?.src || el?.getAttribute('src') || '';
    });
    data.logo_url = absUrl(logoSrc, base);
    sections.push({
      id: 'logo',
      label: 'Logo',
      status: data.logo_url ? 'found' : 'missing',
      preview: data.logo_url ? 'Image found' : '—',
    });

    // ── Section 5: Features ───────────────────────────────────────────────────
    const featuresData = await page.evaluate(() => {
      const containers = document.querySelectorAll(
        '.features, [class*="features"], .why-us, [class*="why"], .benefits, [class*="benefit"], .services, [class*="service-list"], .cards, [class*="icon-box"]'
      );
      const results: { title: string; description: string }[] = [];
      for (const container of Array.from(containers)) {
        const cards = container.querySelectorAll('li, .card, [class*="card"], article, [class*="item"], [class*="box"]');
        for (const card of Array.from(cards).slice(0, 6)) {
          const titleEl = card.querySelector('h3, h4, h5, strong, b, .title, [class*="title"]') as HTMLElement;
          const descEl = card.querySelector('p, .desc, [class*="desc"], .body, [class*="body"]') as HTMLElement;
          const title = titleEl?.innerText?.trim() || '';
          const description = descEl?.innerText?.trim() || '';
          if (title && title.length < 100) results.push({ title, description });
        }
        if (results.length >= 3) break;
      }
      return results.slice(0, 6);
    });
    data.features = featuresData.map(f => ({ icon: 'star', title: f.title, description: f.description }));

    // Screenshot features section
    let featuresScreenshot = '';
    try {
      const featLocator = page.locator('.features, [class*="features"], .why-us, [class*="benefit"], .cards').first();
      const featBox = await featLocator.boundingBox();
      if (featBox) {
        const buf = await page.screenshot({
          clip: { x: featBox.x, y: featBox.y, width: featBox.width, height: Math.min(featBox.height, 500) },
        });
        featuresScreenshot = buf.toString('base64');
      }
    } catch { /* non-fatal */ }

    sections.push({
      id: 'features',
      label: 'Features / Benefits',
      status: data.features.length > 0 ? 'found' : 'missing',
      preview: data.features.length > 0 ? `${data.features.length} cards: ${data.features[0]?.title}` : '—',
      screenshotBase64: featuresScreenshot,
    });

    // ── Section 6: Testimonials ───────────────────────────────────────────────
    const testimonialsData = await page.evaluate(() => {
      const containers = document.querySelectorAll(
        '.testimonials, [class*="testimonial"], .reviews, [class*="review"], blockquote, .quotes, [class*="quote"]'
      );
      const results: { name: string; text: string; rating: number }[] = [];
      for (const container of Array.from(containers)) {
        const items = container.querySelectorAll(
          'blockquote, .testimonial, [class*="testimonial-item"], .review, [class*="review-item"], li, article'
        );
        for (const item of Array.from(items).slice(0, 5)) {
          const textEl = item.querySelector('p, .text, [class*="text"], [class*="quote"]') as HTMLElement ?? item as HTMLElement;
          const nameEl = item.querySelector('.name, [class*="name"], .author, [class*="author"], cite, strong, footer') as HTMLElement;
          const text = textEl?.innerText?.trim() || '';
          const name = nameEl?.innerText?.trim() || '';
          const stars = item.querySelectorAll('[class*="star-fill"], [class*="star--on"], .fa-star, [aria-label*="star"]').length;
          if (text.length > 20) results.push({ name: name || 'Customer', text: text.slice(0, 300), rating: stars || 5 });
        }
        if (results.length >= 2) break;
      }
      return results.slice(0, 5);
    });
    data.testimonials = testimonialsData;

    // Screenshot testimonials section
    let testimonialsScreenshot = '';
    try {
      const testLocator = page.locator('.testimonials, [class*="testimonial"], .reviews, [class*="review"]').first();
      const testBox = await testLocator.boundingBox();
      if (testBox) {
        await page.evaluate(y => window.scrollTo(0, y), testBox.y - 100);
        await page.waitForTimeout(300);
        const buf = await page.screenshot({
          clip: { x: testBox.x, y: testBox.y, width: testBox.width, height: Math.min(testBox.height, 500) },
        });
        testimonialsScreenshot = buf.toString('base64');
      }
    } catch { /* non-fatal */ }

    sections.push({
      id: 'testimonials',
      label: 'Testimonials',
      status: data.testimonials.length > 0 ? 'found' : 'missing',
      preview: data.testimonials.length > 0 ? `${data.testimonials.length} reviews` : '—',
      screenshotBase64: testimonialsScreenshot,
    });

    // ── Section 7: About ──────────────────────────────────────────────────────
    const aboutData = await page.evaluate(() => {
      const section = document.querySelector(
        '#about, [id*="about"], .about, [class*="about-us"], [class*="about-section"], section:has(h2)'
      ) as HTMLElement;
      if (!section) return { title: '', text: '' };
      const titleEl = section.querySelector('h2, h3') as HTMLElement;
      const paras = Array.from(section.querySelectorAll('p')).map(p => (p as HTMLElement).innerText?.trim()).filter(Boolean);
      return { title: titleEl?.innerText?.trim() || '', text: paras.slice(0, 3).join('\n\n') };
    });
    data.about_title = clean(aboutData.title);
    data.about_text = clean(aboutData.text);

    let aboutScreenshot = '';
    try {
      const aboutLocator = page.locator('#about, .about, [class*="about-section"]').first();
      const aboutBox = await aboutLocator.boundingBox();
      if (aboutBox) {
        await page.evaluate(y => window.scrollTo(0, y), aboutBox.y - 100);
        await page.waitForTimeout(300);
        const buf = await page.screenshot({
          clip: { x: aboutBox.x, y: aboutBox.y, width: aboutBox.width, height: Math.min(aboutBox.height, 500) },
        });
        aboutScreenshot = buf.toString('base64');
      }
    } catch { /* non-fatal */ }

    sections.push({
      id: 'about',
      label: 'About Section',
      status: data.about_text ? 'found' : 'missing',
      preview: data.about_title || data.about_text.slice(0, 60),
      screenshotBase64: aboutScreenshot,
    });

    // ── Section 8: Service Area + Maps ────────────────────────────────────────
    const serviceAreaData = await page.evaluate(() => {
      const section = document.querySelector(
        '#service-area, [id*="service-area"], .service-area, [class*="service-area"], [class*="coverage"], [class*="area"]'
      ) as HTMLElement;
      const mapsIframe = document.querySelector('iframe[src*="google.com/maps"], iframe[src*="maps.google"]') as HTMLIFrameElement;
      const text = section
        ? Array.from(section.querySelectorAll('p, li')).map(el => (el as HTMLElement).innerText?.trim()).filter(Boolean).join('\n')
        : '';
      return { text, mapsUrl: mapsIframe?.src || '' };
    });
    data.service_area_description = clean(serviceAreaData.text);
    data.maps_embed_url = serviceAreaData.mapsUrl;

    sections.push({
      id: 'service_area',
      label: 'Service Area',
      status: data.service_area_description || data.maps_embed_url ? 'found' : 'missing',
      preview: data.service_area_description.slice(0, 60) || (data.maps_embed_url ? 'Map embed found' : '—'),
    });

    // ── Section 9: Before / After images ─────────────────────────────────────
    const beforeAfterData = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
      const before = imgs.find(i => /before/i.test(i.alt) || /before/i.test(i.className));
      const after  = imgs.find(i => /after/i.test(i.alt)  || /after/i.test(i.className));
      return { before: before?.src || '', after: after?.src || '' };
    });
    data.before_image_url = absUrl(beforeAfterData.before, base);
    data.after_image_url = absUrl(beforeAfterData.after, base);

    sections.push({
      id: 'before_after',
      label: 'Before / After',
      status: data.before_image_url || data.after_image_url ? 'found' : 'missing',
      preview: data.before_image_url || data.after_image_url ? 'Images found' : '—',
    });

    // ── Section 10: Vertical detection ───────────────────────────────────────
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    data.template_type = detectVertical(bodyText);
    sections.push({
      id: 'vertical',
      label: 'Vertical / Template',
      status: 'found',
      preview: data.template_type,
    });

    await browser.close();

    return res.json({ sections, data } as CloneResult);
  } catch (err: any) {
    if (browser) await browser.close().catch(() => {});
    console.error('[clone-page] error:', err.message);
    return res.status(500).json({ error: err.message || 'Clone failed' });
  }
});

// Start standalone server when run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const PORT = 3099;
  app.listen(PORT, () => console.log(`[clone-page] listening on :${PORT}`));
}
