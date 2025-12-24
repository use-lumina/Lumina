'use client';

import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Sidebar } from './sidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const hideSidebar = pathname.startsWith('/auth');

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header />

      {/* Main content area with optional sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {!hideSidebar && <Sidebar />}

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
