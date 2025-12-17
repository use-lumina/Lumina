import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  StatusDot,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Loader2, MoreHorizontal } from 'lucide-react';

export type Trace = {
  id: string;
  service: string;
  endpoint: string;
  model: 'gpt-4' | 'claude-3' | 'gpt-3.5';
  latencyMs: number;
  costUsd: number;
  status: 'healthy' | 'degraded' | 'error';
  createdAt: string;
};

const mockTraces: Trace[] = [
  {
    id: 'tr_01HX9A2F4K',
    service: 'chat-api',
    endpoint: '/chat/message',
    model: 'gpt-4',
    latencyMs: 2150,
    costUsd: 0.044,
    status: 'degraded',
    createdAt: '2025-03-18T21:04:12Z',
  },
  {
    id: 'tr_01HX9A2J9P',
    service: 'search-api',
    endpoint: '/search/query',
    model: 'claude-3',
    latencyMs: 820,
    costUsd: 0.012,
    status: 'healthy',
    createdAt: '2025-03-18T21:04:08Z',
  },
  {
    id: 'tr_01HX9A2NQ3',
    service: 'order-api',
    endpoint: '/checkout',
    model: 'gpt-4',
    latencyMs: 3120,
    costUsd: 0.091,
    status: 'error',
    createdAt: '2025-03-18T21:03:59Z',
  },
  {
    id: 'tr_01HX9A2R1A',
    service: 'chat-api',
    endpoint: '/chat/message',
    model: 'gpt-3.5',
    latencyMs: 640,
    costUsd: 0.004,
    status: 'healthy',
    createdAt: '2025-03-18T21:03:42Z',
  },
  {
    id: 'tr_01HX9A2T8C',
    service: 'support-api',
    endpoint: '/summarize',
    model: 'claude-3',
    latencyMs: 1480,
    costUsd: 0.021,
    status: 'degraded',
    createdAt: '2025-03-18T21:03:31Z',
  },
];

function formatLatency(ms: number) {
  return `${ms} ms`;
}

function formatCost(usd: number) {
  return `$${usd.toFixed(3)}`;
}

function getRowVariant(status: Trace['status']) {
  switch (status) {
    case 'degraded':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return undefined;
  }
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Lumina Dashboard</h1>
        <p className="text-lg text-muted-foreground">AI-powered document intelligence platform</p>
        <Button variant="secondary">Press</Button>

        <Badge variant="destructive">HIGH</Badge>
        <Badge variant="warning">MEDIUM</Badge>
        <Badge variant="muted">LOW</Badge>

        <Badge variant="secondary">GPT-4</Badge>
        <Badge variant="outline">Claude</Badge>
        <Badge variant="muted">Other</Badge>

        <Badge variant="success">Healthy</Badge>
        <Badge variant="warning">Degraded</Badge>
        <Badge variant="destructive">Error</Badge>
        <br />
        <Button variant="soft">Clear filters</Button>
        <Button variant="ghost" size="icon">
          <MoreHorizontal />
        </Button>
        <Button variant="destructive">Acknowledge</Button>
        <Button variant="secondary">View Traces</Button>

        <Button variant="primary">Run Replay</Button>
        <Button variant="secondary">Save Replay Set</Button>
        <Button variant="success">Completed</Button>

        <Button disabled>
          <Loader2 className="animate-spin" />
          Running…
        </Button>
        <br />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Latency</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {mockTraces.map((trace) => (
              <TableRow key={trace.id} data-variant={getRowVariant(trace.status)}>
                {/* Status */}
                <TableCell>
                  <StatusDot status={trace.status} />
                </TableCell>

                {/* Service */}
                <TableCell className="font-medium">{trace.service}</TableCell>

                {/* Endpoint */}
                <TableCell className="font-mono text-neutral-600 dark:text-neutral-400">
                  {trace.endpoint}
                </TableCell>

                {/* Model */}
                <TableCell>
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5">
                    {trace.model}
                  </Badge>
                </TableCell>

                {/* Cost */}
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCost(trace.costUsd)}
                </TableCell>

                {/* Latency */}
                <TableCell
                  className={cn(
                    'text-right font-mono tabular-nums',
                    trace.latencyMs > 3000 && 'text-red-600',
                    trace.latencyMs > 1500 && trace.latencyMs <= 3000 && 'text-amber-600'
                  )}
                >
                  {formatLatency(trace.latencyMs)}
                </TableCell>

                {/* Time */}
                <TableCell className="text-neutral-500">
                  {new Date(trace.createdAt).toLocaleTimeString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
