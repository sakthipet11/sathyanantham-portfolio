import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sathyanantham V — Lead Software Engineer & AI Architect',
  description:
    'Senior AI-Enabled Full-Stack Engineer & Frontend Architect with 13+ years building Nextuple Order Management Systems, Bayer 30+ global digital platforms, Kohl’s high-scale e-commerce, and OpenRouter RAG AI Agent architectures.',
  keywords: [
    'Sathyanantham V',
    'AI Engineer',
    'Lead Software Engineer',
    'Frontend Architect',
    'Next.js 15',
    'React 19',
    'Python FastAPI',
    'RAG',
    'OpenRouter',
    'Micro Frontends',
  ],
  authors: [{ name: 'Sathyanantham V' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} dark scroll-smooth`}
    >
      <body className="bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950 min-h-screen">
        {children}
      </body>
    </html>
  );
}
