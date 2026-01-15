'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  DollarSign,
  AlertTriangle,
  PlayCircle,
  Zap,
  BarChart3,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

const menuSections = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: Home,
        badgeKey: null,
      },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      {
        label: 'Live Traces',
        href: '/traces',
        icon: Activity,
        badgeKey: null,
      },
      {
        label: 'Alerts',
        href: '/alerts',
        icon: AlertTriangle,
        badgeKey: 'alerts',
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        label: 'Cost Analysis',
        href: '/cost',
        icon: DollarSign,
        badgeKey: null,
      },
      {
        label: 'Replay',
        href: '/replay',
        icon: PlayCircle,
        badgeKey: null,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({
    alerts: 0,
  });

  // Fetch badge counts
  useEffect(() => {
    const fetchBadgeCounts = async () => {
      try {
        // Fetch pending alerts count
        const res = await fetch(`${API_BASE}/alerts?status=pending&limit=1`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setBadgeCounts({
            alerts: data.pagination?.total || 0,
          });
        }
      } catch (e) {
        console.error('Failed to fetch badge counts:', e);
      }
    };

    fetchBadgeCounts();

    // Update badge counts every 30 seconds
    const interval = setInterval(fetchBadgeCounts, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-64 border-r border-(--border) bg-card flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="px-6 py-5 border-b border-(--border)">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-lg bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-card" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-foreground">Lumina AI</h2>
            <p className="text-xs text-muted-foreground">Observability Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              {/* Section Header */}
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>

              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href + '/'));
                  const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : null;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out',
                        isActive
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full" />
                      )}

                      {/* Icon with background */}
                      <div
                        className={cn(
                          'flex items-center justify-center h-8 w-8 rounded-md transition-colors duration-200',
                          isActive
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Label */}
                      <span className="flex-1">{item.label}</span>

                      {/* Badge */}
                      {badgeCount !== null && badgeCount > 0 && (
                        <Badge
                          variant={isActive ? 'default' : 'secondary'}
                          className={cn(
                            'h-5 min-w-5 px-1.5 text-xs font-semibold tabular-nums',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted-foreground/20'
                          )}
                        >
                          {badgeCount}
                        </Badge>
                      )}

                      {/* Hover indicator */}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          <div className="absolute inset-0 rounded-lg bg-linear-to-r from-transparent via-muted/30 to-transparent" />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="px-6 py-4 border-t border-(--border)">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
          <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">System Status</p>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </div>
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>
    </aside>
  );
}
