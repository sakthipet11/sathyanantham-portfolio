'use client';

import Link from 'next/link';
import { BarChart3, ArrowLeft, TrendingUp, Eye, Download, MessageSquare } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AdminAnalyticsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans transition-colors duration-300">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Deep Portfolio & Digital Twin Analytics
            </h1>
            <p className="text-xs text-muted-foreground font-mono">Visitor activity, recruiter conversion, and AI chat stats</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
            <span>Portfolio Views</span>
            <Eye className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 font-mono">1,240</div>
          <div className="text-xs text-emerald-500 mt-1 flex items-center gap-1 font-mono">
            <TrendingUp className="w-3.5 h-3.5" /> +18.4% this month
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
            <span>Resume Downloads</span>
            <Download className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 font-mono">184</div>
          <div className="text-xs text-muted-foreground mt-1 font-mono">High Recruiter Conversion</div>
        </div>

        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
            <span>AI Twin Conversations</span>
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 font-mono">64</div>
          <div className="text-xs text-muted-foreground mt-1 font-mono">Average 4.8 messages / session</div>
        </div>
      </div>
    </div>
  );
}
