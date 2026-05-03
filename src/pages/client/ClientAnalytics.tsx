import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChartCard, PieChartCard, LineChartCard } from '@/components/admin/AnalyticsChart';
import { subDays, startOfDay, format } from 'date-fns';

interface AnalyticsRow {
  id: string;
  landing_page_id: string;
  page_views: number | null;
  unique_visitors: number | null;
  form_submissions: number | null;
  cta_clicks: number | null;
  ad_platform: string | null;
  device_type: string | null;
  location_source: string | null;
  city_resolved: string | null;
  created_at: string;
}

interface PageInfo {
  id: string;
  page_name: string;
  page_views: number | null;
}

export default function ClientAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [selectedPage, setSelectedPage] = useState('all');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get client record to scope queries
    const { data: clientData } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!clientData) { setLoading(false); return; }

    const since = dateRange === 'all' ? undefined : startOfDay(subDays(new Date(), parseInt(dateRange))).toISOString();

    const [pagesR, analyticsR] = await Promise.all([
      supabase.from('landing_pages').select('id, page_name, page_views').eq('client_id', clientData.id),
      (() => {
        let q = supabase.from('analytics').select('*').eq('client_id', clientData.id);
        if (since) q = q.gte('created_at', since);
        return q.order('created_at', { ascending: true });
      })(),
    ]);

    setPages((pagesR.data ?? []) as PageInfo[]);
    setAnalytics((analyticsR.data ?? []) as AnalyticsRow[]);
    setLoading(false);
  }, [dateRange, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = selectedPage === 'all'
    ? analytics
    : analytics.filter(a => a.landing_page_id === selectedPage);

  const totalViews = filtered.reduce((s, a) => s + (a.page_views ?? 0), 0);
  const totalSubmissions = filtered.reduce((s, a) => s + (a.form_submissions ?? 0), 0);
  const totalClicks = filtered.reduce((s, a) => s + (a.cta_clicks ?? 0), 0);

  // Platform split
  const platformMap: Record<string, number> = {};
  filtered.forEach(a => {
    const p = a.ad_platform || 'direct';
    platformMap[p] = (platformMap[p] || 0) + (a.page_views ?? 0);
  });
  const platformData = Object.entries(platformMap).map(([name, value]) => ({ name, value }));

  // Device split
  const deviceMap: Record<string, number> = {};
  filtered.forEach(a => {
    const d = a.device_type || 'unknown';
    deviceMap[d] = (deviceMap[d] || 0) + (a.page_views ?? 0);
  });
  const deviceData = Object.entries(deviceMap).map(([name, value]) => ({ name, value }));

  // Resolution sources
  const sourceMap: Record<string, number> = {};
  filtered.forEach(a => {
    const s = a.location_source || 'unknown';
    sourceMap[s] = (sourceMap[s] || 0) + 1;
  });
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  // Top cities
  const cityMap: Record<string, number> = {};
  filtered.forEach(a => {
    if (a.city_resolved) {
      cityMap[a.city_resolved] = (cityMap[a.city_resolved] || 0) + (a.page_views ?? 0);
    }
  });
  const cityData = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // Views over time
  const dateMap: Record<string, number> = {};
  filtered.forEach(a => {
    const day = format(new Date(a.created_at), 'MMM d');
    dateMap[day] = (dateMap[day] || 0) + (a.page_views ?? 0);
  });
  const timeData = Object.entries(dateMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <div className="flex gap-2">
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Pages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pages</SelectItem>
              {pages.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.page_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Page Views</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{totalSubmissions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Form Submissions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{totalClicks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">CTA Clicks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{pages.length}</p>
                <p className="text-xs text-muted-foreground">Total Pages</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChartCard title="Page Views Over Time" data={timeData} />
            <PieChartCard title="Traffic by Platform" data={platformData} />
            <PieChartCard title="Traffic by Device" data={deviceData} />
            <BarChartCard title="Location Resolution" data={sourceData} color="#8b5cf6" />
            <BarChartCard title="Top Cities" data={cityData} layout="horizontal" color="#06b6d4" />

            {/* Top Pages Table */}
            <Card>
              <CardHeader><CardTitle className="text-base">Page Performance</CardTitle></CardHeader>
              <CardContent>
                {pages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No pages yet</p>
                ) : (
                  <div className="space-y-3">
                    {pages
                      .sort((a, b) => (b.page_views ?? 0) - (a.page_views ?? 0))
                      .map(p => (
                        <div key={p.id} className="flex items-center justify-between">
                          <span className="text-sm truncate max-w-[60%]">{p.page_name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${Math.min(100, ((p.page_views ?? 0) / Math.max(1, Math.max(...pages.map(x => x.page_views ?? 0)))) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {(p.page_views ?? 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
