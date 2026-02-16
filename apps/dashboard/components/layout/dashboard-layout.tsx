'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const hideSidebar = pathname.startsWith('/auth');

  return (
    <div className="flex h-screen overflow-hidden">
      {!hideSidebar && <Sidebar />}
      <main className="flex-1 overflow-auto bg-background transition-colors duration-400">
        {children}
      </main>
    </div>
  );
}
