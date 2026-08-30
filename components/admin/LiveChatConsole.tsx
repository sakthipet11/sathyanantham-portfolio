'use client';

import React, { useState, useMemo } from 'react';
import {
  Radio,
  Wifi,
  WifiOff,
  Search,
  RefreshCw,
  Trash2,
  User,
  Bot,
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  Clock
} from 'lucide-react';

interface LiveChatConsoleProps {
  chatSessions: any[];
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  currentChatMessages: any[];
  loadingMessages: boolean;
  isHostOnline: boolean;
  isTogglingPresence: boolean;
  onTogglePresence: () => void;
  wsConnected: boolean;
  hostReply: string;
  onHostReplyChange: (val: string) => void;
  onSendReply: () => void;
  sendingReply: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onToggleSessionMode: (sessionId: string, currentStatus: string) => void;
  onRefreshSessions: () => void;
  onRefreshMessages: (sessionId: string) => void;
}

export function LiveChatConsole({
  chatSessions,
  selectedSessionId,
  onSelectSession,
  currentChatMessages,
  loadingMessages,
  isHostOnline,
  isTogglingPresence,
  onTogglePresence,
  wsConnected,
  hostReply,
  onHostReplyChange,
  onSendReply,
  sendingReply,
  chatEndRef,
  onDeleteSession,
  onToggleSessionMode,
  onRefreshSessions,
  onRefreshMessages
}: LiveChatConsoleProps) {
  const [chatFilter, setChatFilter] = useState<'all' | 'handoff' | 'ai'>('all');
  const [chatSearch, setChatSearch] = useState('');

  const filteredChatSessions = useMemo(() => {
    return chatSessions.filter((s) => {
      if (chatFilter === 'handoff' && s.status !== 'live_human') return false;
      if (chatFilter === 'ai' && s.status === 'live_human') return false;
      if (chatSearch.trim()) {
        const query = chatSearch.toLowerCase();
        const matchesId = s.id?.toLowerCase().includes(query);
        const matchesInfo = JSON.stringify(s.visitor_info || {}).toLowerCase().includes(query);
        return matchesId || matchesInfo;
      }
      return true;
    });
  }, [chatSessions, chatFilter, chatSearch]);

  const activeSelectedSession = useMemo(() => {
    return chatSessions.find((s) => s.id === selectedSessionId) || null;
  }, [chatSessions, selectedSessionId]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Host Presence & Handoff Controls */}
      <div className="p-6 rounded-3xl bg-card/80 border border-border/80 backdrop-blur-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
              isHostOnline
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'bg-muted/70 text-muted-foreground border-border/80'
            }`}
          >
            <Radio className={`w-6 h-6 ${isHostOnline ? 'animate-pulse text-emerald-500' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm md:text-base font-bold text-foreground">
                {isHostOnline ? 'Host Status: ONLINE (Live Handoff Active)' : 'Host Status: OFFLINE (Autonomous AI Twin)'}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isHostOnline
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-muted text-muted-foreground border-border/80'
                }`}
              >
                {isHostOnline ? 'Direct Takeover Enabled' : 'AI Handling All Chats'}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] bg-card border border-border/70 text-muted-foreground">
                {wsConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-500" />
                    <span>WS Stream Active</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-500" />
                    <span>Direct Polling Active</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-sans">
              {isHostOnline
                ? 'Visitors who request to speak with Sathyanantham V will ring your live console immediately for real-time takeover.'
                : 'Incoming visitor inquiries are answered in real-time by your Gemini-powered AI Digital Twin trained on your career documentation.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={onTogglePresence}
            disabled={isTogglingPresence}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              isHostOnline
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isHostOnline ? 'Switch to Offline (AI Twin)' : 'Go Online (Host Active)'}</span>
          </button>
        </div>
      </div>

      {/* Main Console Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
        {/* Left Column: Sessions List (4 cols) */}
        <div className="lg:col-span-4 flex flex-col rounded-3xl bg-card/80 border border-border/80 backdrop-blur-2xl shadow-xl overflow-hidden">
          {/* Header & Filter Controls */}
          <div className="p-4 border-b border-border/80 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Visitor Sessions ({chatSessions.length})
                </h3>
              </div>
              <button
                onClick={onRefreshSessions}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title="Refresh Sessions"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search session ID or location..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/80 font-sans"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={() => setChatFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                  chatFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({chatSessions.length})
              </button>
              <button
                onClick={() => setChatFilter('handoff')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer ${
                  chatFilter === 'handoff'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-rose-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                Live Takeover ({chatSessions.filter((s) => s.status === 'live_human').length})
              </button>
              <button
                onClick={() => setChatFilter('ai')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                  chatFilter === 'ai'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                AI Twin ({chatSessions.filter((s) => s.status !== 'live_human').length})
              </button>
            </div>
          </div>

          {/* Scrollable Session List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60 p-2 space-y-1">
            {filteredChatSessions.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bot className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-xs font-semibold text-foreground">No conversations found</p>
                <p className="text-[10px] text-muted-foreground font-sans">
                  {chatSearch
                    ? 'Try adjusting your search criteria.'
                    : 'When visitors interact with your AI Twin on the portfolio, sessions will appear here in real-time.'}
                </p>
              </div>
            ) : (
              filteredChatSessions.map((sess) => {
                const isSelected = sess.id === selectedSessionId;
                const isLive = sess.status === 'live_human';
                const formattedTime = sess.created_at
                  ? new Date(sess.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Active';

                return (
                  <div
                    key={sess.id}
                    onClick={() => onSelectSession(sess.id)}
                    className={`p-3 rounded-2xl transition-all cursor-pointer border flex flex-col gap-1.5 relative group ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40 shadow-sm'
                        : 'border-transparent hover:bg-muted/40 hover:border-border/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold font-mono ${
                            isLive
                              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                              : 'bg-primary/15 text-primary border border-primary/25'
                          }`}
                        >
                          {isLive ? <Radio className="w-3.5 h-3.5 animate-pulse" /> : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-foreground text-xs block truncate font-sans">
                            Visitor #{sess.id?.slice(0, 8)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block truncate font-sans">
                            {sess.visitor_info?.country || sess.visitor_info?.city || 'Portfolio Visitor'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] font-mono text-muted-foreground">{formattedTime}</span>
                        <button
                          onClick={(e) => onDeleteSession(sess.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete session"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-mono uppercase font-bold tracking-wider ${
                          isLive
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-muted/80 text-muted-foreground border border-border/60'
                        }`}
                      >
                        {isLive ? '🚨 Live Takeover' : '🤖 AI Digital Twin'}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-mono text-primary flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          Viewing
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Console (8 cols) */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl bg-card/80 border border-border/80 backdrop-blur-2xl shadow-xl overflow-hidden">
          {!selectedSessionId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-foreground">Select a Visitor Conversation</h3>
              <p className="text-xs text-muted-foreground max-w-sm font-sans">
                Choose any session on the left to monitor the visitor chat in real-time, or take over directly as Sathyanantham V.
              </p>
            </div>
          ) : (
            <>
              {/* Active Session Bar */}
              <div className="p-4 border-b border-border/80 flex items-center justify-between gap-3 bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary border border-primary/25 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-foreground font-sans">
                        Visitor #{selectedSessionId.slice(0, 12)}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                          activeSelectedSession?.status === 'live_human'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-primary/15 text-primary border border-primary/30'
                        }`}
                      >
                        {activeSelectedSession?.status === 'live_human' ? 'Live Human Mode' : 'AI Twin Mode'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-sans">
                      Session started:{' '}
                      {activeSelectedSession?.created_at
                        ? new Date(activeSelectedSession.created_at).toLocaleString()
                        : 'Recent'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onToggleSessionMode(selectedSessionId, activeSelectedSession?.status || 'ai_twin')
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      activeSelectedSession?.status === 'live_human'
                        ? 'bg-muted hover:bg-muted/80 text-foreground border border-border/80'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>
                      {activeSelectedSession?.status === 'live_human' ? 'Release to AI Twin' : 'Take Over Live'}
                    </span>
                  </button>
                  <button
                    onClick={() => onRefreshMessages(selectedSessionId)}
                    className="p-2 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    title="Refresh Messages"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin text-primary' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-background/40">
                {loadingMessages && currentChatMessages.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-muted-foreground animate-pulse">
                    Loading conversation transcript...
                  </div>
                ) : currentChatMessages.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-muted-foreground">
                    No messages yet in this session.
                  </div>
                ) : (
                  currentChatMessages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const isLive = msg.content?.startsWith('[Live]');
                    const cleanContent = isLive ? msg.content.replace(/^\[Live\]\s*/, '') : msg.content;
                    const formattedTime = msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    if (msg.role === 'system') {
                      return (
                        <div key={idx} className="flex justify-center my-2">
                          <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-muted/60 border border-border/60 text-muted-foreground">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}>
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-muted-foreground font-mono">
                          {isUser ? (
                            <>
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span>Visitor</span>
                            </>
                          ) : isLive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-bold text-emerald-400">Sathyanantham V (Live)</span>
                            </>
                          ) : (
                            <>
                              <Bot className="w-3 h-3 text-primary" />
                              <span className="text-primary font-semibold">AI Digital Twin</span>
                            </>
                          )}
                          {formattedTime && <span>• {formattedTime}</span>}
                        </div>

                        <div
                          className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs font-sans leading-relaxed shadow-sm ${
                            isUser
                              ? 'bg-muted/90 border border-border/80 text-foreground rounded-tl-xs'
                              : isLive
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-foreground rounded-tr-xs shadow-emerald-500/5'
                              : 'bg-card/95 border border-primary/25 text-foreground rounded-tr-xs shadow-primary/5'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{cleanContent}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Canned Responses */}
              <div className="px-4 py-2 bg-muted/30 border-t border-border/60 flex items-center gap-2 overflow-x-auto text-[11px] font-sans">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase shrink-0">
                  Quick Reply:
                </span>
                <button
                  onClick={() => onHostReplyChange('Hi! Sathyanantham here in person. Happy to connect!')}
                  className="px-2.5 py-1 rounded-lg bg-card border border-border/70 text-foreground hover:border-primary/50 text-[10px] shrink-0 transition-all cursor-pointer"
                >
                  👋 Hi! Sathyanantham here.
                </button>
                <button
                  onClick={() =>
                    onHostReplyChange(
                      'I would love to learn more about this opportunity. What time works best for an introductory call?'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-card border border-border/70 text-foreground hover:border-primary/50 text-[10px] shrink-0 transition-all cursor-pointer"
                >
                  📅 Let's schedule a call!
                </button>
                <button
                  onClick={() =>
                    onHostReplyChange(
                      'You can view and download my tailored resume directly from the Resumes section on this portal.'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-card border border-border/70 text-foreground hover:border-primary/50 text-[10px] shrink-0 transition-all cursor-pointer"
                >
                  📄 Check my resume
                </button>
              </div>

              {/* Host Reply Input */}
              <div className="p-3 bg-card border-t border-border/80">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={hostReply}
                    onChange={(e) => onHostReplyChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSendReply();
                      }
                    }}
                    placeholder="Type your direct reply as Sathyanantham V... (Press Enter to send)"
                    className="flex-1 p-3 bg-muted/40 border border-border/80 rounded-2xl text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/80 resize-none font-sans"
                  />
                  <button
                    onClick={onSendReply}
                    disabled={!hostReply.trim() || sendingReply}
                    className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md shadow-primary/20 shrink-0 h-[52px]"
                  >
                    <Send className={`w-4 h-4 ${sendingReply ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Send Live</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
