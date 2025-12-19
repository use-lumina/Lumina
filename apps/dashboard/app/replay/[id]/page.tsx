'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, GitCompare } from 'lucide-react';

export default function ReplayDetailPage() {
  const params = useParams();
  const router = useRouter();

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/replay')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Replay Execution</h1>
            <p className="text-muted-foreground">Replay ID: {params.id}</p>
          </div>
          <Button onClick={() => router.push(`/replay/${params.id}/diff`)}>
            <GitCompare className="h-4 w-4 mr-2" />
            View Diff
          </Button>
        </div>

        {/* Placeholder content */}
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Replay execution view coming soon</p>
        </div>
      </div>
    </div>
  );
}
