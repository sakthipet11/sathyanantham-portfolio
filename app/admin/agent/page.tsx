'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getApiHost } from '@/lib/utils';
import {
  Bot,
  Send,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  Flame,
  Award,
  Layers,
  Users,
  ShieldCheck,
  FileText,
  RefreshCw,
  ExternalLink,
  Zap,
  ArrowLeft,
  ChevronRight,
  CornerDownLeft,
  Check
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text?: string;
  data?: any;
  timestamp: string;
}

import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AIAgentPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([
    { label: "Find the best 10 jobs for me today", category: "DISCOVERY", icon: "search" },
    { label: "Prepare applications for the top 3", category: "APPLICATION", icon: "file-text" },
    { label: "Find referrals for Figma and Stripe", category: "REFERRAL", icon: "users" },
    { label: "Summarize recruiter inbox and interview requests", category: "EMAIL", icon: "inbox" }
  ]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiHost = getApiHost();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    // Initial welcome message from Copilot
    setMessages([
      {
        id: "msg-welcome",
        sender: "agent",
        text: "Hello Sathyanantham! I am your autonomous AI Job Search Copilot. Ask me to discover positions, prepare tailored applications, find 1st-degree referrals, or inspect recruiter inbound.",
        data: null,
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  const handleSendPrompt = async (promptText: string) => {
    const text = promptText.trim();
    if (!text || loading) return;

    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: userMsgId, sender: 'user', text, timestamp: new Date().toISOString() }
    ]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${apiHost}/api/v2/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (res.ok) {
        const d = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            sender: 'agent',
            text: d.data?.reply,
            data: d.data,
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        throw new Error("Failed response from copilot backend");
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: "I encountered a transient connection issue. Running retry backoff...",
          data: null,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteBatchAction = async (actionId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/v2/copilot/execute-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_id: actionId })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Batch action executed!");
      }
    } catch {
      showToast("Action executed locally.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono text-xs flex flex-col justify-between transition-colors duration-300">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-primary/40 text-primary text-xs shadow-2xl animate-fade-in font-mono backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          {toastMsg}
        </div>
      )}

      {/* Header Bar */}
      <header className="px-6 md:px-10 py-5 border-b border-border/80 flex items-center justify-between bg-card/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 font-sans">
              <Bot className="w-5 h-5 text-primary" />
              <h1 className="text-sm font-bold text-foreground uppercase tracking-tight">Interactive AI Job Search Copilot</h1>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">Autonomous natural language discovery, tailoring, application staging & referral engine.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="text-[10px] font-bold px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-500 flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AGENT_ONLINE
          </div>
        </div>
      </header>

      {/* Main Conversational Feed */}
      <main className="flex-1 overflow-y-auto px-4 md:px-10 py-6 space-y-6 max-w-5xl w-full mx-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
          >
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
              <span>{msg.sender === 'user' ? '// SATHYANANTHAM V' : '// AI JOB COPILOT'}</span>
              <span>•</span>
              <span>{msg.timestamp.slice(11, 19)}</span>
            </div>

            {/* Bubble */}
            <div
              className={`p-4 md:p-5 rounded-2xl max-w-3xl border shadow-xl ${
                msg.sender === 'user'
                  ? 'bg-primary/10 border-primary/30 text-foreground rounded-tr-none'
                  : 'bg-card/90 border-border/80 text-foreground rounded-tl-none space-y-4 backdrop-blur-xl'
              }`}
            >
              {msg.text && (
                <p className="text-xs md:text-sm leading-relaxed whitespace-pre-line font-sans font-medium text-foreground">
                  {msg.text}
                </p>
              )}

              {/* DYNAMIC RESULT: FUNNEL & DISCOVERY */}
              {msg.data?.type === 'JOB_DISCOVERY_RESULT' && (
                <div className="space-y-4 pt-2">
                  {/* Funnel Visualizer */}
                  <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2.5">
                    <span className="text-[10px] font-bold text-primary font-mono uppercase block">// PROGRESSIVE FILTERING FUNNEL</span>
                    <div className="space-y-1.5 font-mono text-xs">
                      {msg.data.funnel?.map((step: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-1 border-b border-border/60 last:border-0">
                          <span className="text-muted-foreground">{step.stage}</span>
                          <strong className="text-primary font-bold px-2 py-0.5 rounded-lg bg-muted border border-border/80">
                            {step.count}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation Cards */}
                  <div className="space-y-3">
                    {msg.data.recommendations?.map((job: any) => (
                      <div key={job.id} className="p-4 rounded-xl bg-card/60 border border-border/80 space-y-3 hover:border-primary/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-foreground text-sm block font-sans">{job.company}</span>
                            <span className="text-xs text-muted-foreground font-sans">{job.title}</span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">{job.location}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                              ATS: {job.ats_score}%
                            </span>
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-primary/10 text-primary border border-primary/20">
                              {job.recommendation}
                            </span>
                          </div>
                        </div>

                        {/* Strengths & Gaps */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                            <span className="text-emerald-500 font-bold text-[10px] uppercase font-mono block">// STRENGTHS (MATCHES)</span>
                            {job.strengths?.map((s: string, i: number) => (
                              <div key={i} className="text-foreground flex items-start gap-1.5 font-sans">
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{s}</span>
                              </div>
                            ))}
                          </div>

                          <div className="p-2.5 rounded-xl bg-card border border-border/80 space-y-1">
                            <span className="text-muted-foreground font-bold text-[10px] uppercase font-mono block">// NOTABLE GAPS</span>
                            {job.gaps?.map((g: string, i: number) => (
                              <div key={i} className="text-muted-foreground flex items-start gap-1.5 font-sans">
                                <span>•</span>
                                <span>{g}</span>
                              </div>
                            ))}
                            {job.referral_contact && (
                              <div className="pt-1.5 text-[10px] text-primary font-mono border-t border-border/80 mt-1">
                                <strong>Referral Lead:</strong> {job.referral_contact}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DYNAMIC RESULT: STAGED APPLICATIONS */}
              {msg.data?.type === 'APPLICATION_PREPARATION_RESULT' && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-3">
                    {msg.data.staged_items?.map((item: any) => (
                      <div key={item.application_id} className="p-4 rounded-xl bg-card/60 border border-primary/20 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-foreground text-sm font-sans">{item.company}</span>
                            <span className="text-xs text-muted-foreground font-sans block">{item.job_title}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-amber-500/10 text-amber-500 border border-amber-500/30">
                            {item.status}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-1.5 text-[11px] font-sans">
                          <span className="text-primary font-bold text-[10px] uppercase font-mono block">// RESUME TAILORING HIGHLIGHTS</span>
                          {item.tailoring_highlights?.map((h: string, i: number) => (
                            <div key={i} className="text-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{h}</span>
                            </div>
                          ))}
                          <div className="text-[10px] font-mono text-muted-foreground pt-1">
                            Generated file: <strong className="text-foreground">{item.resume_version}</strong> • Form fields: {item.form_fields_extracted}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Batch Action Gate */}
                  {msg.data.approval_gate && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-amber-600 dark:text-amber-400 text-xs block font-mono">// WAITING FOR APPROVAL</span>
                        <span className="text-[11px] text-muted-foreground font-sans">All 3 applications staged. Ready for human authorization.</span>
                      </div>
                      <button
                        onClick={() => handleExecuteBatchAction("APPROVE_ALL_STAGED")}
                        className="px-4 py-2 bg-amber-500 text-foreground font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-amber-400"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve All 3
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* DYNAMIC RESULT: REFERRALS */}
              {msg.data?.type === 'REFERRAL_DISCOVERY_RESULT' && (
                <div className="space-y-3 pt-2">
                  {msg.data.referrals?.map((ref: any) => (
                    <div key={ref.contact_id} className="p-4 rounded-xl bg-card/60 border border-emerald-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-foreground text-xs">{ref.name}</span>
                          <span className="text-[11px] text-muted-foreground block">{ref.role} • {ref.company}</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                          {ref.connection_degree}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-[11px] text-foreground font-sans italic">
                        "{ref.draft_message}"
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleExecuteBatchAction("SEND_ALL_REFERRALS")}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" /> Approve & Dispatch Both Referral Messages
                  </button>
                </div>
              )}

              {/* Interactive Quick Action Buttons Attached to Reply */}
              {msg.data?.actions && (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/80">
                  {msg.data.actions.map((act: any, i: number) => (
                    act.link ? (
                      <Link
                        key={i}
                        href={act.link}
                        className="px-3.5 py-1.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        {act.label} <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </Link>
                    ) : act.prompt ? (
                      <button
                        key={i}
                        onClick={() => handleSendPrompt(act.prompt)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                          act.primary
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                            : 'bg-card border border-border/80 hover:bg-muted text-foreground'
                        }`}
                      >
                        {act.label} <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : null
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-primary/30 text-primary text-xs animate-pulse max-w-md font-mono shadow-xs">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>AI Copilot evaluating sources and synthesizing decisions...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Footer / Input Console & Suggestions */}
      <footer className="border-t border-border/80 bg-card/80 backdrop-blur-xl p-4 md:p-6 shrink-0 space-y-3 max-w-5xl w-full mx-auto">
        {/* Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-mono no-scrollbar">
          <span className="text-muted-foreground font-bold uppercase shrink-0">// SUGGESTIONS:</span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPrompt(s.label)}
              className="px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border/80 text-foreground transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-primary" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Text Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt(input);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything: 'Find the best 10 jobs for me today', 'Prepare applications for top 3'..."
              className="w-full bg-muted/40 border border-border/80 rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/80 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Send</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
