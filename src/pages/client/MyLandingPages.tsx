import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Search, Globe, Eye, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface LandingPage {
  id: string;
  page_name: string;
  subdomain: string | null;
  template_type: string | null;
  deployed: boolean | null;
  verified_at: string | null;
  page_views: number | null;
  created_at: string;
}

const VERTICAL_LABELS: Record<string, string> = {
  garage_door: 'Garage Door',
  chimney: 'Chimney',
  locksmith: 'Locksmith',
  dryer_vent: 'Dryer Vent',
  hvac: 'HVAC',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  roofing: 'Roofing',
  pest_control: 'Pest Control',
};

function PageCard({ page, onCopy }: { page: LandingPage; onCopy: (url: string) => void }) {
  const isLive = page.deployed && page.verified_at;
  const isDnsPending = page.deployed && !page.verified_at;
  const pageUrl = page.subdomain
    ? `https://localboost-engine.vercel.app/p/${page.subdomain}`
    : null;

  return (
    <Card className="flex flex-col hover:border-border/80 transition-colors">
      {/* Status bar */}
      <div
        className={`h-1 w-full rounded-t-xl ${
          isLive ? 'bg-green-500' : isDnsPending ? 'bg-yellow-500' : 'bg-muted-foreground/30'
        }`}
      />
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{page.page_name}</p>
            {page.template_type && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {VERTICAL_LABELS[page.template_type] ?? page.template_type}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs ${
              isLive
                ? 'border-green-500/30 text-green-400 bg-green-500/10'
                : isDnsPending
                ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                : 'text-muted-foreground'
            }`}
          >
            {isLive ? (
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Live</span>
            ) : isDnsPending ? (
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> DNS Pending</span>
            ) : (
              'Draft'
            )}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            <span className="text-xs">{(page.page_views ?? 0).toLocaleString()} views</span>
          </div>
          <span className="text-muted-foreground/30 text-xs">·</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(page.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* URL */}
        {pageUrl && (
          <div className="flex items-center gap-1.5 bg-secondary/60 rounded-md px-2.5 py-1.5 min-w-0">
            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-mono truncate flex-1">{pageUrl}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          {pageUrl && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1.5 h-8"
                onClick={() => window.open(pageUrl, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onCopy(pageUrl)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyLandingPages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchPages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('landing_pages')
        .select('id, page_name, subdomain, template_type, deployed, verified_at, page_views, created_at')
        .order('created_at', { ascending: false });
      if (!error && data) setPages(data as LandingPage[]);
      setLoading(false);
    };
    fetchPages();
  }, [user]);

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied to clipboard' });
  };

  const filtered = pages.filter(p =>
    p.page_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.subdomain ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const liveCount = pages.filter(p => p.deployed && p.verified_at).length;
  const pendingCount = pages.filter(p => p.deployed && !p.verified_at).length;
  const totalViews = pages.reduce((s, p) => s + (p.page_views ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Pages</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pages.length} page{pages.length !== 1 ? 's' : ''} &middot; {liveCount} live &middot; {totalViews.toLocaleString()} total views
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* DNS warning */}
      {!loading && pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          <Clock className="h-4 w-4 text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300">
            {pendingCount} page{pendingCount > 1 ? 's are' : ' is'} waiting for DNS verification.
          </p>
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No pages match your search.' : 'No landing pages yet. Your admin will set these up.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(page => (
            <PageCard key={page.id} page={page} onCopy={copyToClipboard} />
          ))}
        </div>
      )}
    </div>
  );
}
