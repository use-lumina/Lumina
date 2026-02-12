'use client';

import { useState, useEffect } from 'react';
import { SkeletonTheme } from 'react-loading-skeleton';
import { useTheme } from '@/components/theme-provider';

export function SkeletonThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use a neutral theme during SSR to match initial client render
  const isDark = mounted ? theme === 'dark' : false;

  return (
    <SkeletonTheme
      baseColor={isDark ? 'oklch(0.269 0 0)' : 'oklch(0.97 0 0)'}
      highlightColor={isDark ? 'oklch(0.371 0 0)' : 'oklch(0.985 0 0)'}
      borderRadius="0.375rem"
    >
      {children}
    </SkeletonTheme>
  );
}
