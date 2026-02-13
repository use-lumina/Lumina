'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  SlidersHorizontal,
  Clock,
  Columns3,
  BookmarkPlus,
  ChevronDown,
  Trash2,
  Plus,
} from 'lucide-react';

interface TraceTableToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  environment: string;
  onEnvironmentChange: (value: string) => void;
  onToggleFilters: () => void;
  filtersVisible: boolean;
  availableEnvironments?: string[];
  selectedCount?: number;
  onDeleteSelected?: () => void;
  onAddToQueue?: () => void;
}

export function TraceTableToolbar({
  searchQuery,
  onSearchChange,
  timeRange,
  onTimeRangeChange,
  environment,
  onEnvironmentChange,
  onToggleFilters,
  filtersVisible,
  availableEnvironments = [],
  selectedCount = 0,
  onDeleteSelected,
  onAddToQueue,
}: TraceTableToolbarProps) {
  return (
    <div className="h-12 border-b border-border bg-card flex items-center gap-2 px-4 shadow-sm">
      {/* Actions Dropdown - Shows when rows are selected */}
      {selectedCount > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="h-9">
              Actions
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onDeleteSelected} className="text-red-600 dark:text-red-400">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Traces
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddToQueue}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Annotation Queue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
        <Input
          placeholder="Search IDs / Names..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 bg-accent/30 border-border"
        />
      </div>

      {/* Filter Toggle */}
      <Button
        variant={filtersVisible ? 'default' : 'secondary'}
        size="sm"
        onClick={onToggleFilters}
        className="h-9"
      >
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        Filters
      </Button>

      {/* Time Range */}
      <Select value={timeRange} onValueChange={onTimeRangeChange}>
        <SelectTrigger className="w-[140px] h-9">
          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1h">Last hour</SelectItem>
          <SelectItem value="24h">Last 24 hours</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>

      {/* Environment - Dynamic from actual data */}
      {availableEnvironments.length > 0 && (
        <Select value={environment} onValueChange={onEnvironmentChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            {availableEnvironments.map((env) => (
              <SelectItem key={env} value={env}>
                {env.charAt(0).toUpperCase() + env.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Column Selector */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" className="h-9">
            <Columns3 className="h-4 w-4 mr-2" />
            Columns
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48" align="end">
          <div className="text-xs font-medium mb-2">Toggle columns</div>
          <div className="text-xs text-muted-foreground">Column customization coming soon</div>
        </PopoverContent>
      </Popover>

      {/* Save View */}
      <Button variant="secondary" size="sm" className="h-9">
        <BookmarkPlus className="h-4 w-4 mr-2" />
        Save View
      </Button>
    </div>
  );
}
