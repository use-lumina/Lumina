import type { Metadata } from 'next';
import './globals.css';
import { DashboardLayout } from '@/components/layout';
import { ThemeProvider } from '@/components/theme-provider';
import { SkeletonThemeProvider } from '@/components/ui/skeleton-theme-provider';

export const metadata: Metadata = {
  title: 'Lumina Dashboard',
  description: 'AI-powered document intelligence platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('lumina-ui-theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
                document.documentElement.style.colorScheme = theme;
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme="light" storageKey="lumina-ui-theme">
          <SkeletonThemeProvider>
            <DashboardLayout>{children}</DashboardLayout>
          </SkeletonThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
