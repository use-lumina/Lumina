'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import logo from '@/assets/images/logo.png';
import { NotificationData, Alert } from '@/types/notification';
import {
  Activity,
  DollarSign,
  AlertTriangle,
  PlayCircle,
  Home,
  Bell,
  User,
  Settings,
  LogOut,
  LogIn,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';
import { logout } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface UserInfo {
  userId: string;
  email: string;
  name: string;
}

const navItems = [
  { label: 'Dashboard', href: '/', icon: Home, badgeKey: null },
  { label: 'Live Traces', href: '/traces', icon: Activity, badgeKey: null },
  { label: 'Alerts', href: '/alerts', icon: AlertTriangle, badgeKey: 'alerts' },
  { label: 'Cost Analysis', href: '/cost', icon: DollarSign, badgeKey: null },
  { label: 'Replay', href: '/replay', icon: PlayCircle, badgeKey: null },
];

function getAlertIcon(alertType: string) {
  switch (alertType) {
    case 'cost_spike':
      return { Icon: DollarSign, color: 'text-amber-500' };
    case 'quality_drop':
      return { Icon: AlertTriangle, color: 'text-red-500' };
    case 'latency_spike':
      return { Icon: Activity, color: 'text-blue-500' };
    default:
      return { Icon: Bell, color: 'text-gray-500' };
  }
}

function formatTimeAgo(timestamp: string) {
  const now = new Date();
  const alertTime = new Date(timestamp);
  const diffMs = now.getTime() - alertTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getAlertTitle(alert: Alert) {
  switch (alert.alert_type) {
    case 'cost_spike':
      return 'Cost spike detected';
    case 'quality_drop':
      return 'Quality score drop';
    case 'latency_spike':
      return 'High latency alert';
    default:
      return 'New alert';
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth state with SWR
  const {
    data: user,
    isLoading: loading,
    mutate: mutateUser,
  } = useSWR<UserInfo | null>(`${API_BASE}/auth/me`, fetcher, {
    refreshInterval: 5 * 60 * 1000,
    shouldRetryOnError: false,
  });

  // Notifications state with SWR
  const { data: notificationData } = useSWR<NotificationData>(
    user ? `${API_BASE}/alerts?status=pending&limit=10` : null,
    fetcher,
    {
      refreshInterval: 30000,
    }
  );

  const notificationCount = notificationData?.pagination?.total || 0;
  const recentAlerts: Alert[] = notificationData?.data || [];

  const handleLogout = async () => {
    try {
      await logout();
      mutateUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/auth';
    }
  };

  return (
    <aside className="w-[220px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
        <div className="relative w-8 h-8">
          <Image src={logo} alt="Lumina AI" fill sizes="32px" priority className="object-contain" />
        </div>
        <span className="ml-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Lumina
        </span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
            const badgeCount = item.badgeKey === 'alerts' ? notificationCount : null;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center h-8 px-2 gap-2 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badgeCount !== null && badgeCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 px-1.5 text-[10px] font-semibold"
                  >
                    {badgeCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-2 space-y-0.5">
        {/* Notifications */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center h-8 w-full px-2 gap-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="relative shrink-0">
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </div>
                <span className="flex-1 text-left">Notifications</span>
                {notificationCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 px-1.5 text-[10px] font-semibold"
                  >
                    {notificationCount}
                  </Badge>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Badge variant="secondary" className="text-xs">
                  {notificationCount} new
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {recentAlerts.length > 0 ? (
                  recentAlerts.map((alert) => {
                    const { Icon: AlertIcon, color } = getAlertIcon(alert.alert_type);
                    const title = getAlertTitle(alert);
                    const timeAgo = formatTimeAgo(alert.timestamp);

                    return (
                      <Link key={alert.alert_id} href={`/alerts/${alert.alert_id}`}>
                        <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                          <div className="flex items-center gap-2 w-full">
                            <AlertIcon className={cn('h-4 w-4', color)} />
                            <span className="font-medium text-sm">{title}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{timeAgo}</span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-6">
                            {alert.reasoning || alert.message || 'No details available'}
                          </p>
                        </DropdownMenuItem>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                )}
              </div>
              {recentAlerts.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Link href="/alerts">
                    <DropdownMenuItem className="text-center justify-center text-sm text-primary cursor-pointer">
                      View all notifications
                    </DropdownMenuItem>
                  </Link>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Settings */}
        {user && (
          <Link href="/settings">
            <button className="flex items-center h-8 w-full px-2 gap-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
              <Settings className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Settings</span>
            </button>
          </Link>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => mounted && setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center h-8 w-full px-2 gap-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1 text-left">
            {mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>

        <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />

        {/* User */}
        {!loading && (
          <>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center h-9 w-full px-2 gap-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shrink-0">
                      <User className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs font-medium leading-none truncate text-slate-900 dark:text-slate-100">
                        {user.name}
                      </div>
                      <div className="text-[10px] leading-none mt-0.5 truncate text-slate-500 dark:text-slate-400">
                        {user.email}
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <button className="flex items-center h-8 w-full px-2 gap-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">Sign In</span>
                </button>
              </Link>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
