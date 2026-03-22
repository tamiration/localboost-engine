import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ClientForm, type ClientFormData } from '@/components/admin/ClientForm';
import { PhoneNumberManager } from '@/components/admin/PhoneNumberManager';
import { formatDistanceToNow, format } from 'date-fns';
import { Plus, Search, ArrowLeft, CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type Client = Tables<'clients'>;
type LandingPage = Tables<'landing_pages'>;
type EditRequest = Tables<'edit_requests'>;

const VERTICAL_COLORS: Record<string, string> = {
  garage_door: 'bg-blue-500/20 text-blue-400',
  chimney: 'bg-red-500/20 text-red-400',
  locksmith: 'bg-yellow-500/20 text-yellow-400',
  dryer_vent: 'bg-teal-500/20 text-teal-400',
};
const VERTICAL_LABELS: Record<string, string> = {
  garage_door: '🚪 Garage Door',
  chimney: '🏠 Chimney',
  locksmith: '🔐 Locksmith',
  dryer_vent: '🌀 Dryer Vent',
};

const TIER_FILTERS = ['all', 'active', 'inactive', 'US', 'AU', 'free', 'basic', 'medium', 'enterprise', 'nationwide'];

// ========== CLIENT LIST ==========
function ClientList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [sortCol, setSortCol] = useState<'created_at' | 'business_name'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const PAGE_SIZE = 20;

  const fetchClients = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('clients').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%,default_city.ilike.%${search}%`);
    }
    if (filter === 'active') query = query.eq('active', true);
    else if (filter === 'inactive') query = query.eq('active', false);
    else if (filter === 'US') query = query.eq('country', 'US');
    else if (filter === 'AU') query = query.eq('country', 'AU');
    else if (['free', 'basic', 'medium', 'enterprise', 'nationwide'].includes(filter))
      query = query.eq('subscription_tier', filter);

    query = query.order(sortCol, { ascending: sortAsc }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, count, error } = await query;
    if (!error) {
      setClients(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [search, filter, page, sortCol, sortAsc]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleSort = (col: 'created_at' | 'business_name') => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const handleCreate = async (data: ClientFormData) => {
    const { error } = await supabase.from('clients').insert({
      business_name: data.business_name,
      website_url: data.website_url || null,
      service_verticals: data.service_verticals,
      country: data.country,
      contact_name: data.contact_name || null,
      email: data.email || null,
      phone: data.phone || null,
      default_city: data.default_city || null,
      default_state: data.default_state || null,
      default_area_code: data.default_area_code || null,
      default_address: data.default_address || null,
      subscription_tier: data.subscription_tier,
      ghl_webhook_url: data.ghl_webhook_url || null,
      ghl_contact_id: data.ghl_contact_id || null,
      notes: data.notes || null,
    });
    if (error) {
      toast({ title: 'Error creating client', description: error.message, variant: 'destructive' });
      throw error;
    }
    // Create subscription
    if (data.monthly_amount || data.setup_fee_amount) {
      const clientRes = await supabase.from('clients').select('id').eq('business_name', data.business_name).order('created_at', { ascending: false }).limit(1).single();
      if (clientRes.data) {
        await supabase.from('subscriptions').insert({
          client_id: clientRes.data.id,
          plan_tier: data.subscription_tier,
          monthly_amount: data.monthly_amount,
          setup_fee_amount: data.setup_fee_amount,
          setup_fee_paid: data.setup_fee_paid,
          next_billing_date: data.next_billing_date,
          status: 'active',
        });
      }
    }
    toast({ title: '✅ Client created successfully' });
    setShowCreate(false);
    fetchClients();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Add New Client</Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TIER_FILTERS.map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => { setFilter(f); setPage(0); }} className="capitalize text-xs">
            {f === 'US' ? '🇺🇸 USA' : f === 'AU' ? '🇦🇺 Australia' : f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : clients.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No clients yet. Click Add New Client to get started.</CardContent></Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('business_name')}>Business Name {sortCol === 'business_name' ? (sortAsc ? '↑' : '↓') : ''}</TableHead>
                <TableHead className="hidden lg:table-cell">Verticals</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="hidden md:table-cell">Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => handleSort('created_at')}>Created {sortCol === 'created_at' ? (sortAsc ? '↑' : '↓') : ''}</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium cursor-pointer hover:text-primary" onClick={() => navigate(`/admin/clients/${c.id}`)}>{c.business_name}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">{(c.service_verticals ?? []).map(v => (
                      <Badge key={v} variant="outline" className={`text-xs ${VERTICAL_COLORS[v] ?? ''}`}>{VERTICAL_LABELS[v] ?? v}</Badge>
                    ))}</div>
                  </TableCell>
                  <TableCell>{c.country === 'US' ? '🇺🇸' : '🇦🇺'}</TableCell>
                  <TableCell className="hidden md:table-cell capitalize">{c.subscription_tier ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={c.active ? 'default' : 'secondary'} className={c.active ? 'bg-green-500/20 text-green-400' : ''}>{c.active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/clients/${c.id}`)}>👁</Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/clients/${c.id}`)}>✏️</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
          <DialogHeader><DialogTitle>Create New Client</DialogTitle></DialogHeader>
          <ClientForm mode="create" onSubmit={handleCreate} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== CLIENT DETAIL ==========
function ClientDetail({ clientId }: { clientId: string }) {
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [subscription, setSubscription] = useState<Tables<'subscriptions'> | null>(null);
  const [analytics, setAnalytics] = useState<Tables<'analytics'>[]>([]);
  const [editFilter, setEditFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'7' | '30' | 'all'>('30');
  const [ghlLoading, setGhlLoading] = useState(false);

  // Billing edit states
  const [billingTier, setBillingTier] = useState('');
  const [billingMonthly, setBillingMonthly] = useState('');
  const [billingSetupFee, setBillingSetupFee] = useState('');
  const [billingSetupPaid, setBillingSetupPaid] = useState(false);
  const [billingNextDate, setBillingNextDate] = useState<Date | undefined>();
  const [billingStatus, setBillingStatus] = useState('active');
  const [billingSaving, setBillingSaving] = useState(false);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    const [clientR, pagesR, editsR, subsR, analyticsR] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('landing_pages').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('edit_requests').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1),
      supabase.from('analytics').select('*').in('landing_page_id', (await supabase.from('landing_pages').select('id').eq('client_id', clientId)).data?.map(p => p.id) ?? []),
    ]);
    if (clientR.data) setClient(clientR.data as Client);
    setPages(pagesR.data ?? []);
    setEditRequests(editsR.data ?? []);
    const sub = subsR.data?.[0] ?? null;
    setSubscription(sub);
    if (sub) {
      setBillingTier(sub.plan_tier ?? '');
      setBillingMonthly(sub.monthly_amount?.toString() ?? '');
      setBillingSetupFee(sub.setup_fee_amount?.toString() ?? '');
      setBillingSetupPaid(sub.setup_fee_paid ?? false);
      setBillingNextDate(sub.next_billing_date ? new Date(sub.next_billing_date) : undefined);
      setBillingStatus(sub.status ?? 'active');
    }
    setAnalytics(analyticsR.data ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  const handleEdit = async (data: ClientFormData) => {
    const { error } = await supabase.from('clients').update({
      business_name: data.business_name,
      website_url: data.website_url || null,
      service_verticals: data.service_verticals,
      country: data.country,
      contact_name: data.contact_name || null,
      email: data.email || null,
      phone: data.phone || null,
      default_city: data.default_city || null,
      default_state: data.default_state || null,
      default_area_code: data.default_area_code || null,
      default_address: data.default_address || null,
      subscription_tier: data.subscription_tier,
      ghl_webhook_url: data.ghl_webhook_url || null,
      ghl_contact_id: data.ghl_contact_id || null,
      notes: data.notes || null,
    }).eq('id', clientId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      throw error;
    }
    toast({ title: '✅ Client updated' });
    setShowEdit(false);
    fetchClient();
  };

  const handleGhlCreate = async () => {
    if (!client) return;
    const webhookUrl = (client as Record<string, unknown>).ghl_webhook_url as string | null;
    if (!webhookUrl) {
      toast({ title: 'No GHL webhook URL configured', variant: 'destructive' });
      return;
    }
    setGhlLoading(true);
    try {
      const contactName = (client as Record<string, unknown>).contact_name as string || '';
      const parts = contactName.split(' ');
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: parts[0] || '',
          last_name: parts.slice(1).join(' ') || '',
          email: client.email,
          phone: client.phone,
          name: client.business_name,
          source: 'LocalAds System — New Client',
          tags: ['LocalAds', ...(client.service_verticals ?? []), client.subscription_tier ?? ''],
        }),
      });
      if (res.ok) {
        toast({ title: '✅ GHL contact created successfully' });
      } else {
        toast({ title: '⚠️ GHL contact creation failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: '⚠️ GHL contact creation failed', variant: 'destructive' });
    }
    setGhlLoading(false);
  };

  const handleMarkComplete = async (id: string) => {
    await supabase.from('edit_requests').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
    toast({ title: 'Edit request marked complete' });
    fetchClient();
  };

  const handleSaveBilling = async () => {
    if (!subscription) return;
    setBillingSaving(true);
    const { error } = await supabase.from('subscriptions').update({
      plan_tier: billingTier || null,
      monthly_amount: billingMonthly ? Number(billingMonthly) : null,
      setup_fee_amount: billingSetupFee ? Number(billingSetupFee) : null,
      setup_fee_paid: billingSetupPaid,
      next_billing_date: billingNextDate?.toISOString() ?? null,
      status: billingStatus,
    }).eq('id', subscription.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: '✅ Billing info saved' });
    setBillingSaving(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  if (!client) return <p className="text-muted-foreground">Client not found.</p>;

  const filteredEdits = editFilter === 'all' ? editRequests : editRequests.filter(e => e.status === editFilter);

  // Analytics calculations
  const totalViews = pages.reduce((s, p) => s + (p.page_views ?? 0), 0);
  const totalForms = analytics.reduce((s, a) => s + (a.form_submissions ?? 0), 0);
  const topPage = pages.sort((a, b) => (b.page_views ?? 0) - (a.page_views ?? 0))[0];
  const platformData = analytics.reduce<Record<string, number>>((acc, a) => {
    const p = a.ad_platform ?? 'unknown';
    acc[p] = (acc[p] ?? 0) + (a.page_views ?? 0);
    return acc;
  }, {});
  const deviceData = analytics.reduce<Record<string, number>>((acc, a) => {
    const d = a.device_type ?? 'unknown';
    acc[d] = (acc[d] ?? 0) + (a.page_views ?? 0);
    return acc;
  }, {});
  const sourceData = analytics.reduce<Record<string, number>>((acc, a) => {
    const s = a.location_source ?? 'unknown';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const webhookUrl = (client as Record<string, unknown>).ghl_webhook_url as string | null;
  const ghlContactId = (client as Record<string, unknown>).ghl_contact_id as string | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/clients')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold text-foreground">{client.business_name}</h1>
        <Badge variant={client.active ? 'default' : 'secondary'} className={client.active ? 'bg-green-500/20 text-green-400' : ''}>
          {client.active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Landing Pages</TabsTrigger>
          <TabsTrigger value="phones">Phone Numbers</TabsTrigger>
          <TabsTrigger value="billing">Subscription</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="edits">Edit Requests</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Client Details</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>Edit Client</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Business Name:</span> <span className="ml-2 font-medium">{client.business_name}</span></div>
                <div><span className="text-muted-foreground">Country:</span> <span className="ml-2">{client.country === 'US' ? '🇺🇸 USA' : '🇦🇺 Australia'}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="ml-2">{client.email ?? '-'}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="ml-2">{client.phone ?? '-'}</span></div>
                <div><span className="text-muted-foreground">Website:</span> <span className="ml-2">{client.website_url ? <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{client.website_url}</a> : '-'}</span></div>
                <div><span className="text-muted-foreground">Tier:</span> <span className="ml-2 capitalize">{client.subscription_tier ?? '-'}</span></div>
                <div><span className="text-muted-foreground">Default City:</span> <span className="ml-2">{client.default_city ?? '-'}</span></div>
                <div><span className="text-muted-foreground">Default State:</span> <span className="ml-2">{client.default_state ?? '-'}</span></div>
                <div><span className="text-muted-foreground">Default Area Code:</span> <span className="ml-2">{client.default_area_code ?? '-'}</span></div>
                <div><span className="text-muted-foreground">Verticals:</span> <span className="ml-2">{(client.service_verticals ?? []).map(v => VERTICAL_LABELS[v] ?? v).join(', ') || '-'}</span></div>
                {client.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> <span className="ml-2">{client.notes}</span></div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">GHL Integration</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {webhookUrl ? (
                <p className="text-sm text-green-400">✅ GHL Webhook configured</p>
              ) : (
                <p className="text-sm text-yellow-400">⚠️ GHL not connected — set up later</p>
              )}
              {ghlContactId && <p className="text-sm text-muted-foreground">Contact ID: {ghlContactId}</p>}
              {webhookUrl && !ghlContactId && (
                <Button variant="outline" size="sm" onClick={handleGhlCreate} disabled={ghlLoading}>
                  {ghlLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Create GHL Contact
                </Button>
              )}
              <p className="text-xs text-muted-foreground">GHL full integration coming in Phase 2</p>
            </CardContent>
          </Card>

          <Dialog open={showEdit} onOpenChange={setShowEdit}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
              <ClientForm mode="edit" onSubmit={handleEdit} initialData={{
                business_name: client.business_name,
                website_url: client.website_url ?? '',
                service_verticals: client.service_verticals ?? [],
                country: client.country as 'US' | 'AU',
                contact_name: (client as Record<string, unknown>).contact_name as string ?? '',
                email: client.email ?? '',
                phone: client.phone ?? '',
                default_city: client.default_city ?? '',
                default_state: client.default_state ?? '',
                default_area_code: client.default_area_code ?? '',
                default_address: client.default_address ?? '',
                subscription_tier: client.subscription_tier ?? 'free',
                ghl_webhook_url: webhookUrl ?? '',
                ghl_contact_id: ghlContactId ?? '',
                notes: client.notes ?? '',
              }} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* LANDING PAGES TAB */}
        <TabsContent value="pages" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Landing Pages ({pages.length})</h3>
            <Button size="sm" onClick={() => navigate('/admin/landing-pages')}><Plus className="h-4 w-4 mr-1" /> Create New Page</Button>
          </div>
          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No landing pages yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.page_name}</TableCell>
                    <TableCell className="capitalize">{p.template_type ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={p.deployed ? 'default' : 'secondary'} className={p.deployed ? 'bg-green-500/20 text-green-400' : ''}>
                        {p.deployed ? 'Deployed' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.page_views ?? 0}</TableCell>
                    <TableCell><Button variant="ghost" size="sm">View Page</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* PHONE NUMBERS TAB */}
        <TabsContent value="phones">
          <PhoneNumberManager clientId={clientId} country={client.country as 'US' | 'AU'} />
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Subscription & Billing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!subscription ? (
                <p className="text-sm text-muted-foreground">No subscription record found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Plan Tier</label>
                    <Select value={billingTier} onValueChange={setBillingTier}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['free', 'basic', 'medium', 'enterprise', 'nationwide'].map(t => (
                          <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Monthly Amount ($)</label>
                    <Input type="number" value={billingMonthly} onChange={e => setBillingMonthly(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Setup Fee ($)</label>
                    <Input type="number" value={billingSetupFee} onChange={e => setBillingSetupFee(e.target.value)} />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={billingSetupPaid} onChange={e => setBillingSetupPaid(e.target.checked)} className="accent-primary" />
                      <span className="text-sm">Setup Fee Paid</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Next Billing Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left', !billingNextDate && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {billingNextDate ? format(billingNextDate, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={billingNextDate} onSelect={setBillingNextDate} /></PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Status</label>
                    <Select value={billingStatus} onValueChange={setBillingStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="past_due">Past Due</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {subscription && (
                <Button onClick={handleSaveBilling} disabled={billingSaving}>
                  {billingSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save Billing Info
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Stripe integration coming in Phase 2. Track billing manually for now.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex gap-2 mb-4">
            {(['7', '30', 'all'] as const).map(r => (
              <Button key={r} variant={dateRange === r ? 'default' : 'outline'} size="sm" onClick={() => setDateRange(r)}>
                {r === '7' ? 'Last 7 Days' : r === '30' ? 'Last 30 Days' : 'All Time'}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{totalViews}</p><p className="text-sm text-muted-foreground">Total Page Views</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{totalForms}</p><p className="text-sm text-muted-foreground">Total Form Submissions</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{topPage?.page_name ?? '-'}</p><p className="text-sm text-muted-foreground">Top Performing Page</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Traffic by Platform</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(platformData).map(([name, value]) => ({ name, value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 22%)" />
                    <XAxis dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                    <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(222, 47%, 14%)', border: '1px solid hsl(222, 30%, 22%)', color: '#fff' }} />
                    <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Traffic by Device</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={Object.entries(deviceData).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {Object.keys(deviceData).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(222, 47%, 14%)', border: '1px solid hsl(222, 30%, 22%)', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Location Resolution Breakdown</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(sourceData).map(([name, value]) => ({ name, value }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 22%)" />
                  <XAxis type="number" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="hsl(215, 20%, 65%)" fontSize={11} width={120} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(222, 47%, 14%)', border: '1px solid hsl(222, 30%, 22%)', color: '#fff' }} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EDIT REQUESTS TAB */}
        <TabsContent value="edits" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'in_progress', 'done'].map(s => (
              <Button key={s} variant={editFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setEditFilter(s)} className="capitalize text-xs">{s.replace('_', ' ')}</Button>
            ))}
          </div>
          {filteredEdits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No edit requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEdits.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="max-w-xs truncate">{e.edit_description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        e.status === 'pending' && 'text-yellow-400',
                        e.status === 'in_progress' && 'text-blue-400',
                        e.status === 'done' && 'text-green-400',
                      )}>{e.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</TableCell>
                    <TableCell>
                      {e.status !== 'done' && <Button variant="outline" size="sm" onClick={() => handleMarkComplete(e.id)}>Mark Complete</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========== MAIN EXPORT ==========
export default function AdminClients() {
  const { clientId } = useParams();
  const location = useLocation();

  // Check if we're on a detail route
  const match = location.pathname.match(/\/admin\/clients\/(.+)/);
  const detailId = match?.[1];

  if (detailId) return <ClientDetail clientId={detailId} />;
  return <ClientList />;
}
