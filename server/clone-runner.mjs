/**
 * server/clone-runner.mjs
 * Runs as a child process: reads URL from stdin, writes CloneResult JSON to stdout.
 * Spawned by the Vite middleware per-request so Playwright is fully isolated
 * from Vite's module system and HMR.
 */
import { chromium } from 'playwright';

function clean(s) {
  return (s ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
}
function absUrl(src, base) {
  if (!src) return '';
  try { return new URL(src, base).href; } catch { return src; }
}
function toHex(val) {
  if (!val) return '';
  val = val.trim();
  if (/^#[0-9a-f]{3,6}$/i.test(val)) return val.toLowerCase();
  const m = val.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  return '';
}
function detectVertical(text) {
  const t = text.toLowerCase();
  if (t.includes('chimney') || t.includes('fireplace')) return 'chimney';
  if (t.includes('locksmith')) return 'locksmith';
  if (t.includes('dryer vent')) return 'dryer_vent';
  if (t.includes('hvac') || t.includes('air condition')) return 'hvac';
  if (t.includes('plumb')) return 'plumbing';
  if (t.includes('electric')) return 'electrical';
  if (t.includes('roof')) return 'roofing';
  if (t.includes('pest') || t.includes('termite')) return 'pest_control';
  return 'garage_door';
}

async function screenshotLocator(page, selectors, scrollToIt = false) {
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel).first();
      const box = await loc.boundingBox();
      if (!box || box.width < 100 || box.height < 50) continue;
      if (scrollToIt) {
        await page.evaluate(y => window.scrollTo(0, Math.max(0, y - 80)), box.y);
        await page.waitForTimeout(80);
      }
      const buf = await page.screenshot({
        clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: Math.min(box.height, 600) },
      });
      return buf.toString('base64');
    } catch { /* try next */ }
  }
  return '';
}

async function run(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'commit', timeout: 8000 });
    } catch {
      try { await page.goto(url, { waitUntil: 'commit', timeout: 5000 }); } catch { /* best effort */ }
    }
    // Brief wait for JS rendering — keep short
    await page.waitForTimeout(600);
    try {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
    } catch { /* ignore */ }

    const sections = [];
    const data = {
      page_name: '', headline_template: '', subheadline: '', subheadline_template: '',
      fallback_headline: '', cta_text: 'Call Now', primary_color: '#2563eb',
      secondary_color: '#1e293b', accent_color: '#f59e0b', logo_url: '',
      hero_image_url: '', before_image_url: '', after_image_url: '',
      about_title: '', about_text: '', service_area_description: '',
      maps_embed_url: '', features: [], testimonials: [],
      template_type: 'garage_door', service_name: '',
    };

    // 1. Meta
    const meta = await page.evaluate(() => ({
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
      ogDesc:  document.querySelector('meta[property="og:description"]')?.content || '',
      ogImg:   document.querySelector('meta[property="og:image"]')?.content || '',
      title:   document.title || '',
    }));
    data.page_name = clean(meta.ogTitle || meta.title);

    // 2. Hero
    const heroData = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.innerText?.trim() || '';
      const sub = document.querySelector('h1 + p, h1 ~ p, h2')?.innerText?.trim() || '';
      const ctaEl = document.querySelector('a[href*="tel"], .hero a, [class*="cta"] a, [class*="btn-primary"]');
      const heroImg = document.querySelector('.hero img, [class*="hero"] img, [class*="banner"] img')?.src || '';
      return { h1, sub, cta: ctaEl?.innerText?.trim() || '', heroImg };
    });
    data.headline_template = clean(heroData.h1);
    data.fallback_headline = data.headline_template;
    data.subheadline = clean(heroData.sub);
    data.subheadline_template = data.subheadline;
    data.cta_text = clean(heroData.cta) || 'Call Now';
    data.hero_image_url = absUrl(clean(meta.ogImg) || heroData.heroImg, url);

    const heroShot = await screenshotLocator(page, ['.hero', '[class*="hero"]', '[class*="banner"]', 'main > section:first-child', 'header']);
    sections.push({ id: 'hero', label: 'Hero Section', status: heroData.h1 ? 'found' : 'missing', preview: data.headline_template || '—', screenshotBase64: heroShot });

    // 3. Brand colors
    const colorData = await page.evaluate(() => {
      const theme = document.querySelector('meta[name="theme-color"]')?.content || '';
      const headerEl = document.querySelector('header, nav, [class*="navbar"]');
      const footerEl = document.querySelector('footer, [class*="footer"]');
      const ctaEl = document.querySelector('[class*="btn-primary"], [class*="btn--primary"], [class*="cta"]');
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
    sections.push({ id: 'colors', label: 'Brand Colors', status: px ? 'found' : 'missing', preview: `${data.primary_color} / ${data.secondary_color} / ${data.accent_color}` });

    // 4. Logo
    const logoSrc = await page.evaluate(() =>
      document.querySelector('header img, .logo img, [class*="logo"] img, nav img, img[alt*="logo" i]')?.src || ''
    );
    data.logo_url = absUrl(logoSrc, url);
    sections.push({ id: 'logo', label: 'Logo', status: data.logo_url ? 'found' : 'missing', preview: data.logo_url ? 'Image found' : '—' });

    // 5. Features
    const featuresRaw = await page.evaluate(() => {
      const candidates = ['.features', '[class*="features"]', '.why-us', '[class*="why"]', '.benefits', '[class*="benefit"]'];
      for (const sel of candidates) {
        const container = document.querySelector(sel);
        if (!container) continue;
        const cards = container.querySelectorAll('li, .card, [class*="card"], article, [class*="item"]');
        const results = [];
        for (const card of [...cards].slice(0, 6)) {
          const t = card.querySelector('h3, h4, strong, .title, [class*="title"]')?.innerText?.trim() || '';
          const d = card.querySelector('p, .desc, [class*="desc"]')?.innerText?.trim() || '';
          if (t && t.length < 100) results.push({ title: t, description: d });
        }
        if (results.length >= 3) return results.slice(0, 6);
      }
      return [];
    });
    data.features = featuresRaw.map(f => ({ icon: 'star', title: f.title, description: f.description }));
    const featShot = await screenshotLocator(page, ['.features', '[class*="features"]', '.why-us', '[class*="benefit"]'], true);
    sections.push({ id: 'features', label: 'Features / Benefits', status: data.features.length > 0 ? 'found' : 'missing', preview: data.features.length > 0 ? `${data.features.length} items – ${data.features[0]?.title}` : '—', screenshotBase64: featShot });

    // 6. Testimonials
    const testimonialsRaw = await page.evaluate(() => {
      const candidates = ['.testimonials', '[class*="testimonial"]', '.reviews', '[class*="review"]', 'blockquote'];
      for (const sel of candidates) {
        const container = document.querySelector(sel);
        if (!container) continue;
        const items = container.querySelectorAll('blockquote, [class*="testimonial-item"], [class*="review-item"], li, article');
        const results = [];
        for (const item of [...items].slice(0, 5)) {
          const textEl = item.querySelector('p, [class*="text"], [class*="body"]') ?? item;
          const nameEl = item.querySelector('.name, [class*="name"], .author, [class*="author"], cite, footer');
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
    const testShot = await screenshotLocator(page, ['.testimonials', '[class*="testimonial"]', '.reviews', '[class*="review"]'], true);
    sections.push({ id: 'testimonials', label: 'Testimonials', status: data.testimonials.length > 0 ? 'found' : 'missing', preview: data.testimonials.length > 0 ? `${data.testimonials.length} reviews` : '—', screenshotBase64: testShot });

    // 7. About
    const aboutRaw = await page.evaluate(() => {
      const section = document.querySelector('#about, [id*="about"], .about, [class*="about-section"]');
      if (!section) return { title: '', text: '' };
      const title = section.querySelector('h2, h3')?.innerText?.trim() || '';
      const paras = [...section.querySelectorAll('p')].map(p => p.innerText?.trim()).filter(Boolean).slice(0, 3);
      return { title, text: paras.join('\n\n') };
    });
    data.about_title = clean(aboutRaw.title);
    data.about_text = clean(aboutRaw.text);
    const aboutShot = await screenshotLocator(page, ['#about', '.about', '[class*="about-section"]', '[class*="about-us"]'], true);
    sections.push({ id: 'about', label: 'About Section', status: data.about_text ? 'found' : 'missing', preview: (data.about_title || data.about_text).slice(0, 60) || '—', screenshotBase64: aboutShot });

    // 8. Service area + map
    const serviceAreaRaw = await page.evaluate(() => {
      const section = document.querySelector('#service-area, [id*="service-area"], .service-area, [class*="coverage"], [class*="areas"]');
      const iframe = document.querySelector('iframe[src*="google.com/maps"], iframe[src*="maps.google"]');
      const text = section ? [...section.querySelectorAll('p, li')].map(el => el.innerText?.trim()).filter(Boolean).join('\n') : '';
      return { text, mapsUrl: iframe?.src || '' };
    });
    data.service_area_description = clean(serviceAreaRaw.text);
    data.maps_embed_url = serviceAreaRaw.mapsUrl;
    sections.push({ id: 'service_area', label: 'Service Area', status: data.service_area_description || data.maps_embed_url ? 'found' : 'missing', preview: data.service_area_description.slice(0, 60) || (data.maps_embed_url ? 'Map embed found' : '—') });

    // 9. Before/After
    const baRaw = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      const before = imgs.find(i => /before/i.test(i.alt + i.className));
      const after = imgs.find(i => /after/i.test(i.alt + i.className));
      return { before: before?.src || '', after: after?.src || '' };
    });
    data.before_image_url = absUrl(baRaw.before, url);
    data.after_image_url = absUrl(baRaw.after, url);
    sections.push({ id: 'before_after', label: 'Before / After', status: data.before_image_url || data.after_image_url ? 'found' : 'missing', preview: data.before_image_url || data.after_image_url ? 'Images detected' : '—' });

    // 10. Vertical detection
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    data.template_type = detectVertical(bodyText);
    sections.push({ id: 'vertical', label: 'Vertical / Template', status: 'found', preview: data.template_type });

    return { sections, data };
  } finally {
    await browser.close();
  }
}

// Read URL from argv (passed by parent process)
const url = process.argv[2];
if (!url) {
  process.stdout.write(JSON.stringify({ error: 'url is required' }));
  process.exit(1);
}

run(url)
  .then(result => {
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  })
  .catch(err => {
    process.stdout.write(JSON.stringify({ error: err.message || 'Clone failed' }));
    process.exit(1);
  });
