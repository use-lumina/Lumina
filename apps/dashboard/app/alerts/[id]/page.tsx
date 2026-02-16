import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { AlertDetail } from '@/components/alerts/alert-detail';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

type Params = {
  params: { id: string };
};

export default async function AlertDetailPage({ params }: Params) {
  const { id } = params;

  try {
    // Get cookie from server-side request
    const cookieStore = await cookies();
    const token = cookieStore.get('lumina_token')?.value;

    // Fetch alert with authentication
    const response = await fetch(`${API_BASE_URL}/alerts/${id}`, {
      headers: {
        ...(token ? { Cookie: `lumina_token=${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch alert: ${response.statusText}`);
    }

    const alert = await response.json();

    if (!alert) {
      return notFound();
    }

    return (
      <div className="h-full overflow-auto bg-background">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Back Button */}
          <div className="flex items-center gap-4">
            <Link href="/alerts">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-accent/50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="h-4 w-px bg-border/40 mx-2" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Alert Detail
            </span>
          </div>

          {/* Alert Details */}
          <AlertDetail alert={alert} />
        </div>
      </div>
    );
  } catch (err) {
    console.error('Failed to load alert:', err);
    return (
      <div className="h-full overflow-auto bg-background">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/alerts">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-accent/50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 bg-card/20 rounded-lg border border-border/50 border-dashed">
            <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center shadow-inner ring-1 ring-border/50">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-foreground tracking-tight">Alert not found</h2>
              <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto uppercase font-bold tracking-tighter">
                Unable to fetch alert details. The alert may not exist or there was an error loading
                it.
              </p>
            </div>
            <Link href="/alerts">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 font-bold uppercase tracking-wide border-border/50 hover:bg-accent hover:text-accent-foreground transition-all"
              >
                Back to Alerts
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
