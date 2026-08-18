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
  Radio,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

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
    return `<pre class="bg-muted/90 border border-border/80 rounded-xl p-3 my-2.5 overflow-x-auto font-mono text-[11px] text-primary leading-relaxed"><code>${code.trim()}</code></pre>`;
  });

  // 2. Markdown Tables: | col1 | col2 |\n|---|---|\n| val1 | val2 |
  const tableRegex = /(?:(?:^|\n)\|[^\n]+\|\n\|[\s\-:\t|]+\|\n(?:\|[^\n]+\|\n?)*)/g;
  html = html.replace(tableRegex, (tableMatch) => {
    const rawLines = tableMatch.trim().split('\n');
    if (rawLines.length < 2) return tableMatch;

    const headerLine = rawLines[0];
    const bodyLines = rawLines.slice(2); // Skip separator line (|---|---|)

    const headers = headerLine.split('|').slice(1, -1).map(h => h.trim());

    let tableHtml = `<div class="my-3 overflow-x-auto rounded-2xl border border-border/80 bg-muted/40 shadow-xs backdrop-blur-md"><table class="w-full text-left text-xs border-collapse font-sans font-normal min-w-[280px]">`;
    tableHtml += `<thead class="bg-muted/90 text-primary border-b border-border/70 font-mono text-[11px] uppercase tracking-wider font-semibold"><tr>`;
    headers.forEach(h => {
      tableHtml += `<th class="px-3.5 py-2.5 border-r border-border/30 last:border-r-0 font-mono text-primary font-bold">${h}</th>`;
    });
    tableHtml += `</tr></thead><tbody class="divide-y divide-border/30 text-foreground/90 font-normal">`;

    bodyLines.forEach((rowStr, rIdx) => {
      const cells = rowStr.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length > 0) {
        tableHtml += `<tr class="${rIdx % 2 === 0 ? 'bg-card/60' : 'bg-muted/20'} hover:bg-primary/10 transition-colors">`;
        cells.forEach(cell => {
          tableHtml += `<td class="px-3.5 py-2.5 border-r border-border/30 last:border-r-0 leading-relaxed font-sans text-foreground/90">${cell}</td>`;
        });
        tableHtml += `</tr>`;
      }
    });

    tableHtml += `</tbody></table></div>`;
    return tableHtml;
  });

  // 3. Inline code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-muted border border-border px-1.5 py-0.5 rounded font-mono text-[10px] text-primary">$1</code>');

  // 4. Process Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-primary">$1</strong>');

  // 5. Process Headers
  html = html.replace(/^### (.*?)$/gm, '<h4 class="font-bold text-primary text-xs mt-3.5 mb-1">$1</h4>');
  html = html.replace(/^## (.*?)$/gm, '<h3 class="font-bold text-primary text-sm mt-4 mb-1.5">$1</h3>');
  html = html.replace(/^# (.*?)$/gm, '<h2 class="font-black text-foreground text-base mt-5 mb-2">$1</h2>');

  // 6. Blockquotes
  html = html.replace(/^> (.*?)$/gm, '<blockquote class="border-l-2 border-primary pl-3 my-2 italic text-muted-foreground font-serif text-xs">$1</blockquote>');

  // 7. Lists (Unordered & Ordered)
  const lines = html.split('\n');
  let inUl = false;
  let inOl = false;
  let insidePre = false;
  let insideTable = false;
  
  const processed = lines.map((line) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('<pre') || trimmed.includes('class="language-')) {
      insidePre = true;
    }
    if (trimmed.startsWith('<div class="my-3 overflow-x-auto')) {
      insideTable = true;
    }
    if (insidePre) {
      if (trimmed.endsWith('</pre>')) {
        insidePre = false;
      }
      return line;
    }
    if (insideTable) {
      if (trimmed.endsWith('</div>')) {
        insideTable = false;
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
        prefix += '<ul class="my-2 space-y-1.5 list-disc pl-4 text-foreground/85">';
      }
      return `${prefix}<li class="pl-0.5 leading-relaxed">${ulMatch[2]}</li>`;
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
        prefix += '<ol class="my-2 space-y-1.5 list-decimal pl-4 text-foreground/85">';
      }
      return `${prefix}<li class="pl-0.5 leading-relaxed">${olMatch[2]}</li>`;
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

  // 8. Process links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary font-medium underline hover:opacity-80 transition-opacity">$1</a>');

  // 9. Line breaks
  const finalLines = html.split('\n');
  let currentPre = false;
  let currentList = false;
  let currentTable = false;
  
  html = finalLines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('<pre')) currentPre = true;
    if (trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) currentList = true;
    if (trimmed.startsWith('<div class="my-3 overflow-x-auto')) currentTable = true;
    
    let result = line;
    const isBlockTag = trimmed.startsWith('<ul') || trimmed.startsWith('</ul>') || 
                       trimmed.startsWith('<ol') || trimmed.startsWith('</ol>') || 
                       trimmed.startsWith('<li') || trimmed.startsWith('</li>') || 
                       trimmed.startsWith('<pre') || trimmed.startsWith('</pre>') ||
                       trimmed.startsWith('<div') || trimmed.startsWith('</div>') ||
                       trimmed.startsWith('<table') || trimmed.startsWith('</table>') ||
                       trimmed.startsWith('<thead') || trimmed.startsWith('</thead>') ||
                       trimmed.startsWith('<tbody') || trimmed.startsWith('</tbody>') ||
                       trimmed.startsWith('<tr') || trimmed.startsWith('</tr>') ||
                       trimmed.startsWith('<td') || trimmed.startsWith('</td>') ||
                       trimmed.startsWith('<th') || trimmed.startsWith('</th>') ||
                       trimmed.startsWith('<blockquote') || trimmed.startsWith('</blockquote>') ||
                       trimmed.startsWith('<h2') || trimmed.startsWith('<h3') || trimmed.startsWith('<h4');
                       
    if (!currentPre && !currentList && !currentTable && !isBlockTag && trimmed.length > 0) {
      result += '<br />';
    }
    
    if (trimmed.endsWith('</pre>')) currentPre = false;
    if (trimmed.endsWith('</ul>') || trimmed.endsWith('</ol>')) currentList = false;
    if (trimmed.endsWith('</div>')) currentTable = false;
    
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
  const [isPromptsExpanded, setIsPromptsExpanded] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when drawer is open to prevent backside page scrolling
  useEffect(() => {
    if (isAIDrawerOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isAIDrawerOpen]);

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
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-background/70 backdrop-blur-sm transition-opacity duration-300 overscroll-contain"
      onClick={() => setAIDrawerOpen(false)}
      onWheel={(e) => e.stopPropagation()}
    >
      
      {/* Glass Slide-over Container */}
      <div
        className="relative w-full max-w-lg h-full max-h-screen bg-card/95 border-l border-border/80 shadow-2xl backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300 overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border shrink-0">
              <Image
                src="/avatar.jpg"
                alt="Sathyanantham V"
                fill
                className="object-cover"
              />
            </div>
             <div>
               <div className="flex items-center gap-2">
                 <h3 className="text-sm font-semibold text-foreground tracking-tight">Sathyanantham V</h3>
                 <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                   isSathyananthamOnline
                     ? 'bg-primary/10 text-primary border border-primary/30'
                     : 'bg-muted text-muted-foreground border border-border'
                 }`}>
                   <span className={`w-1.5 h-1.5 rounded-full ${isSathyananthamOnline ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                   {isSathyananthamOnline ? 'Online' : 'Offline'}
                 </span>
               </div>
               <p className="text-[11px] text-muted-foreground font-mono">AI Digital Twin Assistant</p>
             </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={clearMessages}
              title="Clear history"
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAIDrawerOpen(false)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-2.5 bg-muted/40 border-b border-border/60 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span className="text-foreground font-mono text-[11px]">AI Twin Active</span>
          </div>

          <button
            onClick={() => setChatMode(chatMode === 'ai_twin' ? 'live_human' : 'ai_twin')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono transition-colors cursor-pointer ${
              chatMode === 'live_human'
                ? 'bg-primary/10 text-primary border-primary/40'
                : 'bg-muted text-foreground border-border hover:border-primary/50'
            }`}
          >
            <Radio className={`w-3 h-3 ${isSathyananthamOnline ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
            <span>{chatMode === 'live_human' ? 'Live Handoff Mode' : 'AI Twin Mode'}</span>
          </button>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth p-6 space-y-4 text-xs font-sans">
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
                    <div className="relative w-4 h-4 rounded-full overflow-hidden border border-border shrink-0">
                      <Image src="/avatar.jpg" alt="Sathyanantham" fill className="object-cover" />
                    </div>
                    <span>{msg.senderName || 'Sathyanantham AI Twin'}</span>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-foreground leading-relaxed shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                    : 'bg-card border border-border/80 rounded-tl-none font-normal backdrop-blur-md'
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
              <Sparkles className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>{chatMode === 'live_human' ? 'Connecting live chat...' : 'AI Twin is thinking...'}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Prompts (Collapsible, Default Expanded) */}
        <div className="px-6 py-2.5 bg-muted/30 border-t border-border/60 backdrop-blur-md transition-all duration-300">
          <div
            onClick={() => setIsPromptsExpanded(!isPromptsExpanded)}
            className="flex items-center justify-between cursor-pointer select-none py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wider">// Suggested Inquiries</p>
            <button
              type="button"
              className="p-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={isPromptsExpanded ? "Collapse suggested inquiries" : "Expand suggested inquiries"}
            >
              {isPromptsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {isPromptsExpanded && (
            <div className="flex flex-wrap gap-1.5 pt-2 pb-1 animate-in fade-in slide-in-from-top-1 duration-200">
              {SUGGESTED_PROMPTS.map((p, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  onClick={() => handlePromptClick(p)}
                  className="text-[11px] font-mono text-foreground bg-card/60 hover:bg-muted hover:text-primary border-border/70 rounded-xl px-3 py-1.5 text-left transition-colors cursor-pointer truncate max-w-full font-normal"
                >
                  {p}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Input Box */}
        <form onSubmit={handleSubmit} className="p-4 bg-card border-t border-border/70 flex items-center gap-2">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={Math.min(4, inputText.split('\n').length || 1)}
            placeholder={chatMode === 'live_human' ? 'Send direct message to Sathyanantham V...' : 'Ask AI Twin about experience, projects, stack...'}
            className="flex-1 min-h-[42px] max-h-32 resize-none"
          />
          <Button
            type="submit"
            disabled={!inputText.trim() || (isLoading && chatMode !== 'live_human')}
            size="icon"
            className="rounded-2xl shrink-0 h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground/50 disabled:opacity-60 transition-colors"
          >
            <Send className="w-4 h-4 text-current" />
          </Button>
        </form>

      </div>
    </div>
  );
}
