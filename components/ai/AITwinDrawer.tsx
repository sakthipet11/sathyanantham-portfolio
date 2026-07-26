'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore, ChatMessage } from '@/lib/store';
import { useAITwin } from '@/hooks/useAITwin';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Cpu,
  FileText,
  Radio,
  CheckCircle2,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "Tell me about Sathyanantham's experience at Nextuple & Order Management Systems",
  "What is his core tech stack & frontend architecture expertise?",
  "What awards and recognitions has he received?",
  "Can I schedule a live chat handoff or leave my contact details?"
];

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OpenRouter)' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (OpenRouter)' },
  { id: 'openai/gpt-4o', name: 'GPT-4o (OpenRouter)' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (OpenRouter)' }
];

export function AITwinDrawer() {
  const {
    isAIDrawerOpen,
    setAIDrawerOpen,
    selectedModel,
    setSelectedModel,
    isSathyananthamOnline,
    chatMode,
    setChatMode,
    messages,
    clearMessages
  } = useAppStore();

  const { sendMessage, isLoading } = useAITwin();
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isAIDrawerOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    sendMessage(inputText);
    setInputText('');
  };

  const handlePromptClick = (prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
      
      {/* Slide-over Container */}
      <div className="relative w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">AI Digital Twin</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  RAG Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Trained on Sathyanantham's 13+ years career docs</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearMessages}
              title="Clear history"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAIDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Model & Presence Controls */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900 text-slate-200 font-mono text-[11px] border border-slate-700/80 rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setChatMode(chatMode === 'ai_twin' ? 'live_human' : 'ai_twin')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
              chatMode === 'live_human'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Radio className={`w-3 h-3 ${isSathyananthamOnline ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{chatMode === 'live_human' ? 'Live Handoff Mode' : 'AI Twin Mode'}</span>
          </button>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans scrollbar-thin scrollbar-thumb-slate-800">
          {messages.map((msg: ChatMessage) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                {msg.role === 'user' ? (
                  <>
                    <span>Visitor</span>
                    <User className="w-3 h-3 text-cyan-400" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-cyan-400" />
                    <span>{msg.senderName || 'Sathyanantham AI Twin'}</span>
                    <span className="text-slate-500 font-mono">{msg.timestamp}</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-slate-200 leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 border border-slate-700/60 rounded-tl-none font-normal'
                }`}
              >
                {/* Render markdown/text lines */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Sources & Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[10px] text-cyan-400">
                    <FileText className="w-3 h-3" />
                    <span>RAG Source: {msg.sources.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Generating RAG response...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-t border-slate-800/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Suggested Inquiries</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(p)}
                className="text-[11px] text-slate-300 bg-slate-800/70 hover:bg-slate-800 hover:text-cyan-300 border border-slate-700/60 rounded-lg px-2.5 py-1 text-left transition-colors truncate max-w-full"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Box */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={chatMode === 'live_human' ? 'Send direct message to Sathyanantham V...' : 'Ask AI Twin about experience, projects, stack...'}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
