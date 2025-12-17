'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, DollarSign, AlertTriangle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    label: 'Live Traces',
    href: '/',
    icon: Activity,
  },
  {
    label: 'Cost',
    href: '/cost',
    icon: DollarSign,
  },
  {
    label: 'Alerts',
    href: '/alerts',
    icon: AlertTriangle,
  },
  {
    label: 'Replay',
    href: '/replay',
    icon: PlayCircle,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r border-[var(--sidebar-border)] border-border bg-card">
      <nav className="flex flex-col p-4 gap-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
