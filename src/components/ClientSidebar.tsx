import { LayoutDashboard, FileText, BarChart3, MessageSquare, Globe, CreditCard, LogOut, Zap } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Overview',        url: '/client',              icon: LayoutDashboard, exact: true  },
  { title: 'My Pages',        url: '/client/pages',        icon: FileText                      },
  { title: 'Analytics',       url: '/client/analytics',    icon: BarChart3                     },
  { title: 'Edit Requests',   url: '/client/edit-requests',icon: MessageSquare                 },
  { title: 'DNS Setup',       url: '/client/dns',          icon: Globe                         },
  { title: 'Billing',         url: '/client/billing',      icon: CreditCard                    },
];

export function ClientSidebar() {
  const { signOut, user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      {/* Brand header */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sidebar-accent-foreground leading-tight truncate">LocalBoost</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email ?? 'Client'}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
                    <NavLink
                      to={item.url}
                      end={item.exact}
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors w-full"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Log out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
