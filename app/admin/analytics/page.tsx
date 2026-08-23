'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  ArrowLeft, 
  TrendingUp, 
  Eye, 
  Download, 
  MessageSquare, 
  RefreshCw, 
  Globe, 
  Users, 
  Briefcase, 
  Sparkles, 
  Laptop, 
  Smartphone, 
  Activity, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface AnalyticsData {
  portfolio_views: number;
  unique_visitors: number;
  views_growth_percent: number;
  resume_downloads: number;
  conversion_rate_percent: number;
  ai_twin_conversations: number;
  ai_twin_messages: number;
  avg_messages_per_conversation: number;
  total_jobs_analyzed: number;
  average_ats_fit: number;
  high_match_jobs_90_plus: number;
  active_referral_campaigns: number;
  total_network_connections: number;
  applications_active: number;
  recruiter_inquiries: number;
  device_breakdown: {
    desktop: number;
    mobile: number;
  };
  top_locations: Array<{
    location: string;
    count: number;
  }>;
  daily_activity: Array<{
    date: string;
    views: number;
    chats: number;
    jobs_matched: number;
  }>;
  recent_events: Array<{
    id: string;
    created_at: string;
    event_type: string;
    city: string;
    country: string;
    browser: string;
    os: string;
  }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [apiHost, setApiHost] = useState<string>('http://127.0.0.1:8000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setApiHost(isLocal ? 'http://127.0.0.1:8000' : (process.env.NEXT_PUBLIC_BACKEND_URL || ''));
    }
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiHost}/api/v2/analytics/overview`);
      if (res.ok) {
        const json = await res.json();
        if (json.analytics) {
          setData(json.analytics);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.warn("Failed fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [apiHost]);

  const maxDailyViews = Math.max(1, ...(data?.daily_activity?.map(d => d.views) || [1]));
  const totalDeviceCount = Math.max(1, (data?.device_breakdown?.desktop || 0) + (data?.device_breakdown?.mobile || 0));
  const desktopPct = Math.round(((data?.device_breakdown?.desktop || 0) / totalDeviceCount) * 100);
  const mobilePct = 100 - desktopPct;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans transition-colors duration-300">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Live Portfolio & Digital Twin Analytics
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Real-time telemetry, visitor conversion, AI chat statistics, and job search metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 bg-card/40 px-3 py-1.5 rounded-lg border border-border/60">
              <Clock className="w-3.5 h-3.5 text-primary" /> Updated {lastUpdated}
            </span>
          )}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Refresh Live Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* 1. Portfolio Views */}
        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
            <span>Total Portfolio Views</span>
            <Eye className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground mt-2 font-mono">
            {loading ? <span className="animate-pulse">--</span> : data?.portfolio_views ?? 0}
          </div>
          <div className="text-xs text-emerald-500 mt-1 flex items-center gap-1 font-mono">
            <TrendingUp className="w-3.5 h-3.5" /> +{data?.views_growth_percent ?? 0}% active engagement
            <span className="text-muted-foreground ml-auto">({data?.unique_visitors ?? 0} unique)</span>
          </div>
        </div>

        {/* 2. Resume Downloads */}
        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
            <span>Resume Downloads & Tailoring</span>
            <Download className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground mt-2 font-mono">
            {loading ? <span className="animate-pulse">--</span> : data?.resume_downloads ?? 0}
          </div>
          <div className="text-xs text-primary mt-1 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" /> {data?.conversion_rate_percent ?? 0}% conversion rate
            <span className="text-muted-foreground ml-auto">High Recruiter Fit</span>
          </div>
        </div>

        {/* 3. AI Twin Conversations */}
        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
            <span>AI Twin Interactive Sessions</span>
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground mt-2 font-mono">
            {loading ? <span className="animate-pulse">--</span> : data?.ai_twin_conversations ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between font-mono">
            <span>Avg {data?.avg_messages_per_conversation ?? 0} msgs/session</span>
            <span className="text-primary font-semibold">{data?.ai_twin_messages ?? 0} total msgs</span>
          </div>
        </div>

        {/* 4. Network & Warm Connections */}
        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
            <span>Network Connections</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground mt-2 font-mono">
            {loading ? <span className="animate-pulse">--</span> : data?.total_network_connections ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between font-mono">
            <span>LinkedIn Ingested</span>
            <span className="text-emerald-400 font-semibold">{data?.active_referral_campaigns ?? 0} Referral Targets</span>
          </div>
        </div>

        {/* 5. Jobs Intelligence & Match Score */}
        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
            <span>Job Opportunities Analyzed</span>
            <Briefcase className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground mt-2 font-mono">
            {loading ? <span className="animate-pulse">--</span> : data?.total_jobs_analyzed ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between font-mono">
            <span>Avg ATS: {data?.average_ats_fit ?? 0}%</span>
            <span className="text-primary font-semibold">{data?.high_match_jobs_90_plus ?? 0} Roles ≥ 90%</span>
          </div>
        </div>

        {/* 6. Recruiter Inquiries & Actions */}
        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
            <span>Recruiter Inquiries</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground mt-2 font-mono">
            {loading ? <span className="animate-pulse">--</span> : data?.recruiter_inquiries ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between font-mono">
            <span>{data?.applications_active ?? 0} Applications Active</span>
            <span className="text-emerald-400 font-semibold">Active Pipeline</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Activity Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> 14-Day Activity & Traffic Trend
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                Daily visitor views, AI twin engagements, and automated job scoring
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
              Live Feed
            </span>
          </div>

          {/* Bar Visualization */}
          <div className="h-44 flex items-end justify-between gap-2 pt-6 border-b border-border/60 pb-3">
            {data?.daily_activity?.map((day, idx) => {
              const heightPct = Math.max(12, Math.round((day.views / maxDailyViews) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.views}
                  </div>
                  <div 
                    className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-primary/40 to-primary group-hover:from-primary group-hover:to-primary/80 transition-all cursor-pointer relative"
                    style={{ height: `${heightPct}%` }}
                    title={`${day.date}: ${day.views} views, ${day.chats} chats, ${day.jobs_matched} jobs`}
                  />
                  <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[34px]">
                    {day.date.split(' ')[1]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 font-mono">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary" /> Page Views</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-400" /> AI Twin Queries</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-cyan-400" /> Job Matches</span>
          </div>
        </div>

        {/* Device & Location Breakdown */}
        <div className="space-y-6">
          {/* Device Distribution */}
          <div className="p-6 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <Laptop className="w-4 h-4 text-primary" /> Device & Platform Breakdown
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-1.5">
                  <span className="flex items-center gap-1.5"><Laptop className="w-3.5 h-3.5 text-primary" /> Desktop / Laptop</span>
                  <span className="text-foreground font-semibold">{desktopPct}% ({data?.device_breakdown?.desktop ?? 0})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${desktopPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-1.5">
                  <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Mobile & Tablet</span>
                  <span className="text-foreground font-semibold">{mobilePct}% ({data?.device_breakdown?.mobile ?? 0})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${mobilePct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Top Geographies */}
          <div className="p-6 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-primary" /> Top Visitor Geographies
            </h2>

            <div className="space-y-2.5">
              {data?.top_locations?.map((loc, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-mono bg-muted/30 p-2 rounded-xl border border-border/40">
                  <span className="truncate max-w-[180px] text-foreground">{loc.location}</span>
                  <span className="text-primary font-semibold">{loc.count} views</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Telemetry Activity Feed */}
      <div className="rounded-2xl bg-card/60 border border-border/80 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="p-5 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-bold text-foreground font-sans">Live Visitor Telemetry Feed</h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {data?.recent_events?.length ?? 0} events logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-muted/50 border-b border-border/80 text-[11px] font-mono text-muted-foreground uppercase">
              <tr>
                <th className="px-5 py-3.5">Event Type</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Browser & OS</th>
                <th className="px-5 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(!data?.recent_events || data.recent_events.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground font-mono">
                    No visitor events recorded yet.
                  </td>
                </tr>
              ) : (
                data.recent_events.map((ev, idx) => (
                  <tr key={ev.id || idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-primary">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px]">
                        {ev.event_type || 'page_view'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-sans text-muted-foreground">
                      {ev.city && ev.city !== 'Unknown' ? `${ev.city}, ${ev.country}` : (ev.country || 'Global Visitor')}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">
                      {ev.browser || 'Chrome'} / {ev.os || 'Windows'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground text-right">
                      {ev.created_at ? new Date(ev.created_at).toLocaleString() : 'Just now'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
