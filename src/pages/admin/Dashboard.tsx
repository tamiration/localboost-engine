import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/admin/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  activeClients: number;
  deployedPages: number;
  pendingEdits: number;
  mrr: number;
  zeroTrafficPages: number;
  topPageName: string;
  topPageViews: number;
}

interface RecentClient {
  id: string;
  business_name: string;
  service_verticals: string[] | null;
  subscription_tier: string | null;
  country: string;
  created_at: string;
  active: boolean | null;
}

interface PageRow {
  id: string;
  page_name: string;
  template_type: string | null;
  created_at: string;
  page_views: number | null;
  clients: { business_name: string } | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [zeroPages, setZeroPages] = useState<PageRow[]>([]);
  const [topPages, setTopPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsR, pagesR, editsR, subsR, zeroR, topR, recentR] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('landing_pages').select('id', { count: 'exact', head: true }).eq('deployed', true),
        supabase.from('edit_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('subscriptions').select('monthly_amount').eq('status', 'active'),
        supabase.from('landing_pages').select('id, page_name, template_type, created_at, page_views, clients(business_name)').eq('deployed', true).eq('page_views', 0).order('created_at', { ascending: true }).limit(5),
        supabase.from('landing_pages').select('id, page_name, template_type, created_at, page_views, clients(business_name)').eq('deployed', true).order('page_views', { ascending: false }).limit(5),
        supabase.from('clients').select('id, business_name, service_verticals, subscription_tier, country, created_at, active').order('created_at', { ascending: false }).limit(5),
      ]);

      const mrr = (subsR.data ?? []).reduce((sum, s) => sum + (Number(s.monthly_amount) || 0), 0);
      const topPage = topR.data?.[0];

      setStats({
        activeClients: clientsR.count ?? 0,
        deployedPages: pagesR.count ?? 0,
        pendingEdits: editsR.count ?? 0,
        mrr,
        zeroTrafficPages: zeroR.data?.length ?? 0,
        topPageName: topPage?.page_name ?? '-',
        topPageViews: topPage?.page_views ?? 0,
      });

      setRecentClients((recentR.data ?? []) as RecentClient[]);
      setZeroPages((zeroR.data ?? []) as unknown as PageRow[]);
      setTopPages((topR.data ?? []) as unknown as PageRow[]);
    } catch {
      // fail silently
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Total Active Clients" value={stats.activeClients} icon="👥" color="#1a56db" />
          <StatCard title="Landing Pages Deployed" value={stats.deployedPages} icon="🌐" color="#059669" />
          <StatCard title="Pending Edit Requests" value={stats.pendingEdits} icon="✏️" color="#d97706" alert={stats.pendingEdits > 0} onClick={() => navigate('/admin/edit-requests')} />
          <StatCard title="Monthly Recurring Revenue" value={`$${stats.mrr.toLocaleString()}/mo`} icon="💰" color="#7c3aed" />
          <StatCard title="Pages With Zero Traffic" value={stats.zeroTrafficPages} icon="⚠️" color="#dc2626" alert={stats.zeroTrafficPages > 0} subtitle="Need attention" />
          <StatCard title="Top Page Views" value={stats.topPageViews} icon="📈" color="#0891b2" subtitle={stats.topPageName} />
        </div>
      )}

      {/* Recent Clients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Clients</CardTitle>
          <Button variant="link" size="sm" onClick={() => navigate('/admin/clients')}>View All →</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : recentClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead className="hidden md:table-cell">Verticals</TableHead>
                  <TableHead className="hidden md:table-cell">Tier</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentClients.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.business_name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {(c.service_verticals ?? []).map(v => (
                          <Badge key={v} variant="outline" className={`text-xs ${verticalColors[v] ?? ''}`}>
                            {verticalLabels[v] ?? v}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{c.subscription_tier ?? '-'}</TableCell>
                    <TableCell>{c.country === 'US' ? '🇺🇸' : '🇦🇺'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</TableCell>
                    <TableCell>
                      <Badge variant={c.active ? 'default' : 'secondary'} className={c.active ? 'bg-green-500/20 text-green-400' : ''}>
                        {c.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/clients/${c.id}`)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Zero Traffic Pages */}
      {zeroPages.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Pages With Zero Traffic</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Template</TableHead>
                  <TableHead className="hidden md:table-cell">Deployed</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zeroPages.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.page_name}</TableCell>
                    <TableCell>{p.clients?.business_name ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{p.template_type ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</TableCell>
                    <TableCell><Button variant="ghost" size="sm">View Page</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Top Performing */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Top Performing Pages</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deployed pages yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead className="hidden md:table-cell">Vertical</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPages.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.page_name}</TableCell>
                    <TableCell>{p.clients?.business_name ?? '-'}</TableCell>
                    <TableCell>{p.page_views ?? 0}</TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{p.template_type ?? '-'}</TableCell>
                    <TableCell><Button variant="ghost" size="sm">View</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
