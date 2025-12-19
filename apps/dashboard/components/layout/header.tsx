import { Search, Clock, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  return (
    <header className="h-14 border-b border-(--sidebar-border) border-border bg-card flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Left: Branding and breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-foreground">Lumina</span>
        <span className="text-muted-foreground">▸</span>
        <span className="text-muted-foreground">Dashboard</span>
      </div>

      {/* Right: Action icons */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Clock className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
