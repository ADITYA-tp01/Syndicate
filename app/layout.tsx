import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = Inter({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Syndicate — GraphRAG Fraud Ring Investigator',
  description: 'Rows hide the ring. The graph reveals the ringleader. The AI writes the brief.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} dark`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}