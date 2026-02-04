'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import logo from '@/assets/images/logo.png';
import {
  Activity,
  DollarSign,
  AlertTriangle,
  PlayCircle,
  Home,
  Search,
  Bell,
  HelpCircle,
  FileText,
  Command,
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface UserInfo {
  userId: string;
  email: string;
  name: string;
}

const navItems = [
  { label: 'Dashboard', href: '/', icon: Home, badgeKey: null, section: 0 },
  { label: 'Live Traces', href: '/traces', icon: Activity, badgeKey: null, section: 1 },
  { label: 'Alerts', href: '/alerts', icon: AlertTriangle, badgeKey: 'alerts', section: 1 },
  { label: 'Cost Analysis', href: '/cost', icon: DollarSign, badgeKey: null, section: 2 },
  { label: 'Replay', href: '/replay', icon: PlayCircle, badgeKey: null, section: 2 },
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

function getAlertTitle(alert: any) {
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

// SideLabel now controlled by Framer Motion via parent context or direct variants
// We just pass children here, animations are handled inline where used
function SideLabel({ children, className, isExpanded }: { children: React.ReactNode; className?: string, isExpanded: boolean }) {
  return (
    <motion.span
      initial={{ opacity: 0, x: -10, display: 'none' }}
      animate={{
        opacity: isExpanded ? 1 : 0,
        x: isExpanded ? 0 : -10,
        display: isExpanded ? 'block' : 'none'
      }}
      transition={{ duration: 0.2, delay: isExpanded ? 0.1 : 0 }}
      className={cn(
        'whitespace-nowrap overflow-hidden',
        className
      )}
    >
      {children}
    </motion.span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth state with SWR
  const { data: user, isLoading: loading, mutate: mutateUser } = useSWR<UserInfo>(
    `${API_BASE}/auth/me`,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // Check auth every 5 mins
      shouldRetryOnError: false,
    }
  );

  // Notifications state with SWR
  // Only fetch if user is logged in
  const { data: notificationData } = useSWR(
    user ? `${API_BASE}/alerts?status=pending&limit=10` : null,
    fetcher,
    {
      refreshInterval: 30000, // Poll every 30s
    }
  );

  const notificationCount = notificationData?.pagination?.total || 0;
  const recentAlerts = notificationData?.data || [];

  const handleLogout = async () => {
    try {
      await logout();
      mutateUser(null); // Optimistically update auth state
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/auth';
    }
  };

  // Group nav items by section
  let lastSection = -1;

  return (
    <motion.aside
      initial={{ width: '4rem' }}
      animate={{ width: isHovered ? '15rem' : '4rem' }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group/sidebar overflow-hidden border-r border-(--sidebar-border) bg-sidebar flex flex-col h-full shrink-0 z-50 relative"
    >
      {/* Logo */}
      <div className="flex items-center justify-center py-2 shrink-0 min-h-[4rem]">
        <motion.div
           animate={{
               width: isHovered ? 100 : 32,
               height: isHovered ? 100 : 32
           }}
           transition={{ type: 'spring', stiffness: 300, damping: 25 }}
           className="relative"
        >
          <Image
            src={logo}
            alt="Lumina AI"
            className="object-contain"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        </motion.div>
      </div>

      {/* Search trigger */}
      {user && (
        <div className="px-2 mb-1">
          <button className="flex items-center h-9 w-full px-3.5 gap-3 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors overflow-hidden">
            <Search className="h-4 w-4 shrink-0" />
            <SideLabel isExpanded={isHovered} className="flex-1 text-left text-[13px]">Search</SideLabel>
            <SideLabel isExpanded={isHovered}>
              <kbd className="inline-flex h-4 items-center gap-0.5 rounded border border-(--sidebar-border) bg-sidebar-accent px-1 font-mono text-[10px] text-sidebar-foreground/50">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </SideLabel>
          </button>
        </div>
      )}

      <div className="h-px bg-(--sidebar-border) mx-3" />

      {/* Primary navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href + '/'));
          const badgeCount = item.badgeKey === 'alerts' ? notificationCount : null;
          const showDivider = lastSection >= 0 && item.section !== lastSection;
          lastSection = item.section;

          return (
            <div key={item.href}>
              {showDivider && <div className="h-px bg-(--sidebar-border) mx-2 my-2" />}
              <Link
                href={item.href}
                className={cn(
                  'flex items-center h-9 px-3.5 gap-3 rounded-md text-[13px] font-medium transition-colors overflow-hidden',
                  isActive
                    ? 'bg-sidebar-primary/15 text-sidebar-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <div className="relative shrink-0">
                  <Icon className="h-4 w-4" />
                  {badgeCount !== null && badgeCount > 0 && !isHovered && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive block" />
                  )}
                </div>
                <SideLabel isExpanded={isHovered} className="flex-1">{item.label}</SideLabel>
                {badgeCount !== null && badgeCount > 0 && (
                  <SideLabel isExpanded={isHovered}>
                    <span
                      className={cn(
                        'inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'bg-sidebar-foreground/10 text-sidebar-foreground/70'
                      )}
                    >
                      {badgeCount}
                    </span>
                  </SideLabel>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-(--sidebar-border) py-2 px-2 space-y-0.5 overflow-hidden">
        {/* Notifications */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center h-9 w-full px-3.5 gap-3 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors overflow-hidden">
                <div className="relative shrink-0">
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && !isHovered && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                  )}
                </div>
                <SideLabel isExpanded={isHovered} className="flex-1 text-left text-[13px] font-medium">
                  Notifications
                </SideLabel>
                {notificationCount > 0 && (
                  <SideLabel isExpanded={isHovered}>
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums bg-sidebar-foreground/10 text-sidebar-foreground/70">
                      {notificationCount}
                    </span>
                  </SideLabel>
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
        )}

        {/* Help */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center h-9 w-full px-3.5 gap-3 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors overflow-hidden">
                <HelpCircle className="h-4 w-4 shrink-0" />
                <SideLabel isExpanded={isHovered} className="flex-1 text-left text-[13px] font-medium">Help</SideLabel>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
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
        )}

        {/* Theme toggle */}
        <button
          onClick={() => mounted && setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center h-9 w-full px-3.5 gap-3 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors overflow-hidden"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          <SideLabel isExpanded={isHovered} className="text-[13px] font-medium">
            {mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </SideLabel>
        </button>

        <div className="h-px bg-(--sidebar-border) mx-2 my-1" />

        {/* User */}
        {!loading && (
          <>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center h-9 w-full px-3.5 gap-3 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors overflow-hidden">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-linear-to-br from-blue-500 to-purple-500 shrink-0">
                      <User className="h-3 w-3 text-white" />
                    </div>
                    <SideLabel isExpanded={isHovered} className="flex-1 min-w-0 text-left">
                      <span className="block text-[13px] font-medium leading-none truncate text-sidebar-foreground">
                        {user.name}
                      </span>
                      <span className="block text-[10px] leading-none mt-0.5 truncate text-sidebar-foreground/50">
                        {user.email}
                      </span>
                    </SideLabel>
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
                <button className="flex items-center h-9 w-full px-3.5 gap-3 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors overflow-hidden">
                  <LogIn className="h-4 w-4 shrink-0" />
                  <SideLabel isExpanded={isHovered} className="text-[13px] font-medium">Sign In</SideLabel>
                </button>
              </Link>
            )}
          </>
        )}
      </div>
    </motion.aside>
  );
}
