import type { Metadata } from 'next';
import { Crimson_Text } from 'next/font/google';
import './globals.css';

const crimson = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'roseglass.chat — Cognitive Mirror Interface',
  description: 'Real-time Rose Glass perception tracking for complex decision-making conversations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={crimson.className}>
      <body>{children}</body>
    </html>
  );
}
