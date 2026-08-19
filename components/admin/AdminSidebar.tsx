'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  LayoutDashboard,
  Briefcase,
  FileText,
  Inbox,
  Users,
  FileCheck,
  Sliders,
  Bot,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Settings,
  User,
  ArrowUpRight,
  LogOut,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exactMatch?: boolean;
  isLive?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  
  // Mobile menu drawer toggle
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  useLockBodyScroll(isMobileOpen);
  
  // Host presence toggle state
  const [isHostOnline, setIsHostOnline] = useState(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('sathya_admin_token') : null;
      const authed = !!token;
      setIsAuthenticated(authed);

      if (!authed && pathname && pathname !== '/admin' && pathname !== '/admin/dashboard') {
        window.location.href = '/admin';
      }
    };

    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('admin-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('admin-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [pathname]);

  // Auto-close mobile drawer when pathname/searchParams change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const apiHost = getApiHost();
    fetchWithTimeout(`${apiHost}/api/presence`, {}, 1500)
      .then(res => res.json())
      .then(data => {
        if (typeof data.is_online === 'boolean') {
          setIsHostOnline(data.is_online);
        }
      })
      .catch(() => {});

    const handlePresenceChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.is_online === 'boolean') {
        setIsHostOnline(customEvent.detail.is_online);
      }
    };

    window.addEventListener('host-presence-changed', handlePresenceChange);
    return () => window.removeEventListener('host-presence-changed', handlePresenceChange);
  }, []);

  const toggleHostPresence = async () => {
    const nextState = !isHostOnline;
    setIsHostOnline(nextState);
    window.dispatchEvent(new CustomEvent('host-presence-changed', { detail: { is_online: nextState } }));

    try {
      const token = sessionStorage.getItem('sathya_admin_token') || '';
      const apiHost = getApiHost();
      await fetchWithTimeout(`${apiHost}/api/admin/presence`, {
        method: 'POST',
        headers: {
          'X-Admin-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_online: nextState })
      }, 1500);
    } catch (e) {
      console.warn("Failed to push presence toggle from sidebar:", e);
    }
  };

  const sections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, exactMatch: true }
      ]
    },
    {
      title: 'Pipelines',
      items: [
        { label: 'Job discovery', href: '/admin/jobs', icon: Briefcase },
        { label: 'Applications', href: '/admin/applications', icon: FileText },
        { label: 'Recruiter inbox', href: '/admin/recruiter-inbox', icon: Inbox },
        { label: 'Referrals', href: '/admin/referrals', icon: Users },
        { label: 'Resumes', href: '/admin/resumes', icon: FileCheck },
        { label: 'Automation', href: '/admin/automation', icon: Sliders, exactMatch: true },
        { label: 'Data retention', href: '/admin/automation/retention', icon: ShieldAlert }
      ]
    },
    {
      title: 'Systems & Settings',
      items: [
        { label: 'AI Copilot', href: '/admin/agent', icon: Bot },
        { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { label: 'Live presence & chat', href: '/admin/dashboard?tab=live-chat', icon: MessageSquare, isLive: true },
        { label: 'Security & SRE', href: '/admin/settings?tab=security', icon: ShieldCheck },
        { label: 'System settings', href: '/admin/settings?tab=system', icon: Settings },
        { label: 'User settings', href: '/admin/settings?tab=user', icon: User }
      ]
    }
  ];

  const isItemActive = (item: NavItem) => {
    if (item.href.includes('?tab=')) {
      const [path, query] = item.href.split('?');
      const targetTab = new URLSearchParams(query).get('tab');
      return (pathname === path || (path === '/admin/dashboard' && pathname === '/admin')) && currentTab === targetTab;
    }
    if (item.href === '/admin/settings' || item.href.startsWith('/admin/settings')) {
      return pathname === '/admin/settings' && (!currentTab || currentTab === 'system');
    }
    if (item.exactMatch) {
      if (item.href === '/admin/dashboard' || item.href === '/admin') {
        return (pathname === '/admin' || pathname === '/admin/dashboard') && !currentTab;
      }
      return pathname === item.href && !currentTab;
    }
    return pathname.startsWith(item.href);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sathya_admin_token');
    window.dispatchEvent(new Event('admin-auth-changed'));
    window.location.href = '/admin';
  };

  const renderNavContent = (onLinkClick?: () => void) => (
    <div className="flex flex-col justify-between h-full font-mono text-xs">
      <div>
        {/* Header Branding */}
        <div className="p-5 border-b border-border/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-foreground leading-none text-xs truncate">Sathyanantham V</h2>
              <span className="text-[10px] text-muted-foreground tracking-wider block mt-1 truncate">Multi-Agent Studio</span>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {onLinkClick && (
            <button
              onClick={onLinkClick}
              className="md:hidden p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-5">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-mono font-semibold text-muted-foreground/80 tracking-wider">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => {
                      if (onLinkClick) onLinkClick();
                      if (typeof window !== 'undefined') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all font-medium group ${
                      active
                        ? 'border-l-4 border-l-primary bg-muted/80 dark:bg-muted/50 text-foreground font-bold shadow-2xs backdrop-blur-md'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.isLive && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isHostOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Controls & Link */}
      <div className="p-3 border-t border-border/80 space-y-2">
        {/* Presence Toggle */}
        <div className="p-2.5 bg-muted/50 border border-border/80 rounded-xl flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-bold">Host status</span>
          <button
            onClick={toggleHostPresence}
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
              isHostOnline
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                : 'bg-muted text-muted-foreground border border-border/80'
            }`}
          >
            {isHostOnline ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" /> : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" />}
            {isHostOnline ? 'Online' : 'Offline'}
          </button>
        </div>

        {/* Public Portfolio External Link */}
        <Link
          href="/"
          target="_blank"
          onClick={onLinkClick}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all font-medium"
        >
          <span>Public portfolio</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer font-medium"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* MOBILE STICKY HEADER (< 768px) */}
      <div className="md:hidden sticky top-0 z-40 bg-card/95 border-b border-border/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-foreground text-xs truncate leading-none">Sathyanantham V</h2>
            <span className="text-[9px] text-muted-foreground tracking-wider block mt-0.5 truncate">Multi-Agent Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`w-2 h-2 rounded-full ${isHostOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} title={isHostOnline ? 'Host Online' : 'Host Offline'} />
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl bg-muted/70 text-foreground hover:bg-muted transition-colors cursor-pointer border border-border/60"
            aria-label="Toggle menu"
          >
            {isMobileOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5 text-foreground" />}
          </button>
        </div>
      </div>

      {/* MOBILE SLIDE-OVER DRAWER OVERLAY */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer Content */}
          <div className="relative z-50 w-72 max-w-[85vw] bg-card border-r border-border/80 h-full flex flex-col justify-between shadow-2xl overflow-y-auto">
            {renderNavContent(() => setIsMobileOpen(false))}
          </div>
        </div>
      )}

      {/* DESKTOP PERMANENT SIDEBAR (>= 768px) */}
      <aside className="hidden md:flex md:w-64 bg-card/90 dark:bg-card/70 border-r border-border/80 backdrop-blur-xl flex-col justify-between shrink-0 shadow-sm min-h-screen font-mono text-xs sticky top-0 h-screen overflow-y-auto">
        {renderNavContent()}
      </aside>
    </>
  );
}
