/**
 * CloneUrlDialog
 *
 * Pixel-perfect, section-by-section URL cloner.
 * POST /api/clone-page  →  Vite middleware  →  server/clone-engine.ts (Playwright)
 *
 * Flow:
 *  1. User pastes a URL and clicks "Clone"
 *  2. Chromium renders the real page, scrolls it, screenshots each section
 *  3. Dialog shows a section list on the left; clicking any section shows its
 *     live screenshot on the right alongside the extracted data fields
 *  4. "Apply to Form" merges everything into LandingPageForm
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Link2, CheckCircle2, XCircle, ArrowRight,
  Image, Palette, Layers, Star, AlignLeft, MapPin,
} from 'lucide-react';

// ─── types (mirror server/clone-engine.ts) ────────────────────────────────────
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
  service_name: string;
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
}

interface CloneApiResult {
  sections: SectionResult[];
  data: ClonedPage;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCloned: (data: ClonedPage) => void;
}

// ─── section icon map ─────────────────────────────────────────────────────────
const ICONS: Record<string, React.FC<{ className?: string }>> = {
  hero:         Image,
  colors:       Palette,
  logo:         Image,
  features:     Layers,
  testimonials: Star,
  about:        AlignLeft,
  service_area: MapPin,
  before_after: Image,
  vertical:     Layers,
};

// ─── component ────────────────────────────────────────────────────────────────
export function CloneUrlDialog({ open, onOpenChange, onCloned }: Props) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<'input' | 'loading' | 'review'>('input');
  const [result, setResult] = useState<CloneApiResult | null>(null);
  const [activeId, setActiveId] = useState<string>('');
  const [error, setError] = useState('');

  const reset = () => {
    setUrl('');
    setPhase('input');
    setResult(null);
    setActiveId('');
    setError('');
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleClone = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setPhase('loading');
    setError('');

    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 120_000);

      const res = await fetch(`/api/clone-page?url=${encodeURIComponent(trimmed)}`, {
        method: 'GET',
        signal: ac.signal,
      });
      clearTimeout(timer);

      const json: CloneApiResult = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);

      setResult(json);
      setActiveId(json.sections[0]?.id ?? '');
      setPhase('review');
    } catch (e: any) {
      const msg = e.name === 'AbortError'
        ? 'Request timed out after 120s. The page may be too slow or blocking bots.'
        : e.message?.includes('Failed to fetch') || e.message?.includes('ECONNREFUSED')
          ? 'Clone server not responding. Make sure the Vite dev server is running.'
          : (e.message ?? 'Clone failed');
      setError(msg);
      setPhase('input');
    }
  };

  const handleApply = () => {
    if (!result?.data) return;
    onCloned(result.data);
    toast({
      title: 'Applied to form',
      description: `${result.sections.filter(s => s.status === 'found').length} sections pre-filled. Review before saving.`,
    });
    reset();
    onOpenChange(false);
  };

  const active = result?.sections.find(s => s.id === activeId);
  const foundCount = result?.sections.filter(s => s.status === 'found').length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-full p-0 gap-0 flex flex-col" style={{ height: '88vh' }}>

        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Clone from URL — Section by Section
            {phase === 'review' && result && (
              <Badge variant="secondary" className="ml-2">
                {foundCount} / {result.sections.length} sections detected
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-col flex-1 min-h-0">

          {/* ── Input phase ─────────────────────────────────────────────────── */}
          {phase === 'input' && (
            <div className="flex flex-col gap-5 p-6 flex-1">
              <div className="space-y-2">
                <Label htmlFor="clone-url">Competitor or reference URL</Label>
                <Input
                  id="clone-url"
                  placeholder="https://competitor.com/garage-door-repair-dallas"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleClone()}
                  autoFocus
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A real Chromium browser opens the URL, scrolls through the entire page to trigger
                  lazy-loading, takes a screenshot of each section, extracts computed CSS colors,
                  text content, images, testimonials, and features — then lets you review every
                  section before applying to the form.
                </p>
              </div>

              {/* Section chips preview */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sections that will be extracted
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Hero', 'Brand Colors', 'Logo', 'Features', 'Testimonials', 'About', 'Service Area', 'Before / After', 'Vertical'].map(s => (
                    <span key={s} className="text-xs rounded-full border border-border px-3 py-1 text-muted-foreground bg-muted/40">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Loading phase ────────────────────────────────────────────────── */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center max-w-sm space-y-1.5">
                <p className="font-semibold text-foreground">Rendering page in Chromium...</p>
                <p className="text-sm text-muted-foreground">
                  Opening{' '}
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{url}</span>
                  , scrolling through all sections, and taking pixel-level screenshots.
                </p>
                <p className="text-xs text-muted-foreground">Usually takes 15–60 seconds depending on page complexity.</p>
              </div>
            </div>
          )}

          {/* ── Review phase: two-panel side-by-side ─────────────────────────── */}
          {phase === 'review' && result && (
            <div className="flex flex-1 min-h-0">

              {/* Left panel: section list */}
              <div className="w-56 shrink-0 border-r border-border flex flex-col">
                <p className="px-4 pt-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
                  Sections
                </p>
                <ScrollArea className="flex-1">
                  <div className="px-2 pb-3 space-y-0.5">
                    {result.sections.map(sec => {
                      const Icon = ICONS[sec.id] ?? Layers;
                      const isActive = activeId === sec.id;
                      return (
                        <button
                          key={sec.id}
                          onClick={() => setActiveId(sec.id)}
                          className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-foreground hover:bg-muted/60'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          <span className="truncate flex-1">{sec.label}</span>
                          {sec.status === 'found'
                            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                            : <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Right panel: screenshot + data */}
              <div className="flex-1 min-w-0 flex flex-col min-h-0">
                {active && (
                  <ScrollArea className="flex-1">
                    <div className="p-5 space-y-4">

                      {/* Section header */}
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{active.label}</h3>
                        <Badge
                          variant="outline"
                          className={active.status === 'found'
                            ? 'border-green-500/30 text-green-600 bg-green-500/5'
                            : 'text-muted-foreground'}
                        >
                          {active.status === 'found' ? 'Detected' : 'Not found'}
                        </Badge>
                      </div>

                      {/* Screenshot from real browser */}
                      {active.screenshotBase64 ? (
                        <div className="rounded-lg border border-border overflow-hidden">
                          <div className="px-3 py-1.5 bg-muted/50 border-b border-border flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                              <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                            </div>
                            <span className="text-xs text-muted-foreground">Screenshot from source page</span>
                          </div>
                          <img
                            src={`data:image/png;base64,${active.screenshotBase64}`}
                            alt={`${active.label} screenshot`}
                            className="w-full h-auto"
                          />
                        </div>
                      ) : active.status === 'missing' && (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center">
                          <p className="text-sm text-muted-foreground">
                            This section was not detected on the source page.
                          </p>
                        </div>
                      )}

                      {/* Extracted data for this section */}
                      {active.status === 'found' && (
                        <>
                          <Separator />
                          <SectionDataPanel sectionId={active.id} data={result.data} />
                        </>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
          {phase === 'input' && (
            <Button onClick={handleClone} disabled={!url.trim()}>
              <Link2 className="h-4 w-4 mr-2" />
              Clone Page
            </Button>
          )}
          {phase === 'review' && (
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => { setPhase('input'); setResult(null); }}>
                Try another URL
              </Button>
              <Button onClick={handleApply}>
                Apply to Form
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── per-section data panel ───────────────────────────────────────────────────
function SectionDataPanel({ sectionId, data }: { sectionId: string; data: ClonedPage }) {
  const Field = ({ label, value }: { label: string; value: string | undefined }) =>
    value ? (
      <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-0.5 text-sm">
        <span className="text-muted-foreground shrink-0 pt-0.5">{label}</span>
        <span className="text-foreground break-words">{value}</span>
      </div>
    ) : null;

  switch (sectionId) {
    case 'hero':
      return (
        <div className="space-y-3">
          <Field label="Headline" value={data.headline_template} />
          <Field label="Subheadline" value={data.subheadline} />
          <Field label="CTA text" value={data.cta_text} />
          {data.hero_image_url && (
            <div className="grid grid-cols-[140px_1fr] gap-x-3 text-sm">
              <span className="text-muted-foreground">Hero image</span>
              <img src={data.hero_image_url} alt="hero" className="h-24 w-full object-cover rounded border border-border" />
            </div>
          )}
        </div>
      );

    case 'colors':
      return (
        <div className="flex flex-wrap gap-5">
          {[
            { label: 'Primary', color: data.primary_color },
            { label: 'Secondary', color: data.secondary_color },
            { label: 'Accent', color: data.accent_color },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg border border-border shrink-0 shadow-sm"
                style={{ backgroundColor: color }}
              />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-mono font-medium text-foreground">{color}</p>
              </div>
            </div>
          ))}
        </div>
      );

    case 'logo':
      return data.logo_url ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Detected logo</p>
          <img src={data.logo_url} alt="logo" className="max-h-16 max-w-48 object-contain border border-border rounded p-2 bg-white" />
        </div>
      ) : null;

    case 'features':
      return (
        <div className="space-y-2">
          {data.features.map((f, i) => (
            <div key={i} className="rounded-md border border-border bg-muted/20 px-4 py-3 space-y-0.5">
              <p className="text-sm font-medium text-foreground">{f.title}</p>
              {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
            </div>
          ))}
        </div>
      );

    case 'testimonials':
      return (
        <div className="space-y-2">
          {data.testimonials.map((t, i) => (
            <div key={i} className="rounded-md border border-border bg-muted/20 px-4 py-3 space-y-1">
              <p className="text-sm text-foreground italic">&ldquo;{t.text}&rdquo;</p>
              <p className="text-xs text-muted-foreground">
                — {t.name} &nbsp;{'★'.repeat(Math.min(t.rating, 5))}
              </p>
            </div>
          ))}
        </div>
      );

    case 'about':
      return (
        <div className="space-y-2">
          {data.about_title && <p className="text-sm font-medium text-foreground">{data.about_title}</p>}
          <p className="text-sm text-muted-foreground whitespace-pre-line">{data.about_text}</p>
        </div>
      );

    case 'service_area':
      return (
        <div className="space-y-3">
          <Field label="Description" value={data.service_area_description} />
          <Field label="Maps embed URL" value={data.maps_embed_url} />
        </div>
      );

    case 'before_after':
      return (
        <div className="flex gap-4 flex-wrap">
          {data.before_image_url && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Before</p>
              <img src={data.before_image_url} alt="Before" className="h-36 w-auto object-cover rounded border border-border" />
            </div>
          )}
          {data.after_image_url && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">After</p>
              <img src={data.after_image_url} alt="After" className="h-36 w-auto object-cover rounded border border-border" />
            </div>
          )}
        </div>
      );

    case 'vertical':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Detected vertical:</p>
            <Badge variant="secondary" className="font-mono">{data.template_type}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            This determines which landing page template will be used as the base.
          </p>
        </div>
      );

    default:
      return null;
  }
}
