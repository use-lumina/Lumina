'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ReplayDiff } from '@/components/replay/replay-diff';

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

        {/* Diff Comparison */}
        <ReplayDiff replayId={params.id as string} />
      </div>
    </div>
  );
}
