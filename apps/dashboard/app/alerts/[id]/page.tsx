'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/alerts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Alert Details</h1>
            <p className="text-muted-foreground">Alert ID: {params.id}</p>
          </div>
        </div>

        {/* Placeholder content */}
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Alert detail view coming soon</p>
        </div>
      </div>
    </div>
  );
}
