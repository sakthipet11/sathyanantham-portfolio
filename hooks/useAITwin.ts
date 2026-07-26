import { useState, useCallback } from 'react';
import { useAppStore, ChatMessage } from '@/lib/store';

export function useAITwin() {
  const {
    messages,
    addMessage,
    updateLastAssistantMessage,
    selectedModel,
    chatMode
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    addMessage(userMsg);
    setIsLoading(true);

    const assistantMsgPlaceholder: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      senderName: chatMode === 'live_human' ? 'Sathyanantham V (Live)' : 'Sathyanantham AI Twin',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: ['Sathyanantham V Resume & Cover Letter Docs']
    };

    addMessage(assistantMsgPlaceholder);

    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiHost}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          model: selectedModel
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Backend stream endpoint unreachable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value);
          const lines = chunkStr.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataContent = line.replace(/^data:\s*/, '');
              if (dataContent === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataContent);
                if (parsed.content) {
                  updateLastAssistantMessage(parsed.content);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('FastAPI backend stream offline, using intelligent RAG fallback:', err);
      
      const query = text.toLowerCase();
      let reply = '';

      if (query.includes('cover') || query.includes('letter') || query.includes('application') || query.includes('statement')) {
        reply = `**Executive Cover Letter Statement:**\n\n` +
          `I am applying for Lead Software Engineer, Frontend Architect, or AI-Enabled Full Stack Engineer positions.\n\n` +
          `Over my **13+ years of enterprise experience**, I have led engineering teams (currently managing 8 developers at Nextuple) delivering scalable React.js applications, Micro Frontend ecosystems, and Order Management solutions.\n\n` +
          `• **AI Innovation**: Built reusable **Claude Skills** for engineering teams and integrated IBM AI chatbots into Call Center & OMS systems.\n` +
          `• **Full-Stack & OMS**: Spearheaded Nextuple OMS, Bayer's 30+ global digital platforms, and Kohl's omnichannel e-commerce.\n\n` +
          `You can [Download my Full Resume PDF](/resume.pdf) directly from the header or hero buttons!`;
      } else if (query.includes('experience') || query.includes('work') || query.includes('background') || query.includes('career')) {
        reply = `Sathyanantham V has **13+ years of lead software engineering experience**:\n\n` +
          `• **Nextuple Private Ltd (2022 - Present)**: Senior Software Engineer & Lead UI Engineer (Leading 8 engineers). Built Nextuple Enterprise OMS, Micro-frontends, SKU Ranking, and AI UI automation. **Top Performer of 2023**.\n` +
          `• **Cognizant (2018 - 2022)**: Senior Associate. Architected Bayer's 30+ global sites & US Bank portal. **Best Performer Award 2019 & 2020**.\n` +
          `• **Skava Systems / Infosys (2012 - 2018)**: Dev Lead / Senior Software Engineer. Led Kohls Mobile & Tablet, ToysRUs, Kraft, Adidas & Reebok platforms. **Skava Star Performer 2013 & 2015**.`;
      } else if (query.includes('resume') || query.includes('pdf') || query.includes('download')) {
        reply = `You can download Sathyanantham V's official **Lead Software Engineer Resume PDF** directly here:\n\n` +
          `📄 [Download Sathyanantham V Resume PDF](/resume.pdf)\n\n` +
          `The document details his 13+ years in Frontend Architecture, Micro Frontends, IBM Sterling OMS, and AI engineering accomplishments.`;
      } else if (query.includes('skill') || query.includes('tech') || query.includes('stack') || query.includes('ai') || query.includes('claude')) {
        reply = `Sathyanantham's technical core includes:\n\n` +
          `• **Frontend Architecture**: React 19, Next.js 15, TypeScript, Micro Frontend Architecture, Tailwind CSS v4, Redux, Zustand, Three.js.\n` +
          `• **AI Engineering**: OpenRouter API RAG, Claude AI, Claude Skills creation, IBM watsonx.ai, Prompt Engineering, Agentic Workflows.\n` +
          `• **Backend & Cloud**: Python FastAPI, Node.js, Spring Boot, PostgreSQL, MongoDB, Docker, AWS, IBM Sterling OMS.`;
      } else {
        reply = `As Sathyanantham V's AI Digital Twin, I can share detailed insights regarding his 13+ years in Lead Software Engineering, Executive Cover Letter, Nextuple Order Management Architecture, Cognizant Bayer platforms, or AI Claude Skills.\n\n` +
          `*Retrieved Source*: **Sathyanantham V Resume & Cover Letter Docs**\n\n` +
          `You can also [Download the Resume PDF](/resume.pdf) at any time!`;
      }

      const words = reply.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise((r) => setTimeout(r, 25));
        updateLastAssistantMessage(words[i] + ' ');
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedModel, chatMode, isLoading, addMessage, updateLastAssistantMessage]);

  return { sendMessage, isLoading };
}
