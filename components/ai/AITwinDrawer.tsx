'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import DOMPurify from 'isomorphic-dompurify';
import { useAppStore, ChatMessage } from '@/lib/store';
import { useAITwin } from '@/hooks/useAITwin';
import {
  X,
  Send,
  Sparkles,
  User,
  Trash2,
  Cpu,
  FileText,
  Radio
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "Tell me about Sathyanantham's experience at Nextuple & Order Management Systems",
  "What is his core tech stack & frontend architecture expertise?",
  "What awards and recognitions has he received?",
  "Can I schedule a live chat handoff or leave my contact details?"
];

const DEFAULT_MODEL_ID = process.env.NEXT_PUBLIC_OPENROUTER_API_MODEL || 'anthropic/claude-3.5-sonnet';

const formatModelName = (id: string) => {
  const parts = id.split('/');
  const name = parts[parts.length - 1] || id;
  return name
    .split(':')
    .shift()!
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) + ' (Configured LLM)';
};

export function parseMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Code blocks: ```language ... ```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-slate-950 border border-slate-800/85 rounded-lg p-3 my-2.5 overflow-x-auto font-mono text-[10px] text-cyan-100 leading-relaxed"><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // 2. Inline code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-slate-950/70 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-cyan-300">$1</code>');

  // 3. Process Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-cyan-300">$1</strong>');

  // 4. Process Headers
  html = html.replace(/^### (.*?)$/gm, '<h4 class="font-bold text-cyan-200 text-xs mt-3 mb-1">$1</h4>');
  html = html.replace(/^## (.*?)$/gm, '<h3 class="font-bold text-cyan-200 text-sm mt-4 mb-1.5">$1</h3>');
  html = html.replace(/^# (.*?)$/gm, '<h2 class="font-black text-white text-base mt-5 mb-2">$1</h2>');

  // 5. Lists (Unordered & Ordered)
  const lines = html.split('\n');
  let inUl = false;
  let inOl = false;
  let insidePre = false;
  
  const processed = lines.map((line) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('<pre') || trimmed.includes('class="language-')) {
      insidePre = true;
    }
    if (insidePre) {
      if (trimmed.endsWith('</pre>')) {
        insidePre = false;
      }
      return line;
    }

    // Unordered List Match (•, -, *)
    const ulMatch = line.match(/^(\s*)[•\-\*]\s+(.*)$/);
    if (ulMatch) {
      let prefix = '';
      if (inOl) {
        inOl = false;
        prefix += '</ol>';
      }
      if (!inUl) {
        inUl = true;
        prefix += '<ul class="my-2 space-y-1 list-disc pl-4 text-slate-300">';
      }
      return `${prefix}<li class="pl-0.5">${ulMatch[2]}</li>`;
    }

    // Ordered List Match (1., 2.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      let prefix = '';
      if (inUl) {
        inUl = false;
        prefix += '</ul>';
      }
      if (!inOl) {
        inOl = true;
        prefix += '<ol class="my-2 space-y-1 list-decimal pl-4 text-slate-300">';
      }
      return `${prefix}<li class="pl-0.5">${olMatch[2]}</li>`;
    }

    let closeLists = '';
    if (inUl) {
      inUl = false;
      closeLists += '</ul>';
    }
    if (inOl) {
      inOl = false;
      closeLists += '</ol>';
    }

    return closeLists ? `${closeLists}${line}` : line;
  });

  if (inUl) processed.push('</ul>');
  if (inOl) processed.push('</ol>');

  html = processed.join('\n');

  // 6. Process links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 font-semibold underline hover:text-cyan-300 transition-colors">$1</a>');

  // 7. Line breaks
  const finalLines = html.split('\n');
  let currentPre = false;
  let currentList = false;
  
  html = finalLines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('<pre')) currentPre = true;
    if (trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) currentList = true;
    
    let result = line;
    const isBlockTag = trimmed.startsWith('<ul') || trimmed.startsWith('</ul>') || 
                       trimmed.startsWith('<ol') || trimmed.startsWith('</ol>') || 
                       trimmed.startsWith('<li') || trimmed.startsWith('</li>') || 
                       trimmed.startsWith('<pre') || trimmed.startsWith('</pre>') ||
                       trimmed.startsWith('<h2') || trimmed.startsWith('<h3') || trimmed.startsWith('<h4');
                       
    if (!currentPre && !currentList && !isBlockTag && trimmed.length > 0) {
      result += '<br />';
    }
    
    if (trimmed.endsWith('</pre>')) currentPre = false;
    if (trimmed.endsWith('</ul>') || trimmed.endsWith('</ol>')) currentList = false;
    
    return result;
  }).join('\n');

  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
}

const BASE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OpenRouter)' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (OpenRouter)' },
  { id: 'openai/gpt-4o', name: 'GPT-4o (OpenRouter)' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (OpenRouter)' }
];

const getAvailableModels = () => {
  const models = [...BASE_MODELS];
  if (!models.some(m => m.id === DEFAULT_MODEL_ID)) {
    models.unshift({
      id: DEFAULT_MODEL_ID,
      name: formatModelName(DEFAULT_MODEL_ID)
    });
  }
  return models;
};

const AVAILABLE_MODELS = getAvailableModels();

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

  useEffect(() => {
    if (!isAIDrawerOpen) {
      setChatMode('ai_twin');
    }
  }, [isAIDrawerOpen, setChatMode]);

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
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
      
      {/* Slide-over Container */}
      <div className="relative w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.4)] shrink-0">
              <Image
                src="/avatar.jpg"
                alt="Sathyanantham V"
                fill
                className="object-cover"
              />
            </div>
             <div>
               <div className="flex items-center gap-2">
                 <h3 className="text-sm font-bold text-white tracking-tight">Sathyanantham V</h3>
                 <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                   isSathyananthamOnline
                     ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                     : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                 }`}>
                   <span className={`w-1.5 h-1.5 rounded-full ${isSathyananthamOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                   {isSathyananthamOnline ? 'Online' : 'Offline'}
                 </span>
               </div>
               <p className="text-[11px] text-slate-400">AI Digital Twin Assistant</p>
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
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-mono text-[11px]">AI Twin Active</span>
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
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                {msg.role === 'user' ? (
                  <>
                    <span>Visitor</span>
                    <User className="w-3 h-3 text-cyan-400" />
                  </>
                ) : (
                  <>
                    <div className="relative w-4 h-4 rounded-full overflow-hidden border border-cyan-400 shrink-0">
                      <Image src="/avatar.jpg" alt="Sathyanantham" fill className="object-cover" />
                    </div>
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
                 {/* Render parsed markdown content */}
                 <div 
                   className="text-xs leading-relaxed space-y-1"
                   dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                 />
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>{chatMode === 'live_human' ? 'Connecting live chat...' : 'AI Twin is thinking...'}</span>
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
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={Math.min(5, inputText.split('\n').length || 1)}
            placeholder={chatMode === 'live_human' ? 'Send direct message to Sathyanantham V...' : 'Ask AI Twin about experience, projects, stack...'}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none max-h-32 min-h-[38px] scrollbar-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || (isLoading && chatMode !== 'live_human')}
            className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
