import './globals.css';

export const metadata = {
  title: 'Lumina SDK Test',
  description: 'Testing @uselumina/sdk with Next.js',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
