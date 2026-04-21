import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Search, Plus, ShieldCheck, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type AppRole = 'admin' | 'client';

interface UserRow {
  user_id: string;
  role: AppRole;
  created_at: string;
  // joined from clients
  email: string | null;
  business_name: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [saving, setSaving] = useState<string | null>(null);

  // Add user dialog
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<AppRole>('client');
  const [addLoading, setAddLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    // Fetch all user_roles, then enrich with client email if available
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading users', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Enrich with client email/business_name by matching user_id
    const { data: clients } = await supabase
      .from('clients')
      .select('user_id, email, business_name');

    const clientMap = new Map(
      (clients ?? []).filter(c => c.user_id).map(c => [c.user_id!, c])
    );

    const enriched: UserRow[] = (roles ?? []).map(r => {
      const client = clientMap.get(r.user_id);
      return {
        user_id: r.user_id,
        role: r.role as AppRole,
        created_at: r.created_at,
        email: client?.email ?? null,
        business_name: client?.business_name ?? null,
      };
    });

    setUsers(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeRole = async (userId: string, newRole: AppRole) => {
    setSaving(userId);
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Role updated to ${newRole}` });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
    }
    setSaving(null);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Remove this user\'s access? They will be sent to the waiting screen on next login.')) return;
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (error) {
      toast({ title: 'Failed to remove user', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'User access removed' });
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    }
  };

  const handleAddUser = async () => {
    if (!addEmail.trim()) return;
    setAddLoading(true);

    // Look up user_id from clients table by email
    const { data: clientMatch } = await supabase
      .from('clients')
      .select('user_id, email, business_name')
      .eq('email', addEmail.trim().toLowerCase())
      .single();

    if (!clientMatch?.user_id) {
      toast({
        title: 'User not found',
        description: 'No account with that email exists. They must sign up via /onboarding first.',
        variant: 'destructive',
      });
      setAddLoading(false);
      return;
    }

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', clientMatch.user_id)
      .single();

    if (existingRole) {
      // Update existing
      const { error } = await supabase
        .from('user_roles')
        .update({ role: addRole })
        .eq('user_id', clientMatch.user_id);
      if (error) {
        toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
        setAddLoading(false);
        return;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: clientMatch.user_id, role: addRole });
      if (error) {
        toast({ title: 'Failed to assign role', description: error.message, variant: 'destructive' });
        setAddLoading(false);
        return;
      }
    }

    toast({ title: `Role "${addRole}" assigned to ${addEmail}` });
    setShowAdd(false);
    setAddEmail('');
    setAddRole('client');
    fetchUsers();
    setAddLoading(false);
  };

  const filtered = users.filter(u => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      !search ||
      (u.email?.toLowerCase().includes(search.toLowerCase())) ||
      (u.business_name?.toLowerCase().includes(search.toLowerCase())) ||
      u.user_id.includes(search);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Assign Role
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or business..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'admin', 'client'] as const).map(r => (
            <Button
              key={r}
              variant={roleFilter === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter(r)}
              className="capitalize"
            >
              {r === 'admin' && <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
              {r === 'client' && <User className="h-3.5 w-3.5 mr-1" />}
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No users found. Use "Assign Role" to grant access to a registered user.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.user_id}>
                <TableCell>
                  <div className="text-sm font-medium">{u.email ?? <span className="text-muted-foreground italic">No email linked</span>}</div>
                  <div className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}…</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.business_name ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={u.role === 'admin'
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                      : 'border-green-500/40 bg-green-500/10 text-green-400'
                    }
                  >
                    {u.role === 'admin' ? <ShieldCheck className="h-3 w-3 mr-1 inline" /> : <User className="h-3 w-3 mr-1 inline" />}
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={u.role}
                      onValueChange={(val) => changeRole(u.user_id, val as AppRole)}
                      disabled={saving === u.user_id}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 px-2 text-xs"
                      onClick={() => deleteUser(u.user_id)}
                    >
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add / Assign Role Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-email">User Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">The user must have signed up via /onboarding first.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={addRole} onValueChange={val => setAddRole(val as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-400" />
                      Admin — full dashboard access
                    </div>
                  </SelectItem>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-green-400" />
                      Client — client dashboard only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={addLoading || !addEmail.trim()}>
              {addLoading ? 'Assigning...' : 'Assign Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
