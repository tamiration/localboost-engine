import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, Users, FileText, Layers, BarChart3, MessageSquare, Settings,
  Globe, CreditCard, LogOut, MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const adminItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Clients', url: '/admin/clients', icon: Users },
  { title: 'Pages', url: '/admin/landing-pages', icon: FileText },
  { title: 'More', url: '#more', icon: MoreHorizontal },
];

const adminMoreItems = [
  { title: 'Templates', url: '/admin/templates', icon: Layers },
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
  { title: 'Edit Requests', url: '/admin/edit-requests', icon: MessageSquare },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

const clientItems = [
  { title: 'Pages', url: '/client', icon: FileText },
  { title: 'Analytics', url: '/client/analytics', icon: BarChart3 },
  { title: 'Requests', url: '/client/edit-requests', icon: MessageSquare },
  { title: 'More', url: '#more', icon: MoreHorizontal },
];

const clientMoreItems = [
  { title: 'DNS Setup', url: '/client/dns-setup', icon: Globe },
  { title: 'Billing', url: '/client/billing', icon: CreditCard },
];

export function MobileNav() {
  const { role, signOut } = useAuth();
  const items = role === 'admin' ? adminItems : clientItems;
  const moreItems = role === 'admin' ? adminMoreItems : clientMoreItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
      <div className="flex items-center justify-around py-2">
        {items.map((item) =>
          item.url === '#more' ? (
            <DropdownMenu key="more">
              <DropdownMenuTrigger className="flex flex-col items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mb-2">
                {moreItems.map((mi) => (
                  <DropdownMenuItem key={mi.title} asChild>
                    <NavLink to={mi.url} className="flex items-center gap-2" activeClassName="text-primary">
                      <mi.icon className="h-4 w-4" />
                      {mi.title}
                    </NavLink>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === '/admin' || item.url === '/client'}
              className="flex flex-col items-center gap-1 px-2 py-1 text-xs text-muted-foreground"
              activeClassName="text-primary"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
}
