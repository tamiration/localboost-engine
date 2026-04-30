/**
 * CloneUrlDialog — pixel-perfect section-by-section URL cloner.
 *
 * Calls POST /api/clone-page (Express + Playwright server) which:
 *  1. Fully renders the target URL in a real Chromium browser
 *  2. Scrolls through the page to trigger lazy-load
 *  3. Screenshots each section individually
 *  4. Extracts computed styles (real colors, not guesses)
 *  5. Returns structured data + base64 screenshots per section
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Link2, CheckCircle, AlertCircle,
  Image, Type, MessageSquare, Star, Layers, Palette, MapPin,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── public types ─────────────────────────────────────────────────────────────

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

interface SectionData {
  id: string;
  label: string;
  status: 'found' | 'missing';
  preview: string;
  screenshotBase64?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloned: (data: Partial<ClonedPage>) => void;
}

// ─── section icon map ─────────────────────────────────────────────────────────
const SECTION_ICONS: Record<string, React.ReactNode> = {
  hero:         <Image className="h-3.5 w-3.5" />,
  colors:       <Palette className="h-3.5 w-3.5" />,
  logo:         <Image className="h-3.5 w-3.5" />,
  features:     <Layers className="h-3.5 w-3.5" />,
  testimonials: <Star className="h-3.5 w-3.5" />,
  about:        <Type className="h-3.5 w-3.5" />,
  service_area: <MapPin className="h-3.5 w-3.5" />,
  before_after: <Image className="h-3.5 w-3.5" />,
  vertical:     <MessageSquare className="h-3.5 w-3.5" />,
};

// ─── component ────────────────────────────────────────────────────────────────
export function CloneUrlDialog({ open, onOpenChange, onCloned }: Props) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [clonedData, setClonedData] = useState<Partial<ClonedPage> | null>(null);
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleClone = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setSections([]);
    setClonedData(null);
    setActiveScreenshot(null);
    setServerError(null);

    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 90000);
      const res = await fetch('/api/clone-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });
      clearTimeout(fetchTimeout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Clone server error' }));
        throw new Error(err.error || `Server returned ${res.status}`);
      }

      const result = await res.json() as { sections: SectionData[]; data: ClonedPage };
      setSections(result.sections);
      setClonedData(result.data);

      const found = result.sections.filter(s => s.status === 'found').length;
      toast({
        title: 'Page cloned pixel-perfect',
        description: `${found} of ${result.sections.length} sections extracted from the live page.`,
      });
    } catch (err: any) {
      // If the local clone server isn't running, fall back gracefully
      if (err.message?.includes('Failed to fetch') || err.message?.includes('ECONNREFUSED')) {
        setServerError(
          'The clone server is not running. Start it with: pnpm run server:clone'
        );
      } else {
        toast({
          title: 'Clone failed',
          description: err.message || 'Could not scrape that URL.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!clonedData) return;
    onCloned(clonedData);
    toast({ title: 'Applied to form', description: 'All cloned fields have been pre-filled. Review before saving.' });
    handleReset();
  };

  const handleReset = () => {
    setUrl('');
    setSections([]);
    setClonedData(null);
    setActiveScreenshot(null);
    setServerError(null);
    onOpenChange(false);
  };

  const foundCount = sections.filter(s => s.status === 'found').length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleReset(); else onOpenChange(true); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Link2 className="h-5 w-5 text-primary" />
            Clone Page — Pixel Perfect, Section by Section
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* URL input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Competitor or reference URL
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="https://competitor.com/garage-door-dallas"
                value={url}
                onChange={e => { setUrl(e.target.value); setSections([]); setClonedData(null); setServerError(null); }}
                onKeyDown={e => e.key === 'Enter' && !loading && handleClone()}
                disabled={loading}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleClone}
                disabled={loading || !url.trim()}
                className="shrink-0"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cloning...</>
                  : 'Clone'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Opens the URL in a real Chromium browser, scrolls through the page, screenshots each section,
              and extracts computed styles — headline, colors, features, testimonials, images, and more.
            </p>
          </div>

          {/* Server not running warning */}
          {serverError && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 space-y-1">
              <p className="text-sm font-medium text-yellow-400">Clone server not running</p>
              <p className="text-xs text-muted-foreground">{serverError}</p>
              <code className="text-xs bg-secondary px-2 py-1 rounded block mt-2">pnpm run server:clone</code>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">Rendering page in Chromium...</p>
                <p className="text-xs text-muted-foreground">Scrolling, lazy-loading images, extracting sections</p>
              </div>
            </div>
          )}

          {/* Section results */}
          {sections.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Extraction results</p>
                <Badge variant="outline" className="text-xs">
                  {foundCount}/{sections.length} sections found
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {sections.map(section => (
                  <div
                    key={section.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      section.screenshotBase64
                        ? 'cursor-pointer hover:border-primary/50'
                        : ''
                    } ${
                      activeScreenshot === section.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => {
                      if (section.screenshotBase64) {
                        setActiveScreenshot(prev => prev === section.id ? null : section.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground shrink-0">
                          {SECTION_ICONS[section.id] ?? <Layers className="h-3.5 w-3.5" />}
                        </span>
                        <span className="text-sm font-medium text-foreground shrink-0">{section.label}</span>
                        {section.preview && (
                          <span className="text-xs text-muted-foreground truncate">{section.preview}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {section.screenshotBase64 && (
                          <span className="text-xs text-muted-foreground">
                            {activeScreenshot === section.id ? 'hide' : 'preview'}
                          </span>
                        )}
                        {section.status === 'found'
                          ? <CheckCircle className="h-4 w-4 text-green-500" />
                          : <AlertCircle className="h-4 w-4 text-yellow-500" />}
                      </div>
                    </div>

                    {/* Inline screenshot preview */}
                    {activeScreenshot === section.id && section.screenshotBase64 && (
                      <div className="mt-3 rounded overflow-hidden border border-border">
                        <img
                          src={`data:image/png;base64,${section.screenshotBase64}`}
                          alt={`${section.label} screenshot`}
                          className="w-full h-auto max-h-64 object-cover object-top"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Click any section with a &quot;preview&quot; label to see its screenshot from the source page.
                Yellow sections were not found — fill them in manually.
              </p>
            </div>
          )}

          {/* Color swatches preview */}
          {clonedData && (clonedData.primary_color || clonedData.secondary_color) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Extracted Colors</p>
                <div className="flex gap-3">
                  {[
                    { label: 'Primary', value: clonedData.primary_color },
                    { label: 'Secondary', value: clonedData.secondary_color },
                    { label: 'Accent', value: clonedData.accent_color },
                  ].filter(c => c.value).map(c => (
                    <div key={c.label} className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded-md border border-border shrink-0"
                        style={{ backgroundColor: c.value }}
                      />
                      <div>
                        <p className="text-xs font-medium text-foreground">{c.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{c.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" type="button" onClick={handleReset}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!clonedData}
          >
            Apply to Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
