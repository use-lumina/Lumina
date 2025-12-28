import { notFound } from 'next/navigation';
import { getReplayDetails } from '@/lib/api';
import { ReplayDetail } from '@/components/replay/replay-detail';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Params {
  params: { id: string };
}

export default async function ReplayDetailPage({ params }: Params) {
  const { id } = params;

  try {
    const data = await getReplayDetails(id);

    if (!data || !data.replaySet) {
      return notFound();
    }

    return (
      <div className="h-full overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Back Button */}
          <div className="flex items-center gap-4">
            <Link href="/replay">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Replay Details */}
          <ReplayDetail replaySet={data.replaySet} summary={data.summary} />
        </div>
      </div>
    );
  } catch (err) {
    console.error('Failed to load replay details:', err);
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/replay">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">Replay not found</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Unable to fetch replay details. The replay may not exist or there was an error
                loading it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
