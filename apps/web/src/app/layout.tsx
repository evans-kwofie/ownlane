import type { Metadata } from 'next';
import { SmoothScroll } from '@/components/smooth-scroll';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ownlane',
  description: 'Your brand. Your audience. Your business.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
