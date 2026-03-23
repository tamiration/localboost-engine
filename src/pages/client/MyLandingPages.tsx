import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Search, Globe, Eye } from 'lucide-react';
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
  primary_color: string | null;
  country: string;
  headline_template: string | null;
}

const verticalColors: Record<string, string> = {
  garage_door: 'bg-blue-500/20 text-blue-400',
  chimney: 'bg-red-500/20 text-red-400',
  locksmith: 'bg-yellow-500/20 text-yellow-400',
  dryer_vent: 'bg-teal-500/20 text-teal-400',
};

const verticalLabels: Record<string, string> = {
  garage_door: '🚪 Garage Door',
  chimney: '🏠 Chimney',
  locksmith: '🔐 Locksmith',
  dryer_vent: '🌀 Dryer Vent',
};

function getStatusBadge(page: LandingPage) {
  if (page.deployed && page.verified_at) {
    return <Badge className="bg-green-500/20 text-green-400">🟢 Live</Badge>;
  }
  if (page.deployed && !page.verified_at) {
    return <Badge className="bg-yellow-500/20 text-yellow-400">🟡 DNS Pending</Badge>;
  }
  return <Badge variant="secondary">📝 Draft</Badge>;
}

export default function MyLandingPages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPages();
  }, [user]);

  const fetchPages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('landing_pages')
      .select('id, page_name, subdomain, template_type, deployed, verified_at, page_views, created_at, primary_color, country, headline_template')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPages(data);
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'URL copied to clipboard.' });
  };

  const filtered = pages.filter(p =>
    p.page_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.subdomain ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalViews = pages.reduce((sum, p) => sum + (p.page_views ?? 0), 0);
  const liveCount = pages.filter(p => p.deployed && p.verified_at).length;
  const draftCount = pages.filter(p => !p.deployed).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">My Landing Pages</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{pages.length}</p>
            <p className="text-xs text-muted-foreground">Total Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{liveCount}</p>
            <p className="text-xs text-muted-foreground">Live</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{draftCount}</p>
            <p className="text-xs text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Views</p>
          </CardContent>
        </Card>
      </div>

      {/* Pages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Landing Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {search ? 'No pages match your search.' : 'No landing pages yet. Your admin will create pages for you.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page Name</TableHead>
                    <TableHead className="hidden md:table-cell">Vertical</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Views</TableHead>
                    <TableHead className="hidden lg:table-cell">URL</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(page => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.page_name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {page.template_type && (
                          <Badge variant="outline" className={`text-xs ${verticalColors[page.template_type] ?? ''}`}>
                            {verticalLabels[page.template_type] ?? page.template_type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(page)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{(page.page_views ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {page.subdomain ? (
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] block">
                            {page.subdomain}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(page.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {page.subdomain && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`https://${page.subdomain}`, '_blank')}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(`https://${page.subdomain}`)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
