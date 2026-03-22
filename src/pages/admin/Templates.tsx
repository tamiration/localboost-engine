import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';

const VERTICALS = [
  { id: 'garage_door', label: '🚪 Garage Door', color: '#3b82f6', bg: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'chimney', label: '🏠 Chimney', color: '#ef4444', bg: 'bg-red-500/10 border-red-500/30' },
  { id: 'locksmith', label: '🔐 Locksmith', color: '#f59e0b', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  { id: 'dryer_vent', label: '🌀 Dryer Vent', color: '#14b8a6', bg: 'bg-teal-500/10 border-teal-500/30' },
];

export default function AdminTemplates() {
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<(Tables<'landing_pages'> & { clients: { business_name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const counts: Record<string, number> = {};
      for (const v of VERTICALS) {
        const { count } = await supabase.from('landing_pages').select('id', { count: 'exact', head: true }).eq('template_type', v.id);
        counts[v.id] = count ?? 0;
      }
      setPageCounts(counts);
      setLoading(false);
    })();
  }, []);

  const handleSelect = async (verticalId: string) => {
    setSelected(verticalId);
    const { data } = await supabase.from('landing_pages').select('*, clients(business_name)').eq('template_type', verticalId).order('created_at', { ascending: false });
    setSelectedPages((data ?? []) as typeof selectedPages);
  };

  if (loading) return <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}</div>;

  const selectedVertical = VERTICALS.find(v => v.id === selected);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Templates</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {VERTICALS.map(v => (
          <Card key={v.id} className={`border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${v.bg} ${selected === v.id ? 'ring-2 ring-primary' : ''}`} onClick={() => handleSelect(v.id)}>
            <CardContent className="pt-6 space-y-3">
              <p className="text-3xl">{v.label.split(' ')[0]}</p>
              <p className="text-lg font-semibold text-foreground">{v.label.split(' ').slice(1).join(' ')}</p>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: v.color }} />
                <span className="text-xs text-muted-foreground">Color scheme</span>
              </div>
              <Badge variant="outline" className="text-xs">{pageCounts[v.id] ?? 0} pages using this</Badge>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleSelect(v.id); }}>View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedVertical && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedVertical.label} Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Default Headline</p>
                <p className="font-medium">{'{service}'} in {'{city}'}, {'{state_abbr}'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Default Subheadline</p>
                <p className="font-medium">Professional services you can trust</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Color Scheme</p>
                <div className="flex gap-2 items-center">
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: selectedVertical.color }} />
                  <span>{selectedVertical.color}</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Active Pages</p>
                <p className="font-medium">{pageCounts[selectedVertical.id] ?? 0}</p>
              </div>
            </div>

            {selectedPages.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Pages using this template:</p>
                <div className="space-y-1">
                  {selectedPages.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                      <span>{p.page_name}</span>
                      <span className="text-muted-foreground">{p.clients?.business_name ?? '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-yellow-400">
              Template editor coming in Phase 2. Contact support to customize templates.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
