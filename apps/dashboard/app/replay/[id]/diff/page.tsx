'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ReplayDiffPage() {
  const params = useParams();
  const router = useRouter();

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/replay/${params.id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Side-by-Side Comparison</h1>
            <p className="text-muted-foreground">Replay ID: {params.id}</p>
          </div>
        </div>

        {/* Placeholder content */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-8">
            <h3 className="text-lg font-semibold mb-4">Original</h3>
            <p className="text-muted-foreground">Original response will appear here</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-8">
            <h3 className="text-lg font-semibold mb-4">Replay</h3>
            <p className="text-muted-foreground">Replay response will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
