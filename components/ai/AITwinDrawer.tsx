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
  Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SUGGESTED_PROMPTS = [
  "Tell me about Sathyanantham's experience at Nextuple & Order Management Systems",
  "What is his core tech stack & frontend architecture expertise?",
  "What awards and recognitions has he received?",
  "Can I schedule a live chat handoff or leave my contact details?"
];

export function parseMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Code blocks: ```language ... ```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-muted border border-border/80 rounded-lg p-3 my-2.5 overflow-x-auto font-mono text-[10px] text-primary leading-relaxed"><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // 2. Inline code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-muted border border-border px-1.5 py-0.5 rounded font-mono text-[10px] text-primary">$1</code>');

  // 3. Process Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-primary">$1</strong>');

  // 4. Process Headers
  html = html.replace(/^### (.*?)$/gm, '<h4 class="font-bold text-primary text-xs mt-3 mb-1">$1</h4>');
  html = html.replace(/^## (.*?)$/gm, '<h3 class="font-bold text-primary text-sm mt-4 mb-1.5">$1</h3>');
  html = html.replace(/^# (.*?)$/gm, '<h2 class="font-black text-foreground text-base mt-5 mb-2">$1</h2>');

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
        prefix += '<ul class="my-2 space-y-1 list-disc pl-4 text-foreground/80">';
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
        prefix += '<ol class="my-2 space-y-1 list-decimal pl-4 text-foreground/80">';
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
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary font-semibold underline hover:opacity-80 transition-opacity">$1</a>');

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

export function AITwinDrawer() {
  const {
    isAIDrawerOpen,
    setAIDrawerOpen,
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
    <div className="fixed inset-0 z-[100] flex justify-end bg-background/80 backdrop-blur-md transition-opacity duration-300">
      
      {/* Glass Slide-over Container */}
      <div className="relative w-full max-w-lg h-full bg-card/95 border-l border-border/80 shadow-2xl backdrop-blur-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/80 flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary shadow-[0_0_15px_rgba(56,189,248,0.4)] shrink-0">
              <Image
                src="/avatar.jpg"
                alt="Sathyanantham V"
                fill
                className="object-cover"
              />
            </div>
             <div>
               <div className="flex items-center gap-2">
                 <h3 className="text-sm font-bold text-foreground tracking-tight font-mono">Sathyanantham V</h3>
                 <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                   isSathyananthamOnline
                     ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                     : 'bg-muted text-muted-foreground border border-border'
                 }`}>
                   <span className={`w-1.5 h-1.5 rounded-full ${isSathyananthamOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                   {isSathyananthamOnline ? 'Online' : 'Offline'}
                 </span>
               </div>
               <p className="text-[11px] text-muted-foreground font-mono">AI Digital Twin Assistant</p>
             </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearMessages}
              title="Clear history"
              className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-muted transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAIDrawerOpen(false)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-3 bg-muted/40 border-b border-border/60 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span className="text-foreground font-mono text-[11px]">AI Twin Active</span>
          </div>

          <button
            onClick={() => setChatMode(chatMode === 'ai_twin' ? 'live_human' : 'ai_twin')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono transition-colors ${
              chatMode === 'live_human'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/40'
                : 'bg-muted text-foreground border-border hover:border-primary/50'
            }`}
          >
            <Radio className={`w-3 h-3 ${isSathyananthamOnline ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'}`} />
            <span>{chatMode === 'live_human' ? 'Live Handoff Mode' : 'AI Twin Mode'}</span>
          </button>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-sans">
          {messages.map((msg: ChatMessage) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                {msg.role === 'user' ? (
                  <>
                    <span>Visitor</span>
                    <User className="w-3 h-3 text-primary" />
                  </>
                ) : (
                  <>
                    <div className="relative w-4 h-4 rounded-full overflow-hidden border border-primary shrink-0">
                      <Image src="/avatar.jpg" alt="Sathyanantham" fill className="object-cover" />
                    </div>
                    <span>{msg.senderName || 'Sathyanantham AI Twin'}</span>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-foreground leading-relaxed shadow-md ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                    : 'bg-muted/80 border border-border/80 rounded-tl-none font-normal backdrop-blur-md'
                }`}
              >
                 <div 
                   className="text-xs leading-relaxed space-y-1"
                   dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                 />
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-primary text-xs font-mono animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>{chatMode === 'live_human' ? 'Connecting live chat...' : 'AI Twin is thinking...'}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-6 py-3 bg-muted/40 border-t border-border/60 backdrop-blur-md">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">// Suggested Inquiries</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(p)}
                className="text-[11px] font-mono text-foreground bg-muted/80 hover:bg-muted hover:text-primary border border-border rounded-xl px-3 py-1.5 text-left transition-colors truncate max-w-full"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Box */}
        <form onSubmit={handleSubmit} className="p-4 bg-card border-t border-border/80 flex items-center gap-2">
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
            className="flex-1 bg-muted/60 border border-border rounded-2xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all resize-none max-h-32 min-h-[42px] font-mono backdrop-blur-sm"
          />
          <Button
            type="submit"
            disabled={!inputText.trim() || (isLoading && chatMode !== 'live_human')}
            size="icon"
            className="rounded-2xl shrink-0 h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

      </div>
    </div>
  );
}
