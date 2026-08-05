'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { getApiHost } from '@/lib/utils';
import {
  Terminal,
  ShieldCheck,
  LayoutDashboard,
  MessageSquare,
  LogOut,
  Send,
  Eye,
  Download,
  Mail,
  User,
  RefreshCw
} from 'lucide-react';

export default function AdminPage() {
  // Authentication State
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Tab State: 'dashboard' | 'chat' | 'cms' | 'contacts'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Analytics & Contacts State
  const [analytics, setAnalytics] = useState<any>({
    total_page_views: 0,
    total_resume_downloads: 0,
    total_contacts: 0,
    total_chat_sessions: 0,
    recent_views_chart: []
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const selectedSessionIdRef = useRef<string>('');
  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);
  const [currentChatMessages, setCurrentChatMessages] = useState<any[]>([]);
  const [hostReply, setHostReply] = useState('');
  const [isHostOnline, setIsHostOnline] = useState(false);
  const hostSocketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const apiHost = getApiHost();

  // 1. Password Verification
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const systemPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '';
    if (password === systemPassword) {
      setIsAuthenticated(true);
      setAuthError('');
      sessionStorage.setItem('sathya_admin_auth', 'true');
    } else {
      setAuthError('Incorrect system credential code.');
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('sathya_admin_auth') === 'true') {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  // 2. Fetch Data from Backend
  const refreshDashboardData = async () => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    try {
      // Fetch stats
      const aRes = await fetch(`${apiHost}/api/admin/analytics`);
      const aData = await aRes.json();
      setAnalytics(aData);

      // Fetch contacts
      const cRes = await fetch(`${apiHost}/api/admin/contacts`);
      const cData = await cRes.json();
      setContacts(cData);

      // Fetch sessions
      const sRes = await fetch(`${apiHost}/api/admin/chat/sessions`);
      const sData = await sRes.json();
      setChatSessions(sData);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshDashboardData();
      connectHostSocket();
      syncHostPresenceBackend(true);
    }
    return () => {
      disconnectHostSocket();
    };
  }, [isAuthenticated]);

  // Sync Host Presence with Backend
  const syncHostPresenceBackend = async (online: boolean) => {
    try {
      await fetch(`${apiHost}/api/admin/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_online: online })
      });
      setIsHostOnline(online);
    } catch (err) {
      console.warn("Failed to sync presence with backend:", err);
    }
  };

  // 3. WebSocket Connection for Handoff Takeover
  const connectHostSocket = () => {
    if (hostSocketRef.current) return;

    const wsProto = apiHost.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiHost.replace('http://', '').replace('https://', '').replace(/\/$/, '');
    const wsUrl = `${wsProto}://${wsHost}/ws/chat?role=host`;

    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('Host socket online.');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'handoff_alert') {
            // Re-fetch chat sessions to show the alert
            refreshDashboardData();
          } else if (data.type === 'visitor_message') {
            // If the message belongs to the current open chat, append it
            if (data.session_id === selectedSessionIdRef.current) {
              setCurrentChatMessages(prev => [
                ...prev,
                { role: 'user', content: data.content, timestamp: new Date().toISOString() }
              ]);
            }
            refreshDashboardData();
          }
        } catch (e) {
          console.warn("Error parsing host socket frame:", e);
        }
      };

      socket.onclose = () => {
        console.log('Host socket disconnected.');
        hostSocketRef.current = null;
        // Auto-reconnect if still logged in
        if (sessionStorage.getItem('sathya_admin_auth') === 'true') {
          console.log('Reconnecting host socket in 3 seconds...');
          setTimeout(() => {
            connectHostSocket();
          }, 3000);
        }
      };

      hostSocketRef.current = socket;
    } catch (err) {
      console.error("Host connection failed:", err);
    }
  };

  const disconnectHostSocket = () => {
    if (hostSocketRef.current) {
      hostSocketRef.current.close();
      hostSocketRef.current = null;
    }
    syncHostPresenceBackend(false);
  };

  // Fetch messages for selected session
  const selectChatSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    try {
      const res = await fetch(`${apiHost}/api/admin/chat/messages?session_id=${sessionId}`);
      const data = await res.json();
      setCurrentChatMessages(data);
    } catch (err) {
      console.error('Failed fetching messages:', err);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChatMessages]);

  // Send reply to visitor
  const sendHostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostReply.trim() || !selectedSessionId || !hostSocketRef.current) return;

    const payload = {
      target_session_id: selectedSessionId,
      content: hostReply
    };

    hostSocketRef.current.send(JSON.stringify(payload));

    // Append to local message array
    setCurrentChatMessages(prev => [
      ...prev,
      { role: 'assistant', content: `[Live] ${hostReply}`, timestamp: new Date().toISOString() }
    ]);

    setHostReply('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sathya_admin_auth');
    setIsAuthenticated(false);
    disconnectHostSocket();
  };

  // Render loading state during initial auth check
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-cyan-400 text-xs animate-pulse">
        Checking credentials...
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 font-mono">
        <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-indigo-500" />

          <div className="flex flex-col items-center gap-4 text-center mb-8">
            <div className="w-12 h-12 rounded-lg bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-tight">Sathyanantham V</h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Admin Security Terminal</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">// PASSKEY SIGN_IN</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            {authError && <p className="text-red-400 text-[11px] font-semibold">{authError}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg hover:bg-cyan-300 transition-colors uppercase tracking-wider"
            >
              Access Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MAIN ADMIN CONSOLE
  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 flex flex-col md:flex-row font-mono text-xs">

      {/* Sidebar Nav */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-900 flex flex-col justify-between shrink-0">
        <div>
          {/* Header info */}
          <div className="p-6 border-b border-slate-900 flex items-center gap-3">
            <div className="relative w-8 h-8 rounded bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white uppercase leading-none">Console.Admin</h2>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mt-1">Sathyanantham V</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Telemetry Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'chat' ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                <span>Live Takeover</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${isHostOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'contacts' ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
            >
              <Mail className="w-4 h-4" />
              <span>Contact Messages ({contacts.length})</span>
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-900 space-y-2">
          {/* Host status toggle */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold">// GO ONLINE</span>
            <button
              onClick={() => syncHostPresenceBackend(!isHostOnline)}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${isHostOnline ? 'bg-emerald-500' : 'bg-slate-800'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transform duration-300 ${isHostOnline ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Terminal</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-[#030303] flex flex-col min-w-0">

        {/* Header Bar */}
        <header className="px-8 py-5 border-b border-slate-900 flex items-center justify-between bg-slate-950/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-white uppercase tracking-tight">
              {activeTab === 'dashboard' && 'Telemetry Analytics'}
              {activeTab === 'chat' && 'Live Handoff Takeover Console'}
              {activeTab === 'contacts' && 'Inquiry Records'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={refreshDashboardData}
              disabled={loadingData}
              className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
            <div className="text-[10px] font-bold px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-400">
              SYS::OK
            </div>
          </div>
        </header>

        {/* Inner Content Grid */}
        <div className="p-8 flex-1 overflow-y-auto">

          {/* TAB 1: TELEMETRY OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stat grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Page Views', val: analytics.total_page_views, icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-950/20' },
                  { label: 'Resume Downloads', val: analytics.total_resume_downloads, icon: Download, color: 'text-indigo-400', bg: 'bg-indigo-950/20' },
                  { label: 'Contact Messages', val: analytics.total_contacts, icon: Mail, color: 'text-purple-400', bg: 'bg-purple-950/20' },
                  { label: 'Chat Sessions', val: analytics.total_chat_sessions, icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-950/20' }
                ].map((stat, idx) => (
                  <div key={idx} className="p-5 bg-slate-950/80 border border-slate-900 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">// {stat.label}</span>
                      <span className="text-2xl font-black text-white font-mono">{stat.val}</span>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} border border-slate-800`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* View Trend custom SVG Area chart */}
              <div className="p-6 bg-slate-950/80 border border-slate-900 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-4">// TRAFFIC MONITOR (LAST 7 DAYS)</span>

                {/* SVG Area Chart */}
                <div className="w-full h-48 relative">
                  <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Grid Lines */}
                    <line x1="0" y1="50" x2="700" y2="50" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4" />
                    <line x1="0" y1="100" x2="700" y2="100" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4" />
                    <line x1="0" y1="150" x2="700" y2="150" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4" />

                    {/* Area path */}
                    <path
                      d="M0 150 L 100 120 L 200 140 L 300 90 L 400 110 L 500 130 L 600 70 L 700 80 L 700 200 L 0 200 Z"
                      fill="url(#chartGradient)"
                    />
                    {/* Line path */}
                    <path
                      d="M0 150 L 100 120 L 200 140 L 300 90 L 400 110 L 500 130 L 600 70 L 700 80"
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                    />

                    {/* Data Points */}
                    <circle cx="100" cy="120" r="4" fill="#030712" stroke="#22d3ee" strokeWidth="2" />
                    <circle cx="300" cy="90" r="4" fill="#030712" stroke="#22d3ee" strokeWidth="2" />
                    <circle cx="600" cy="70" r="4" fill="#030712" stroke="#22d3ee" strokeWidth="2" />
                  </svg>

                  {/* Labels */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-slate-500 font-mono pt-2">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
                </div>
              </div>

              {/* Active visitor chats takeover alert panel */}
              <div className="p-6 bg-slate-950/80 border border-slate-900 rounded-xl space-y-4">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block">// ACTIVE CHAT OVERVIEW</span>
                {chatSessions.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No active chat sessions logged.</p>
                ) : (
                  <div className="divide-y divide-slate-900">
                    {chatSessions.map((session, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${session.status === 'live_human' ? 'bg-amber-400 animate-pulse' : 'bg-cyan-500'}`} />
                          <div>
                            <span className="text-white font-bold block">{session.id}</span>
                            <span className="text-[10px] text-slate-500 block">Created: {new Date(session.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            selectChatSession(session.id);
                            setActiveTab('chat');
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono text-[10px] hover:bg-cyan-900 transition-colors"
                        >
                          {session.status === 'live_human' ? 'Take Over Chat ⚡' : 'View Conversation'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE TAKEOVER CONSOLE */}
          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-190px)]">
              {/* Left Column: Chat Sessions List */}
              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col overflow-hidden">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-3">// SELECT CHAT SESSION</span>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {chatSessions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectChatSession(s.id)}
                      className={`w-full p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${selectedSessionId === s.id
                          ? 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_15px_rgba(56,189,248,0.08)]'
                          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold truncate max-w-[120px]">{s.id}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${s.status === 'live_human'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                          }`}>
                          {s.status === 'live_human' ? 'takeover requested' : 'ai-answering'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">Started: {new Date(s.created_at).toLocaleTimeString()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Chat Window and controls */}
              <div className="lg:col-span-2 bg-slate-950/60 border border-slate-900 rounded-xl flex flex-col overflow-hidden">
                {selectedSessionId ? (
                  <>
                    {/* Chat header */}
                    <div className="px-5 py-4 border-b border-slate-900 bg-slate-950 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-cyan-400" />
                        <div>
                          <h4 className="font-bold text-white leading-none">{selectedSessionId}</h4>
                          <span className="text-[10px] text-slate-500 block mt-1 uppercase">Live takeover status active</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            // Close/end session on backend
                            await fetch(`${apiHost}/api/admin/chat/sessions`, { method: 'DELETE' }); // simple clean
                            refreshDashboardData();
                            setSelectedSessionId('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-900 text-red-400 hover:bg-red-900 hover:text-white transition-all text-[10px]"
                        >
                          Close Session
                        </button>
                      </div>
                    </div>

                    {/* Messages list */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans text-xs scrollbar-thin">
                      {currentChatMessages.map((m, idx) => (
                        <div key={idx} className={`flex flex-col gap-1.5 ${m.role === 'user' ? 'items-start' : 'items-end'}`}>
                          <span className="text-[10px] text-slate-500 font-mono uppercase">{m.role === 'user' ? 'Visitor' : 'Host / AI Twin'}</span>
                          <div className={`max-w-[80%] px-4 py-2.5 rounded-xl border leading-relaxed ${m.role === 'user'
                              ? 'bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none'
                              : 'bg-cyan-950/20 border-cyan-800/40 text-cyan-300 rounded-tr-none'
                            }`}>
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Reply Input Form */}
                    <form onSubmit={sendHostReply} className="p-4 bg-slate-950 border-t border-slate-900 flex items-center gap-2 font-mono">
                      <input
                        type="text"
                        value={hostReply}
                        onChange={(e) => setHostReply(e.target.value)}
                        placeholder="Type reply and send directly to visitor... (Overrides AI)"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!hostReply.trim()}
                        className="p-3 bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 rounded-xl disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 font-mono py-12">
                    <MessageSquare className="w-8 h-8 text-slate-600 animate-pulse" />
                    <span>Select an active chat session to view history or initiate takeover</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONTACT INQUIRIES */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              {contacts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Mail className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p>No inquiry submissions received yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {contacts.map((c, idx) => (
                    <div key={idx} className="p-6 bg-slate-950/80 border border-slate-900 rounded-xl space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/40" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-xs">{c.name}</h4>
                            <span className="text-[10px] text-slate-400 block font-mono">{c.email}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(c.created_at).toLocaleString()}</span>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] text-slate-500 font-mono uppercase block">// MESSAGE TRANSMITTED:</span>
                        <blockquote className="text-slate-300 font-sans text-xs bg-slate-900/40 p-4 border-l-2 border-indigo-500 rounded-r-lg whitespace-pre-wrap leading-relaxed">
                          {c.message}
                        </blockquote>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
