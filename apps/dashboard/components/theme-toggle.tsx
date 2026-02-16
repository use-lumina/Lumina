'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';
import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <Sun className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
      }}
    >
      {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
