import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Plus, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface EditRequest {
  id: string;
  edit_description: string;
  status: string | null;
  admin_notes: string | null;
  created_at: string;
  completed_at: string | null;
  landing_page_id: string | null;
  landing_pages: { page_name: string } | null;
}

interface PageOption {
  id: string;
  page_name: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-red-500/20 text-red-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-green-500/20 text-green-400',
};

const statusLabels: Record<string, string> = {
  pending: '🔴 Pending',
  in_progress: '🟡 In Progress',
  completed: '🟢 Completed',
};

export default function ClientEditRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newPageId, setNewPageId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [reqR, pagesR] = await Promise.all([
      supabase
        .from('edit_requests')
        .select('id, edit_description, status, admin_notes, created_at, completed_at, landing_page_id, landing_pages(page_name)')
        .order('created_at', { ascending: false }),
      supabase.from('landing_pages').select('id, page_name'),
    ]);
    setRequests((reqR.data ?? []) as unknown as EditRequest[]);
    setPages((pagesR.data ?? []) as PageOption[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!newDesc.trim()) {
      toast({ title: 'Error', description: 'Please describe your edit request.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    // Get client_id from profile
    const { data: clientIdData } = await supabase.rpc('get_my_client_id');
    if (!clientIdData) {
      toast({ title: 'Error', description: 'Could not determine your client account.', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from('edit_requests').insert({
      client_id: clientIdData,
      edit_description: newDesc.trim(),
      landing_page_id: newPageId || null,
      requested_by: user?.id ?? null,
      status: 'pending',
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to submit request.', variant: 'destructive' });
    } else {
      toast({ title: 'Request Submitted', description: 'Your edit request has been sent to the admin team.' });
      setNewDesc('');
      setNewPageId('');
      setDialogOpen(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Edit Requests</h1>
          {pendingCount > 0 && (
            <Badge className="bg-red-500/20 text-red-400">{pendingCount} pending</Badge>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Edit Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Landing Page (optional)</Label>
                <Select value={newPageId} onValueChange={setNewPageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">General Request</SelectItem>
                    {pages.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.page_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>What changes do you need?</Label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe the changes you'd like made to your landing page..."
                  rows={5}
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'in_progress', 'completed'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : statusLabels[f] ?? f}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {filter === 'all'
                  ? 'No edit requests yet. Submit one above!'
                  : `No ${filter.replace('_', ' ')} requests.`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Submitted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(req => (
                  <>
                    <TableRow key={req.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                      <TableCell className="text-sm">
                        {req.landing_pages?.page_name ?? 'General'}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="text-sm truncate block">{req.edit_description.slice(0, 80)}{req.edit_description.length > 80 ? '...' : ''}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[req.status ?? 'pending']}>
                          {statusLabels[req.status ?? 'pending'] ?? req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {expandedId === req.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </TableCell>
                    </TableRow>
                    {expandedId === req.id && (
                      <TableRow key={`${req.id}-detail`}>
                        <TableCell colSpan={5}>
                          <div className="p-4 space-y-3 bg-secondary/30 rounded-lg">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Full Description</p>
                              <p className="text-sm">{req.edit_description}</p>
                            </div>
                            {req.admin_notes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Admin Notes</p>
                                <p className="text-sm text-primary">{req.admin_notes}</p>
                              </div>
                            )}
                            {req.completed_at && (
                              <p className="text-xs text-muted-foreground">
                                Completed {formatDistanceToNow(new Date(req.completed_at), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
