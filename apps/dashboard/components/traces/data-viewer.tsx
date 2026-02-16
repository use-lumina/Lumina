'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AlignLeft, Braces } from 'lucide-react';
import { JsonViewer } from './json-viewer';

interface DataViewerProps {
  data: string | object | null | undefined;
  label: string;
  defaultView?: 'formatted' | 'json';
  viewMode?: 'formatted' | 'json'; // Controlled mode
  onViewModeChange?: (mode: 'formatted' | 'json') => void;
}

function FormattedContent({ data }: { data: any }) {
  if (data === null || data === undefined)
    return <span className="text-muted-foreground/60 italic">null</span>;

  if (Array.isArray(data)) {
    // If array of objects, verify if check message list
    const isChatList = data.every(
      (item) => typeof item === 'object' && item !== null && 'role' in item && 'content' in item
    );

    if (isChatList) {
      return (
        <div className="space-y-4">
          {data.map((msg, i) => (
            <div
              key={i}
              className="flex flex-col gap-1 border-l-2 border-slate-200 dark:border-slate-800 pl-3 py-1"
            >
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                {msg.role}
              </span>
              <div className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
                {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="border border-border rounded p-3 bg-card">
            <span className="block text-[10px] uppercase text-muted-foreground/60 mb-1">
              Item {i + 1}
            </span>
            <FormattedContent data={item} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    // Check for chat message format (single)
    if ('role' in data && 'content' in data) {
      return (
        <div className="flex flex-col gap-1 border-l-2 border-primary/50 pl-3 py-1 bg-accent/20 rounded-r">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            {data.role}
          </span>
          <div className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
            {typeof data.content === 'string' ? data.content : JSON.stringify(data.content)}
          </div>
        </div>
      );
    }

    // Generic Object Table
    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm border-t border-border/40 pt-2">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="contents">
            <span className="font-semibold text-muted-foreground/60 text-xs uppercase pt-1 text-right">
              {k}
            </span>
            <div className="min-w-0 pb-1 border-b border-transparent">
              <FormattedContent data={v} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // String / Number / Boolean
  const stringValue = String(data);
  // Check if string is multi-line
  if (stringValue.includes('\n') || stringValue.length > 50) {
    return (
      <div className="whitespace-pre-wrap text-sm text-foreground/90 font-sans bg-muted/40 p-3 rounded border border-border">
        {stringValue}
      </div>
    );
  }

  return (
    <span className="text-sm text-slate-800 dark:text-slate-200 font-sans">{stringValue}</span>
  );
}

export function DataViewer({
  data,
  label,
  defaultView = 'formatted',
  viewMode: controlledViewMode,
  onViewModeChange,
}: DataViewerProps) {
  const [internalView, setInternalView] = useState<'formatted' | 'json'>(defaultView);

  const view = controlledViewMode ?? internalView;
  const setView = (mode: 'formatted' | 'json') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalView(mode);
    }
  };

  if (!data) return null;

  let contentToRender = data;

  // If parsing string JSON
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      // Only switch to object if it looks structured
      if (typeof parsed === 'object' && parsed !== null) {
        contentToRender = parsed;
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</h4>

        {!controlledViewMode && (
          <div className="flex bg-muted rounded p-0.5">
            <button
              onClick={() => setView('formatted')}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                view === 'formatted'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <AlignLeft className="h-3 w-3" />
              Formatted
            </button>
            <button
              onClick={() => setView('json')}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                view === 'json'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <Braces className="h-3 w-3" />
              JSON
            </button>
          </div>
        )}
      </div>

      <div className="rounded-md overflow-hidden transition-all duration-200">
        {view === 'json' ? (
          <div className="bg-muted/20 border border-border rounded-md p-4">
            <JsonViewer data={data} />
          </div>
        ) : (
          <div className="transition-all duration-200">
            <FormattedContent data={contentToRender} />
          </div>
        )}
      </div>
    </div>
  );
}
