import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono, Newsreader } from 'next/font/google';
import { AnalyticsProvider, ThemeProvider } from '@/components/providers';
import { BackgroundAurora } from '@/components/ui/BackgroundAurora';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sathyanantham V | Lead Software Engineer & AI Architect',
  description: 'AI Portfolio Platform of Sathyanantham V — Lead Software Engineer & Frontend Architect with 13+ years experience leading enterprise order management, micro frontends, and AI RAG systems.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${newsreader.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased selection:bg-primary selection:text-primary-foreground min-h-screen relative">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AnalyticsProvider>
            {/* Global Ambient Background Aurora (drifting terracotta radial gradients + grain overlay) */}
            <BackgroundAurora />
            
            {/* Main Application Routes */}
            {children}
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
