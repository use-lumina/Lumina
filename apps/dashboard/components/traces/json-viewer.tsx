'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JsonViewerProps {
  data: any;
  initialExpanded?: boolean;
}

export function JsonViewer({ data, initialExpanded = true }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg border border-border bg-slate-950 text-slate-50 font-mono text-xs overflow-hidden">
      <div className="absolute right-2 top-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-slate-800 text-slate-400"
          onClick={copyToClipboard}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
        <JsonNode keyName="root" value={data} isLast={true} initialExpanded={initialExpanded} />
      </div>
    </div>
  );
}

function JsonNode({
  keyName,
  value,
  isLast,
  initialExpanded,
  depth = 0,
}: {
  keyName: string;
  value: any;
  isLast: boolean;
  initialExpanded: boolean;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(initialExpanded || depth < 2); // Auto-expand top levels
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isEmpty = isObject && Object.keys(value).length === 0;

  if (!isObject) {
    return (
      <div className="pl-4 leading-6 hover:bg-slate-900/50 rounded-sm">
        <span className="text-sky-400">{keyName && `"${keyName}": `}</span>
        <span
          className={cn(
            typeof value === 'string'
              ? 'text-emerald-400'
              : typeof value === 'number'
                ? 'text-amber-400'
                : typeof value === 'boolean'
                  ? 'text-purple-400'
                  : 'text-slate-400'
          )}
        >
          {JSON.stringify(value)}
        </span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="pl-4 leading-6 hover:bg-slate-900/50 rounded-sm">
        <span className="text-sky-400">{keyName && `"${keyName}": `}</span>
        <span className="text-slate-400">{isArray ? '[]' : '{}'}</span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  return (
    <div className="pl-4">
      <div
        className="flex items-center gap-1 leading-6 cursor-pointer hover:bg-slate-900/50 rounded-sm -ml-4 pl-4"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
      >
        <span className="text-slate-500 w-3 flex justify-center transform transition-transform duration-100">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
        <span className="text-sky-400">{keyName && `"${keyName}": `}</span>
        <span className="text-slate-400">{isArray ? '[' : '{'}</span>
        {!expanded && (
          <span className="text-slate-600 text-[10px] ml-2">
            {isArray ? `${value.length} items` : '...'}
          </span>
        )}
        {!expanded && (
          <span className="text-slate-400">
            {isArray ? ']' : '}'}
            {!isLast && ','}
          </span>
        )}
      </div>

      {expanded && (
        <div className="border-l border-slate-800 ml-1.5 pl-2">
          {Object.entries(value).map(([k, v], i, arr) => (
            <JsonNode
              key={k}
              keyName={isArray ? '' : k}
              value={v}
              isLast={i === arr.length - 1}
              initialExpanded={false}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {expanded && (
        <div className="pl-4 leading-6 hover:bg-slate-900/50 rounded-sm">
          <span className="text-slate-400">{isArray ? ']' : '}'}</span>
          {!isLast && <span className="text-slate-500">,</span>}
        </div>
      )}
    </div>
  );
}
