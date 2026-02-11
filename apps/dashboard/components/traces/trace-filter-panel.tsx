'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronDown, ChevronRight } from 'lucide-react';

interface FilterOption {
  value: string;
  count: number;
}

interface TraceFilterPanelProps {
  visible: boolean;
  onClose: () => void;
  filters: {
    environments: string[];
    traceNames: string[];
    userIds: string[];
    sessionIds: string[];
    tags: string[];
    releases: string[];
    statuses: string[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFiltersChange: (filters: any) => void;
  availableOptions: {
    environments: FilterOption[];
    traceNames: FilterOption[];
    userIds: FilterOption[];
    sessionIds: FilterOption[];
    tags: FilterOption[];
    releases: FilterOption[];
    statuses: FilterOption[];
  };
}

export function TraceFilterPanel({
  visible,
  onClose,
  filters,
  onFiltersChange,
  availableOptions,
}: TraceFilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['environment', 'traceName', 'status', 'release'])
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleCheckboxChange = (
    filterKey: keyof typeof filters,
    value: string,
    checked: boolean
  ) => {
    const currentValues = filters[filterKey] || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter((v) => v !== value);

    onFiltersChange({
      ...filters,
      [filterKey]: newValues,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      environments: [],
      traceNames: [],
      userIds: [],
      sessionIds: [],
      tags: [],
      releases: [],
      statuses: [],
    });
  };

  const hasActiveFilters =
    filters.environments.length > 0 ||
    filters.traceNames.length > 0 ||
    filters.userIds.length > 0 ||
    filters.sessionIds.length > 0 ||
    filters.tags.length > 0 ||
    (filters.releases && filters.releases.length > 0) ||
    (filters.statuses && filters.statuses.length > 0);

  if (!visible) return null;

  const renderSection = (
    id: string,
    title: string,
    options: FilterOption[],
    filterKey: keyof typeof filters
  ) => {
    if (!options || options.length === 0) return null;

    return (
      <div className="border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
        <button
          onClick={() => toggleSection(id)}
          className="flex items-center justify-between w-full py-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded text-left"
        >
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{title}</span>
          {expandedSections.has(id) ? (
            <ChevronDown className="h-3 w-3 text-slate-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-500" />
          )}
        </button>

        {expandedSections.has(id) && (
          <div className="mt-1 space-y-1.5 pl-2">
            {options.map((option) => (
              <div key={option.value} className="flex items-center gap-2 group">
                <Checkbox
                  id={`${id}-${option.value}`}
                  className="h-3.5 w-3.5"
                  checked={filters[filterKey]?.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(filterKey, option.value, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`${id}-${option.value}`}
                  className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer flex-1 truncate flex justify-between items-center"
                >
                  <span className="truncate" title={option.value}>
                    {option.value || '(empty)'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums ml-2">
                    {option.count}
                  </span>
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-[250px] h-full border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Filters</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Sections */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {renderSection('traceName', 'Trace Name', availableOptions.traceNames, 'traceNames')}
          {renderSection('status', 'Status', availableOptions.statuses, 'statuses')}
          {renderSection('release', 'Release', availableOptions.releases, 'releases')}
          {renderSection('userId', 'User ID', availableOptions.userIds, 'userIds')}
          {renderSection('sessionId', 'Session ID', availableOptions.sessionIds, 'sessionIds')}
          {renderSection(
            'environment',
            'Environment',
            availableOptions.environments,
            'environments'
          )}
          {renderSection('tags', 'Tags', availableOptions.tags, 'tags')}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="h-12 flex items-center justify-between px-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs w-full justify-center"
          onClick={clearAllFilters}
          disabled={!hasActiveFilters}
        >
          Clear all filters
        </Button>
      </div>
    </div>
  );
}
