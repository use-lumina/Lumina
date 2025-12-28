'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  LogIn,
  ChevronRight,
  Command,
  HelpCircle,
  FileText,
  Activity,
  DollarSign,
  AlertTriangle,
  PlayCircle,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface UserInfo {
  userId: string;
  email: string;
  name: string;
}

// Route metadata for breadcrumbs
const routeMetadata: Record<string, { title: string; icon: any }> = {
  '/': { title: 'Dashboard', icon: Home },
  '/traces': { title: 'Live Traces', icon: Activity },
  '/cost': { title: 'Cost Analysis', icon: DollarSign },
  '/alerts': { title: 'Alerts', icon: AlertTriangle },
  '/replay': { title: 'Replay', icon: PlayCircle },
};

export function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationCount, setNotificationCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  // Helper function to get icon and color for alert type
  const getAlertIcon = (alertType: string) => {
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
  };

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: string) => {
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
  };

  // Helper function to get alert title
  const getAlertTitle = (alert: any) => {
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
  };

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        setUser({
          userId: data.userId,
          email: data.email,
          name: data.name || data.email,
        });
      } else {
        // Auth check failed - user is not authenticated
        setUser(null);
      }
    } catch (e) {
      console.error('Auth check failed:', e);
      setUser(null);
      // Don't redirect on network errors, only on auth failures
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Re-check auth when window regains focus
    const handleFocus = () => checkAuth();
    window.addEventListener('focus', handleFocus);

    // Re-check auth periodically (every 5 minutes to avoid excessive calls)
    const interval = setInterval(checkAuth, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [checkAuth]);

  // Fetch notifications when user is authenticated
  useEffect(() => {
    if (!user) {
      setNotificationCount(0);
      setRecentAlerts([]);
      return;
    }

    const fetchNotifications = async () => {
      try {
        // Fetch recent pending alerts as notifications
        const res = await fetch(`${API_BASE}/alerts?status=pending&limit=10`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setNotificationCount(data.pagination?.total || 0);
          setRecentAlerts(data.data || []);
        }
      } catch (e) {
        console.error('Failed to fetch notifications:', e);
      }
    };

    fetchNotifications();

    // Update notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      // logout() already handles redirect
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect anyway
      window.location.href = '/auth';
    }
  };

  // Get current route metadata
  const currentRoute = routeMetadata[pathname] || routeMetadata['/'];
  const RouteIcon = currentRoute.icon;

  // Format time
  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <header className="h-16 border-b border-(--border) bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
      {/* Left: Logo and Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <span className="text-white font-bold text-sm">L</span>
          </div>
        </Link>

        {/* Only show breadcrumb when logged in */}
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50">
              <RouteIcon className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">{currentRoute.title}</span>
            </div>
          </div>
        )}
      </div>

      {/* Center: Search Bar - Only when logged in */}
      {user && (
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <Button
            variant="default"
            className="w-full justify-start text-sm text-muted-foreground h-9 px-3 gap-2 hover:bg-muted"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search traces, alerts...</span>
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-(--border) bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Dashboard actions - Only when logged in */}
        {user && (
          <>
            {/* Mobile search */}
            <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
              <Search className="h-4 w-4" />
            </Button>

            {/* Time Display */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 text-xs font-medium text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              {timeString} UTC
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-(--background)">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  <Badge variant="secondary" className="text-xs">
                    {notificationCount} new
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-100 overflow-y-auto">
                  {recentAlerts.length > 0 ? (
                    recentAlerts.map((alert) => {
                      const { Icon, color } = getAlertIcon(alert.alert_type);
                      const title = getAlertTitle(alert);
                      const timeAgo = formatTimeAgo(alert.timestamp);

                      return (
                        <Link key={alert.alert_id} href={`/alerts/${alert.alert_id}`}>
                          <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                            <div className="flex items-center gap-2 w-full">
                              <Icon className={cn('h-4 w-4', color)} />
                              <span className="font-medium text-sm">{title}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {timeAgo}
                              </span>
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

            {/* Help */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Help & Resources</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Command className="mr-2 h-4 w-4" />
                  Keyboard Shortcuts
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Activity className="mr-2 h-4 w-4" />
                  API Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-6 bg-border mx-1" />
          </>
        )}

        {/* Theme Toggle - Always visible */}
        <ThemeToggle />

        {/* User Menu */}
        {!loading && (
          <>
            {user && <div className="w-px h-6 bg-border mx-1" />}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2 hover:bg-muted">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-linear-to-br from-blue-500 to-purple-500">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-xs font-medium leading-none">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                        {user.email}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                <Button variant="default" size="sm" className="h-9 gap-2">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}
