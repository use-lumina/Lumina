import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Card } from './card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

export function TableSkeleton({ rows = 5, columns = 7 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border border-(--accent) border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton height={16} width={80} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton height={16} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function KPICardSkeleton() {
  return (
    <Card className="p-6 border-(--accent)">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton height={16} width={128} />
          <Skeleton height={36} width={112} />
          <Skeleton height={16} width={144} />
        </div>
        <Skeleton height={48} width={48} borderRadius={8} />
      </div>
    </Card>
  );
}

export function ChartCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={`p-6 border-(--accent) ${className || ''}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton height={20} width={160} />
            <Skeleton height={12} width={192} />
          </div>
          <Skeleton height={36} width={128} />
        </div>
        <Skeleton height={300} />
      </div>
    </Card>
  );
}

export function TraceDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Skeleton height={32} width={160} />
          <Skeleton height={20} width={96} />
        </div>
        <Skeleton height={16} width={256} />
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton height={16} width={64} className="mb-2" />
            <Skeleton height={32} width={80} />
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <Skeleton height={24} width={192} />
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton height={128} />
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton height={40} width={96} />
          <Skeleton height={40} width={96} />
          <Skeleton height={40} width={96} />
        </div>
        <div className="rounded-lg border border-border bg-muted p-6">
          <Skeleton height={160} />
        </div>
      </div>
    </div>
  );
}

export function AlertCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton height={20} width={64} />
            <Skeleton height={20} width={80} />
          </div>
          <Skeleton height={20} width="100%" style={{ maxWidth: '28rem' }} />
          <Skeleton height={16} width={192} />
        </div>
        <Skeleton height={36} width={112} />
      </div>
    </Card>
  );
}
