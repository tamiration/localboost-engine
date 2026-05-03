import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { LandingPageForm, type LandingPageFormData } from '@/components/admin/LandingPageForm';
import { GeoConfigForm } from '@/components/admin/GeoConfigForm';
import { BarChartCard, PieChartCard } from '@/components/admin/AnalyticsChart';
import { verifyDNS, updateDNSStatus } from '@/lib/dnsVerify';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Search, ArrowLeft, Copy, Check, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type LandingPage = Tables<'landing_pages'>;

const VERTICAL_COLORS: Record<string, string> = {
  garage_door: 'bg-blue-500/20 text-blue-400',
  chimney: 'bg-red-500/20 text-red-400',
  locksmith: 'bg-yellow-500/20 text-yellow-400',
  dryer_vent: 'bg-teal-500/20 text-teal-400',
};
const VERTICAL_LABELS: Record<string, string> = {
  garage_door: '🚪 Garage Door', chimney: '🏠 Chimney',
  locksmith: '🔐 Locksmith', dryer_vent: '🌀 Dryer Vent',
};

function getStatus(page: LandingPage): { label: string; color: string } {
  const verifiedAt = (page as Record<string, unknown>).verified_at;
  if (page.deployed && verifiedAt) return { label: '🟢 Live', color: 'bg-green-500/20 text-green-400' };
  if (page.deployed) return { label: '🟡 DNS Pending', color: 'bg-yellow-500/20 text-yellow-400' };
  return { label: '📝 Draft', color: 'bg-muted text-muted-foreground' };
}

// ======= LIST VIEW =======
function PageList() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<(LandingPage & { clients: { business_name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const fetchPages = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('landing_pages').select('*, clients(business_name)', { count: 'exact' });
    if (search) query = query.or(`page_name.ilike.%${search}%,subdomain.ilike.%${search}%`);
    if (filter === 'deployed') query = query.eq('deployed', true);
    else if (filter === 'draft') query = query.eq('deployed', false);
    else if (filter === 'zero') query = query.eq('deployed', true).eq('page_views', 0);
    if (verticalFilter !== 'all') query = query.eq('template_type', verticalFilter);
    if (countryFilter !== 'all') query = query.eq('country', countryFilter);
    query = query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, count } = await query;
    setPages((data ?? []) as typeof pages);
    setTotal(count ?? 0);
    setLoading(false);
  }, [search, filter, verticalFilter, countryFilter, page]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleCreate = async (formData: LandingPageFormData) => {
    const { error } = await supabase.from('landing_pages').insert({
      page_name: formData.page_name,
      client_id: formData.client_id,
      template_type: formData.template_type,
      country: formData.country,
      subdomain: formData.subdomain || null,
      headline_template: formData.headline_template || null,
      subheadline_template: formData.subheadline_template || null,
      cta_text: formData.cta_text || null,
      primary_color: formData.primary_color || null,
      about_text: formData.about_text || null,
      service_area_description: formData.service_area_description || null,
      hero_image_url: formData.hero_image_url || null,
      before_image_url: formData.before_image_url || null,
      after_image_url: formData.after_image_url || null,
      logo_url: formData.logo_url || null,
      notification_email: formData.notification_email || null,
      ghl_webhook_url: formData.ghl_webhook_url || null,
      maps_embed_url: formData.maps_embed_url || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); throw error; }
    toast({ title: '✅ Landing page created' });
    setShowCreate(false);
    fetchPages();
  };

  const handleDeploy = async (id: string, deployed: boolean) => {
    const nowDeployed = !deployed;
    await supabase
      .from('landing_pages')
      .update({ deployed: nowDeployed, is_published: nowDeployed })
      .eq('id', id);
    toast({ title: nowDeployed ? 'Page deployed' : 'Page unpublished' });
    fetchPages();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('landing_pages').delete().eq('id', id);
    toast({ title: 'Page deleted' });
    fetchPages();
  };

  const copyUrl = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Landing Pages</h1>
        <div className="flex gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 w-48" /></div>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Create New Page</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'deployed', 'draft', 'zero'].map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => { setFilter(f); setPage(0); }} className="text-xs capitalize">
            {f === 'zero' ? 'Zero Traffic' : f === 'deployed' ? 'Live' : f}
          </Button>
        ))}
        <span className="w-px bg-border mx-1" />
        {['all', ...Object.keys(VERTICAL_LABELS)].map(v => (
          <Button key={v} variant={verticalFilter === v ? 'default' : 'outline'} size="sm" onClick={() => { setVerticalFilter(v); setPage(0); }} className="text-xs capitalize">
            {v === 'all' ? 'All Verticals' : VERTICAL_LABELS[v] ?? v}
          </Button>
        ))}
        <span className="w-px bg-border mx-1" />
        {['all', 'US', 'AU'].map(c => (
          <Button key={c} variant={countryFilter === c ? 'default' : 'outline'} size="sm" onClick={() => { setCountryFilter(c); setPage(0); }} className="text-xs">
            {c === 'all' ? 'All' : c === 'US' ? '🇺🇸' : '🇦🇺'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : pages.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No landing pages found.</CardContent></Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Vertical</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Views</TableHead>
                <TableHead className="hidden lg:table-cell">Subdomain</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map(p => {
                const status = getStatus(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium cursor-pointer hover:text-primary" onClick={() => navigate(`/admin/landing-pages/${p.id}`)}>{p.page_name}</TableCell>
                    <TableCell className="cursor-pointer hover:text-primary" onClick={() => navigate(`/admin/clients/${p.client_id}`)}>{p.clients?.business_name ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline" className={`text-xs ${VERTICAL_COLORS[p.template_type ?? ''] ?? ''}`}>{VERTICAL_LABELS[p.template_type ?? ''] ?? p.template_type}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${status.color}`}>{status.label}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell">{p.page_views ?? 0}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {p.subdomain ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs truncate max-w-[120px]">{p.subdomain}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyUrl(p.subdomain ?? '', p.id)}>
                            {copied === p.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="Edit" onClick={() => navigate(`/admin/landing-pages/${p.id}`)}>✏️</Button>
                        <Button variant="ghost" size="sm" title={p.deployed ? 'Unpublish' : 'Deploy'} onClick={() => handleDeploy(p.id, p.deployed ?? false)}>{p.deployed ? '⬇️' : '⬆️'}</Button>
                        <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDelete(p.id)}>🗑</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Landing Page</DialogTitle></DialogHeader>
          <LandingPageForm mode="create" onSubmit={handleCreate} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ======= DETAIL VIEW =======
function PageDetail({ pageId }: { pageId: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [client, setClient] = useState<Tables<'clients'> | null>(null);
  const [analytics, setAnalytics] = useState<Tables<'analytics'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [previewCity, setPreviewCity] = useState('Dallas');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewCountry, setPreviewCountry] = useState('US');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: pageData } = await supabase.from('landing_pages').select('*').eq('id', pageId).single();
    if (pageData) {
      setPage(pageData);
      const { data: clientData } = await supabase.from('clients').select('*').eq('id', pageData.client_id).single();
      setClient(clientData);
      const { data: analyticsData } = await supabase.from('analytics').select('*').eq('landing_page_id', pageId);
      setAnalytics(analyticsData ?? []);
    }
    setLoading(false);
  }, [pageId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEdit = async (formData: LandingPageFormData) => {
    const { error } = await supabase.from('landing_pages').update({
      page_name: formData.page_name,
      client_id: formData.client_id,
      template_type: formData.template_type,
      subdomain: formData.subdomain || null,
      headline_template: formData.headline_template || null,
      subheadline_template: formData.subheadline_template || null,
      cta_text: formData.cta_text || null,
      primary_color: formData.primary_color || null,
      about_text: formData.about_text || null,
      service_area_description: formData.service_area_description || null,
      hero_image_url: formData.hero_image_url || null,
      before_image_url: formData.before_image_url || null,
      after_image_url: formData.after_image_url || null,
      logo_url: formData.logo_url || null,
      notification_email: formData.notification_email || null,
      ghl_webhook_url: formData.ghl_webhook_url || null,
      maps_embed_url: formData.maps_embed_url || null,
    }).eq('id', pageId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); throw error; }
    toast({ title: '✅ Page updated' });
    fetchData();
  };

  const handleVerifyDNS = async () => {
    if (!page?.subdomain) return;
    setVerifying(true);
    const ok = await verifyDNS(page.subdomain, 'localadssystem.com');
    if (ok) {
      await updateDNSStatus(pageId, true);
      toast({ title: '✅ DNS Connected! Page is now live.' });
      fetchData();
    } else {
      toast({ title: '❌ DNS not detected yet', description: 'Changes can take up to 48 hours.', variant: 'destructive' });
    }
    setVerifying(false);
  };

  const handleOverrideLive = async () => {
    await supabase
      .from('landing_pages')
      .update({ deployed: true, is_published: true, verified_at: new Date().toISOString() })
      .eq('id', pageId);
    toast({ title: '✅ Page marked as Live (override)' });
    fetchData();
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  if (!page) return <p className="text-muted-foreground">Page not found.</p>;

  const platformData = analytics.reduce<Record<string, number>>((acc, a) => { const p = a.ad_platform ?? 'unknown'; acc[p] = (acc[p] ?? 0) + (a.page_views ?? 0); return acc; }, {});
  const deviceData = analytics.reduce<Record<string, number>>((acc, a) => { const d = a.device_type ?? 'unknown'; acc[d] = (acc[d] ?? 0) + (a.page_views ?? 0); return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/landing-pages')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold text-foreground">{page.page_name}</h1>
        <Badge variant="outline" className={`text-xs ${getStatus(page).color}`}>{getStatus(page).label}</Badge>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="flex-wrap">
          <TabsTrigger value="settings">Page Settings</TabsTrigger>
          <TabsTrigger value="geo">Geo Configuration</TabsTrigger>
          <TabsTrigger value="dns">DNS Setup</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <LandingPageForm mode="edit" pageId={pageId} onSubmit={handleEdit} initialData={{
            page_name: page.page_name,
            client_id: page.client_id,
            template_type: page.template_type ?? '',
            country: page.country,
            subdomain: page.subdomain ?? '',
            headline_template: page.headline_template ?? '',
            subheadline_template: page.subheadline_template ?? '',
            cta_text: page.cta_text ?? '',
            primary_color: page.primary_color ?? '#3b82f6',
            about_text: (page as Record<string, unknown>).about_text as string ?? '',
            service_area_description: (page as Record<string, unknown>).service_area_description as string ?? '',
            hero_image_url: (page as Record<string, unknown>).hero_image_url as string ?? '',
            before_image_url: (page as Record<string, unknown>).before_image_url as string ?? '',
            after_image_url: (page as Record<string, unknown>).after_image_url as string ?? '',
            logo_url: (page as Record<string, unknown>).logo_url as string ?? '',
            notification_email: (page as Record<string, unknown>).notification_email as string ?? '',
            ghl_webhook_url: (page as Record<string, unknown>).ghl_webhook_url as string ?? '',
            maps_embed_url: (page as Record<string, unknown>).maps_embed_url as string ?? '',
          }} />
        </TabsContent>

        <TabsContent value="geo">
          {client && (
            <GeoConfigForm landingPageId={pageId} clientCountry={client.country as 'US' | 'AU'} clientDefaults={{
              default_city: client.default_city,
              default_state: client.default_state,
              default_area_code: client.default_area_code,
            }} />
          )}
        </TabsContent>

        <TabsContent value="dns" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>DNS Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {(page as Record<string, unknown>).verified_at ? (
                  <Badge className="bg-green-500/20 text-green-400">🟢 Connected and Live</Badge>
                ) : page.deployed ? (
                  <Badge className="bg-yellow-500/20 text-yellow-400">🟡 Pending Verification</Badge>
                ) : (
                  <Badge variant="secondary">🔴 Not Connected</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Configure DNS</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare etc)</li>
                <li>Go to DNS Management</li>
                <li>Add a new CNAME record:</li>
              </ol>
              <div className="rounded-md bg-muted p-4 space-y-2 font-mono text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground">CNAME</span></div>
                <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground">{page.subdomain?.split('.')[0] ?? 'ads'}</span></div>
                <div><span className="text-muted-foreground">Value:</span> <span className="text-foreground">localadssystem.com</span></div>
                <div><span className="text-muted-foreground">TTL:</span> <span className="text-foreground">3600</span></div>
              </div>
              <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-yellow-400">
                ⚠️ DNS changes can take up to 24-48 hours to propagate worldwide.
              </div>
              {page.subdomain && <p className="text-sm text-muted-foreground">After adding the record, visit: <code className="bg-muted px-1 rounded">http://{page.subdomain}</code> to verify.</p>}
              <div className="flex gap-2">
                <Button onClick={handleVerifyDNS} disabled={verifying || !page.subdomain}>
                  {verifying && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Verify DNS
                </Button>
                <Button variant="outline" onClick={handleOverrideLive}>Override to Live</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BarChartCard title="Traffic by Platform" data={Object.entries(platformData).map(([name, value]) => ({ name, value }))} />
            <PieChartCard title="Traffic by Device" data={Object.entries(deviceData).map(([name, value]) => ({ name, value }))} />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Preview Controls</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end flex-wrap">
                <div><label className="text-sm text-muted-foreground">City</label><Input value={previewCity} onChange={e => setPreviewCity(e.target.value)} className="w-40" /></div>
                <div className="flex gap-1">
                  <Button variant={previewDevice === 'desktop' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewDevice('desktop')}>Desktop</Button>
                  <Button variant={previewDevice === 'mobile' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewDevice('mobile')}>Mobile</Button>
                </div>
                <div className="flex gap-1">
                  <Button variant={previewCountry === 'US' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewCountry('US')}>🇺🇸</Button>
                  <Button variant={previewCountry === 'AU' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewCountry('AU')}>🇦🇺</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="border border-border rounded-lg overflow-hidden bg-background" style={{ maxWidth: previewDevice === 'mobile' ? '375px' : '100%', margin: previewDevice === 'mobile' ? '0 auto' : undefined }}>
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-lg font-semibold">Preview</p>
              <p className="text-sm mt-2">Template preview with {previewCity}, {previewCountry} will render here once templates are implemented in Phase 2.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ======= MAIN EXPORT =======
export default function AdminLandingPages() {
  const location = useLocation();
  const match = location.pathname.match(/\/admin\/landing-pages\/(.+)/);
  if (match?.[1]) return <PageDetail pageId={match[1]} />;
  return <PageList />;
}
