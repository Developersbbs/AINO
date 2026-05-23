import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AINO Real Estate',
  description: 'View project and plot details shared by your agent.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
