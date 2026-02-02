import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://democracy.watch'),
  title: {
    default: 'Democracy Watch - They Work For You',
    template: '%s | Democracy Watch',
  },
  description: 'Track how your representatives vote vs. what they promised. See voting records, campaign promises, and funding sources.',
  keywords: ['congress', 'voting records', 'accountability', 'democracy', 'campaign finance', 'political transparency'],
  openGraph: {
    title: 'Democracy Watch - They Work For You',
    description: 'Track congressional voting records, compare actions to promises, and see who funds your elected officials.',
    siteName: 'Democracy Watch',
    type: 'website',
    images: ['/logo.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Democracy Watch - They Work For You',
    description: 'Track congressional voting records, compare actions to promises, and see who funds your elected officials.',
    images: ['/logo.webp'],
  },
  icons: {
    icon: '/logo.webp',
    apple: '/logo.webp',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
