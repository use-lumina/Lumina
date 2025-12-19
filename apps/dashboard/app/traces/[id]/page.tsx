'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TraceDetailPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect to traces page with traceId parameter to auto-open drawer
    router.replace(`/traces?traceId=${params.id}`);
  }, [params.id, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading trace details...</p>
      </div>
    </div>
  );
}
