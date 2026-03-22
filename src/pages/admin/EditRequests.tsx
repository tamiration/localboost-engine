import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type EditRequest = Tables<'edit_requests'> & {
  clients?: { business_name: string } | null;
  landing_pages?: { page_name: string } | null;
  profiles?: { full_name: string | null } | null;
};

export default function AdminEditRequests() {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [clients, setClients] = useState<{ id: string; business_name: string }[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('edit_requests').select('*, clients(business_name), landing_pages(page_name), profiles(full_name)');
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (clientFilter !== 'all') query = query.eq('client_id', clientFilter);
    query = query.order('created_at', { ascending: false });
    const { data } = await query;
    setRequests((data ?? []) as EditRequest[]);
    setLoading(false);
  }, [statusFilter, clientFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => {
    supabase.from('clients').select('id, business_name').order('business_name').then(({ data }) => {
      if (data) setClients(data);
    });
  }, []);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const updateStatus = async (id: string, status: string) => {
    const update: Record<string, unknown> = { status };
    if (status === 'done') update.completed_at = new Date().toISOString();
    await supabase.from('edit_requests').update(update).eq('id', id);
    toast({ title: status === 'done' ? '✅ Request marked complete' : `Status updated to ${status}` });
    fetchRequests();
  };

  const saveNote = async (id: string) => {
    await supabase.from('edit_requests').update({ admin_notes: notes[id] ?? '' }).eq('id', id);
    toast({ title: 'Note saved' });
  };

  const statusColor = (s: string | null) => {
    if (s === 'pending') return 'text-yellow-400';
    if (s === 'in_progress') return 'text-blue-400';
    if (s === 'done') return 'text-green-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Edit Requests</h1>
          {pendingCount > 0 && <Badge className="bg-yellow-500/20 text-yellow-400">{pendingCount} pending</Badge>}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {['all', 'pending', 'in_progress', 'done'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)} className="capitalize text-xs">
            {s === 'pending' ? '🔴 Pending' : s === 'in_progress' ? '🟡 In Progress' : s === 'done' ? '🟢 Completed' : 'All'}
          </Button>
        ))}
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : requests.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">🎉 No pending edit requests! All caught up.</CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Landing Page</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Requested By</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map(r => (
              <>
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                  <TableCell className="font-medium">{r.clients?.business_name ?? '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{r.landing_pages?.page_name ?? '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.edit_description.slice(0, 80)}{r.edit_description.length > 80 ? '...' : ''}</TableCell>
                  <TableCell><Badge variant="outline" className={cn('text-xs', statusColor(r.status))}>{r.status}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.profiles?.full_name ?? '-'}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      {r.status === 'pending' && <Button variant="outline" size="sm" onClick={() => updateStatus(r.id, 'in_progress')}>Start</Button>}
                      {r.status !== 'done' && <Button variant="outline" size="sm" onClick={() => updateStatus(r.id, 'done')}>Complete</Button>}
                    </div>
                  </TableCell>
                </TableRow>
                {expanded === r.id && (
                  <TableRow key={`${r.id}-exp`}>
                    <TableCell colSpan={7}>
                      <div className="p-4 bg-secondary/30 rounded-md space-y-3">
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">Full Description</p>
                          <p className="text-sm text-muted-foreground">{r.edit_description}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">Admin Notes</p>
                          <Textarea value={notes[r.id] ?? r.admin_notes ?? ''} onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))} rows={3} />
                          <Button size="sm" className="mt-2" onClick={() => saveNote(r.id)}>Save Note</Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
