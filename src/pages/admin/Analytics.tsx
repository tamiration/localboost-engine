import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/admin/StatCard';
import { BarChartCard, PieChartCard, LineChartCard } from '@/components/admin/AnalyticsChart';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<Tables<'analytics'>[]>([]);
  const [pages, setPages] = useState<(Tables<'landing_pages'> & { clients: { business_name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | '7' | '30' | 'all'>('30');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const getDateFilter = () => {
    if (dateRange === 'today') return startOfDay(new Date()).toISOString();
    if (dateRange === '7') return subDays(new Date(), 7).toISOString();
    if (dateRange === '30') return subDays(new Date(), 30).toISOString();
    if (customStart) return customStart.toISOString();
    return null;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const dateFilter = getDateFilter();
    let analyticsQuery = supabase.from('analytics').select('*');
    if (dateFilter) analyticsQuery = analyticsQuery.gte('created_at', dateFilter);
    if (customEnd) analyticsQuery = analyticsQuery.lte('created_at', customEnd.toISOString());
    const [analyticsR, pagesR] = await Promise.all([
      analyticsQuery,
      supabase.from('landing_pages').select('*, clients(business_name)').eq('deployed', true).order('page_views', { ascending: false }).limit(20),
    ]);
    setAnalytics(analyticsR.data ?? []);
    setPages((pagesR.data ?? []) as typeof pages);
    setLoading(false);
  }, [dateRange, customStart, customEnd]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalViews = analytics.reduce((s, a) => s + (a.page_views ?? 0), 0);
  const totalForms = analytics.reduce((s, a) => s + (a.form_submissions ?? 0), 0);

  const platformCounts = analytics.reduce<Record<string, number>>((acc, a) => {
    const p = a.ad_platform ?? 'unknown';
    acc[p] = (acc[p] ?? 0) + (a.page_views ?? 0);
    return acc;
  }, {});
  const googlePct = totalViews > 0 ? Math.round(((platformCounts['google'] ?? 0) / totalViews) * 100) : 0;
  const bingPct = totalViews > 0 ? Math.round(((platformCounts['bing'] ?? 0) / totalViews) * 100) : 0;

  const deviceCounts = analytics.reduce<Record<string, number>>((acc, a) => {
    const d = a.device_type ?? 'unknown';
    acc[d] = (acc[d] ?? 0) + (a.page_views ?? 0);
    return acc;
  }, {});
  const mobilePct = totalViews > 0 ? Math.round(((deviceCounts['mobile'] ?? deviceCounts['m'] ?? 0) / totalViews) * 100) : 0;

  const cityCounts = analytics.reduce<Record<string, number>>((acc, a) => {
    const c = a.city_resolved ?? 'Unknown';
    if (c) acc[c] = (acc[c] ?? 0) + (a.page_views ?? 0);
    return acc;
  }, {});
  const topCities = Object.entries(cityCounts).sort(([,a], [,b]) => b - a).slice(0, 10).map(([name, value]) => ({ name, value }));

  const sourceCounts = analytics.reduce<Record<string, number>>((acc, a) => {
    const s = a.location_source ?? 'unknown';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const dailyViews = analytics.reduce<Record<string, number>>((acc, a) => {
    const d = format(new Date(a.created_at), 'MM/dd');
    acc[d] = (acc[d] ?? 0) + (a.page_views ?? 0);
    return acc;
  }, {});
  const dailyData = Object.entries(dailyViews).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));

  const exportCSV = () => {
    const rows = analytics.map(a => [a.created_at, a.city_resolved, a.device_type, a.ad_platform, a.location_source, a.page_views, a.form_submissions].join(','));
    const csv = 'Date,City,Device,Platform,Source,Views,Forms\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <div className="flex gap-2 items-center flex-wrap">
          {(['today', '7', '30', 'all'] as const).map(r => (
            <Button key={r} variant={dateRange === r ? 'default' : 'outline'} size="sm" onClick={() => setDateRange(r)}>
              {r === 'today' ? 'Today' : r === '7' ? '7 Days' : r === '30' ? '30 Days' : 'All'}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm"><CalendarIcon className="h-4 w-4 mr-1" /> Custom</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={customStart} onSelect={d => { setCustomStart(d); setDateRange('all'); }} /></PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Page Views" value={totalViews.toLocaleString()} icon="👁" color="#3b82f6" />
            <StatCard title="Form Submissions" value={totalForms.toLocaleString()} icon="📝" color="#10b981" />
            <StatCard title="Google vs Bing" value={`${googlePct}% / ${bingPct}%`} icon="📊" color="#f59e0b" />
            <StatCard title="Mobile vs Desktop" value={`${mobilePct}% / ${100 - mobilePct}%`} icon="📱" color="#8b5cf6" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LineChartCard title="Page Views Over Time" data={dailyData} />
            <PieChartCard title="Ad Platform Split" data={Object.entries(platformCounts).map(([name, value]) => ({ name, value }))} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PieChartCard title="Device Type Split" data={Object.entries(deviceCounts).map(([name, value]) => ({ name, value }))} />
            <BarChartCard title="Location Resolution Sources" data={Object.entries(sourceCounts).map(([name, value]) => ({ name, value }))} layout="horizontal" color="#10b981" />
          </div>

          <BarChartCard title="Top 10 Cities" data={topCities} layout="horizontal" />

          <Card>
            <CardHeader><CardTitle className="text-base">Top Landing Pages</CardTitle></CardHeader>
            <CardContent>
              {pages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deployed pages yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead className="hidden md:table-cell">Vertical</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.page_name}</TableCell>
                        <TableCell>{p.clients?.business_name ?? '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{p.page_views ?? 0}</span>
                            <div className="h-2 bg-primary/20 rounded-full flex-1 max-w-20">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, ((p.page_views ?? 0) / Math.max(1, pages[0]?.page_views ?? 1)) * 100)}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell capitalize">{p.template_type ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
