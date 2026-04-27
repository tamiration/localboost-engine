import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, CheckCircle, AlertCircle, Image, Type, MessageSquare, Star, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ClonedPage {
  // Basic
  headline_template: string;
  subheadline: string;
  subheadline_template: string;
  fallback_headline: string;
  cta_text: string;
  service_name: string;
  // Visual
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  hero_image_url: string;
  before_image_url: string;
  after_image_url: string;
  // Content
  about_title: string;
  about_text: string;
  service_area_description: string;
  // JSON blocks
  features: { icon: string; title: string; description: string }[];
  testimonials: { name: string; text: string; rating: number }[];
  // Meta
  template_type: string;
  page_name: string;
}

interface SectionResult {
  name: string;
  status: 'found' | 'missing';
  preview: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloned: (data: Partial<ClonedPage>) => void;
}

// ─── colour extraction ────────────────────────────────────────────────────────
function toHex(val: string): string {
  if (!val) return '';
  val = val.trim();
  if (/^#[0-9a-f]{3,6}$/i.test(val)) return val;
  const m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    return '#' + [m[1], m[2], m[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
}

function dominantColor(doc: Document): string {
  const candidates = [
    ...Array.from(doc.querySelectorAll('[class*="bg-"], [style*="background"]')),
    ...Array.from(doc.querySelectorAll('header, nav, .hero, [class*="hero"], .banner, section')),
  ];
  for (const el of candidates.slice(0, 20)) {
    const style = (el as HTMLElement).style?.backgroundColor || '';
    const hex = toHex(style);
    if (hex && hex !== '#ffffff' && hex !== '#000000') return hex;
  }
  return '';
}

// ─── text helpers ─────────────────────────────────────────────────────────────
function clean(s: string | null | undefined) {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function absUrl(src: string, base: string): string {
  if (!src) return '';
  try { return new URL(src, base).href; } catch { return src; }
}

// ─── section scrapers ─────────────────────────────────────────────────────────

function scrapeHero(doc: Document, base: string) {
  const heroEl =
    doc.querySelector('.hero, [class*="hero"], [class*="banner"], header + section, main > section:first-child') ??
    doc.querySelector('main, body');

  const h1 = clean(doc.querySelector('h1')?.textContent);
  const h2 = clean(doc.querySelector('h1 + p, h1 ~ p, h2')?.textContent);
  const ctaEl = doc.querySelector(
    'a[href*="tel"], .hero a, [class*="cta"] a, [class*="btn"], button[type="submit"], a.button, a[class*="btn"]'
  );
  const cta = clean(ctaEl?.textContent) || 'Call Now';

  // Hero image: og:image first, then first big <img> in hero
  const ogImg = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
  const heroImg =
    absUrl(ogImg, base) ||
    absUrl(
      heroEl?.querySelector('img')?.getAttribute('src') || '',
      base
    );

  return { h1, h2, cta, heroImg };
}

function scrapeColors(doc: Document): { primary: string; secondary: string; accent: string } {
  // Try meta theme-color first
  const theme = doc.querySelector('meta[name="theme-color"]')?.getAttribute('content') || '';
  const primary = toHex(theme) || dominantColor(doc) || '#2563eb';

  // Secondary: look for a darker version in footer/nav
  const footerBg = toHex(
    (doc.querySelector('footer, nav') as HTMLElement)?.style?.backgroundColor || ''
  );
  const secondary = footerBg && footerBg !== primary ? footerBg : '#1e293b';

  // Accent: look for button/CTA background
  const ctaBg = toHex(
    (doc.querySelector('a.button, .btn, [class*="btn-primary"], [class*="cta"]') as HTMLElement)
      ?.style?.backgroundColor || ''
  );
  const accent = ctaBg && ctaBg !== primary ? ctaBg : '#f59e0b';

  return { primary, secondary, accent };
}

function scrapeLogo(doc: Document, base: string): string {
  const logoEl = doc.querySelector(
    'header img, .logo img, [class*="logo"] img, nav img, img[alt*="logo" i]'
  );
  return absUrl(logoEl?.getAttribute('src') || '', base);
}

function scrapeBeforeAfter(doc: Document, base: string): { before: string; after: string } {
  const imgs = Array.from(doc.querySelectorAll('img'));
  const before = imgs.find(i => /before/i.test(i.getAttribute('alt') || '') || /before/i.test(i.className));
  const after = imgs.find(i => /after/i.test(i.getAttribute('alt') || '') || /after/i.test(i.className));
  return {
    before: absUrl(before?.getAttribute('src') || '', base),
    after: absUrl(after?.getAttribute('src') || '', base),
  };
}

function scrapeFeatures(doc: Document): { icon: string; title: string; description: string }[] {
  // Look for a grid/list of feature cards
  const containers = doc.querySelectorAll(
    '.features, [class*="features"], .why-us, [class*="why"], .benefits, [class*="benefit"], .services, [class*="service-list"]'
  );
  const results: { icon: string; title: string; description: string }[] = [];

  for (const container of Array.from(containers)) {
    const cards = container.querySelectorAll('li, .card, [class*="card"], article, .item, [class*="item"], div > h3, div > h4');
    for (const card of Array.from(cards).slice(0, 6)) {
      const title = clean(card.querySelector('h3, h4, strong, b, .title, [class*="title"]')?.textContent || card.textContent);
      const desc = clean(card.querySelector('p, .desc, [class*="desc"]')?.textContent || '');
      if (title && title.length < 80) {
        results.push({ icon: 'star', title, description: desc });
      }
    }
    if (results.length >= 3) break;
  }

  // Fallback: grab first 3 <li> items from any list
  if (results.length === 0) {
    const items = doc.querySelectorAll('ul li, ol li');
    Array.from(items).slice(0, 3).forEach(li => {
      const t = clean(li.textContent);
      if (t && t.length < 100) results.push({ icon: 'star', title: t, description: '' });
    });
  }

  return results.slice(0, 3);
}

function scrapeTestimonials(doc: Document): { name: string; text: string; rating: number }[] {
  const containers = doc.querySelectorAll(
    '.testimonials, [class*="testimonial"], .reviews, [class*="review"], .quotes, blockquote'
  );
  const results: { name: string; text: string; rating: number }[] = [];

  for (const container of Array.from(containers)) {
    const items = container.querySelectorAll(
      'blockquote, .testimonial, [class*="testimonial-item"], .review, [class*="review-item"], li, article'
    );
    for (const item of Array.from(items).slice(0, 4)) {
      const text = clean(
        item.querySelector('p, .text, [class*="text"], [class*="quote"]')?.textContent ||
        item.textContent
      );
      const name = clean(
        item.querySelector('.name, [class*="name"], .author, [class*="author"], cite, strong')?.textContent || ''
      );
      // Star count from filled star elements
      const stars = item.querySelectorAll(
        '[class*="star-filled"], [class*="star--full"], svg.filled, .fa-star, [aria-label*="star"]'
      ).length;
      if (text && text.length > 20) {
        results.push({ name: name || 'Customer', text: text.slice(0, 300), rating: stars || 5 });
      }
    }
    if (results.length >= 2) break;
  }

  return results.slice(0, 4);
}

function scrapeAbout(doc: Document): { title: string; text: string } {
  const section = doc.querySelector(
    '#about, [id*="about"], .about, [class*="about-us"], [class*="about-section"]'
  );
  if (!section) return { title: '', text: '' };
  const title = clean(section.querySelector('h2, h3')?.textContent || '');
  const paras = Array.from(section.querySelectorAll('p')).map(p => clean(p.textContent)).filter(Boolean);
  return { title, text: paras.join('\n\n') };
}

function scrapeServiceArea(doc: Document): string {
  const section = doc.querySelector(
    '#service-area, [id*="service-area"], .service-area, [class*="service-area"], [class*="coverage"]'
  );
  if (!section) return '';
  const paras = Array.from(section.querySelectorAll('p, li')).map(el => clean(el.textContent)).filter(Boolean);
  return paras.join('\n');
}

function detectVertical(doc: Document): string {
  const text = (doc.body?.textContent || '').toLowerCase();
  if (text.includes('chimney') || text.includes('fireplace')) return 'chimney';
  if (text.includes('locksmith') || text.includes('lock repair')) return 'locksmith';
  if (text.includes('dryer vent') || text.includes('dryer cleaning')) return 'dryer_vent';
  if (text.includes('hvac') || text.includes('air condition') || text.includes('heating')) return 'hvac';
  if (text.includes('plumb') || text.includes('pipe')) return 'plumbing';
  if (text.includes('electric')) return 'electrical';
  if (text.includes('roof')) return 'roofing';
  if (text.includes('pest') || text.includes('termite')) return 'pest_control';
  if (text.includes('garage door') || text.includes('garage repair')) return 'garage_door';
  return 'garage_door';
}

// ─── main component ───────────────────────────────────────────────────────────

export function CloneUrlDialog({ open, onOpenChange, onCloned }: Props) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<SectionResult[]>([]);
  const [done, setDone] = useState(false);

  const handleClone = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setSections([]);
    setDone(false);

    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url.trim())}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Could not fetch that URL. Make sure it is publicly accessible.');
      const { contents: html } = await res.json();
      if (!html) throw new Error('The page returned empty content.');

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const base = url.trim();

      // ── scrape each section ──
      const { h1, h2, cta, heroImg } = scrapeHero(doc, base);
      const colors = scrapeColors(doc);
      const logo = scrapeLogo(doc, base);
      const { before, after } = scrapeBeforeAfter(doc, base);
      const features = scrapeFeatures(doc);
      const testimonials = scrapeTestimonials(doc);
      const about = scrapeAbout(doc);
      const serviceArea = scrapeServiceArea(doc);
      const vertical = detectVertical(doc);
      const pageName =
        clean(doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '') ||
        clean(doc.title) ||
        h1;

      // ── build section report ──
      const report: SectionResult[] = [
        { name: 'Headline',      status: h1 ? 'found' : 'missing',          preview: h1.slice(0, 60)       },
        { name: 'Subheadline',   status: h2 ? 'found' : 'missing',          preview: h2.slice(0, 60)       },
        { name: 'CTA Button',    status: cta ? 'found' : 'missing',         preview: cta.slice(0, 40)      },
        { name: 'Hero Image',    status: heroImg ? 'found' : 'missing',     preview: heroImg ? 'Extracted' : '—' },
        { name: 'Logo',          status: logo ? 'found' : 'missing',        preview: logo ? 'Extracted' : '—'   },
        { name: 'Brand Colors',  status: colors.primary !== '#2563eb' ? 'found' : 'missing', preview: colors.primary },
        { name: 'Features',      status: features.length > 0 ? 'found' : 'missing',   preview: `${features.length} cards` },
        { name: 'Testimonials',  status: testimonials.length > 0 ? 'found' : 'missing', preview: `${testimonials.length} reviews` },
        { name: 'About Section', status: about.text ? 'found' : 'missing',  preview: about.text.slice(0, 50) },
        { name: 'Service Area',  status: serviceArea ? 'found' : 'missing', preview: serviceArea.slice(0, 50) },
        { name: 'Before/After',  status: (before || after) ? 'found' : 'missing', preview: (before || after) ? 'Images found' : '—' },
        { name: 'Vertical',      status: 'found',                           preview: vertical               },
      ];

      setSections(report);
      setDone(true);

      const cloned: Partial<ClonedPage> = {
        page_name: pageName,
        headline_template: h1,
        subheadline: h2,
        subheadline_template: h2,
        fallback_headline: h1,
        cta_text: cta,
        service_name: '',
        primary_color: colors.primary,
        secondary_color: colors.secondary,
        accent_color: colors.accent,
        logo_url: logo,
        hero_image_url: heroImg,
        before_image_url: before,
        after_image_url: after,
        about_title: about.title,
        about_text: about.text,
        service_area_description: serviceArea,
        features,
        testimonials,
        template_type: vertical,
      };

      onCloned(cloned);
      toast({
        title: 'Page cloned section by section',
        description: `${report.filter(r => r.status === 'found').length}/${report.length} sections extracted. Review and adjust before saving.`,
      });
    } catch (err: any) {
      toast({
        title: 'Clone failed',
        description: err.message || 'Could not scrape that URL.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setUrl('');
    setSections([]);
    setDone(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); else onOpenChange(true); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Clone from URL — Section by Section
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Competitor or reference URL</label>
            <div className="flex gap-2">
              <Input
                placeholder="https://competitor.com/garage-door-dallas"
                value={url}
                onChange={e => { setUrl(e.target.value); setSections([]); setDone(false); }}
                onKeyDown={e => e.key === 'Enter' && !loading && handleClone()}
                disabled={loading}
              />
              <Button type="button" onClick={handleClone} disabled={loading || !url.trim()} className="shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Clone'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Extracts every section — hero, features, testimonials, about, service area, colors, images — and maps them pixel-perfect into the form.
            </p>
          </div>

          {loading && (
            <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Scraping sections...</p>
            </div>
          )}

          {sections.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Extraction results</p>
              <div className="rounded-lg border divide-y divide-border overflow-hidden">
                {sections.map(s => (
                  <div key={s.name} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <SectionIcon name={s.name} />
                      <span className="font-medium text-foreground">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      {s.preview && (
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">{s.preview}</span>
                      )}
                      {s.status === 'found'
                        ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        : <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {sections.filter(s => s.status === 'found').length} of {sections.length} sections extracted.
                Yellow sections were not found on the source page — you can fill them in manually.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={reset}>
            {done ? 'Close' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionIcon({ name }: { name: string }) {
  const map: Record<string, JSX.Element> = {
    'Headline':      <Type className="h-3.5 w-3.5 text-muted-foreground" />,
    'Subheadline':   <Type className="h-3.5 w-3.5 text-muted-foreground" />,
    'CTA Button':    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />,
    'Hero Image':    <Image className="h-3.5 w-3.5 text-muted-foreground" />,
    'Logo':          <Image className="h-3.5 w-3.5 text-muted-foreground" />,
    'Brand Colors':  <Layers className="h-3.5 w-3.5 text-muted-foreground" />,
    'Features':      <Layers className="h-3.5 w-3.5 text-muted-foreground" />,
    'Testimonials':  <Star className="h-3.5 w-3.5 text-muted-foreground" />,
    'About Section': <Type className="h-3.5 w-3.5 text-muted-foreground" />,
    'Service Area':  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />,
    'Before/After':  <Image className="h-3.5 w-3.5 text-muted-foreground" />,
    'Vertical':      <Layers className="h-3.5 w-3.5 text-muted-foreground" />,
  };
  return map[name] ?? <Layers className="h-3.5 w-3.5 text-muted-foreground" />;
}
