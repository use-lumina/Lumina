import { cn } from '@/lib/utils';
import type { TraceSpan } from '@/types/trace';

interface SpanTimelineProps {
  spans: TraceSpan[];
  totalDuration: number;
}

const spanTypeColors = {
  retrieval: 'bg-blue-500 dark:bg-blue-400',
  generation: 'bg-purple-500 dark:bg-purple-400',
  processing: 'bg-emerald-500 dark:bg-emerald-400',
};

const spanTypeBgColors = {
  retrieval: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  generation: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  processing: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

export function SpanTimeline({ spans, totalDuration }: SpanTimelineProps) {
  return (
    <div className="space-y-3">
      {/* Timeline visualization */}
      <div className="relative h-8 rounded-md bg-muted">
        {spans.map((span, index) => {
          const leftPercent = (span.startMs / totalDuration) * 100;
          const widthPercent = (span.durationMs / totalDuration) * 100;

          return (
            <div
              key={index}
              className={cn('absolute h-full rounded-sm', spanTypeColors[span.type])}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              title={`${span.name}: ${span.durationMs}ms`}
            />
          );
        })}
      </div>

      {/* Span details list */}
      <div className="space-y-2">
        {spans.map((span, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 ">
              <div className={cn('h-3 w-3 rounded-sm', spanTypeColors[span.type])} />
              <span className="font-medium">{span.name}</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  spanTypeBgColors[span.type]
                )}
              >
                {span.type}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground tabular-nums">{span.durationMs}ms</span>
              <span className="text-muted-foreground tabular-nums w-12 text-right">
                {((span.durationMs / totalDuration) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
