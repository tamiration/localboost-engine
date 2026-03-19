import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/ClientSidebar';
import { MobileNav } from '@/components/MobileNav';

export default function ClientLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <ClientSidebar />
        </div>
        <div className="flex-1 flex flex-col">
          <header className="hidden md:flex h-14 items-center border-b border-border px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6 pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
