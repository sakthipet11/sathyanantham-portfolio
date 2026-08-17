'use client';

import Link from 'next/link';
import { BarChart3, ArrowLeft, TrendingUp, Eye, Download, MessageSquare } from 'lucide-react';

export default function AdminAnalyticsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/dashboard" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" /> Deep Portfolio & Digital Twin Analytics
          </h1>
          <p className="text-xs text-slate-400">Visitor activity, recruiter conversion, and AI chat stats</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Portfolio Views</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">1,240</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +18.4% this month
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Resume Downloads</span>
            <Download className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">184</div>
          <div className="text-xs text-purple-400 mt-1">High Recruiter Conversion</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>AI Twin Conversations</span>
            <MessageSquare className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">64</div>
          <div className="text-xs text-amber-400 mt-1">Average 4.8 messages / session</div>
        </div>
      </div>
    </div>
  );
}
