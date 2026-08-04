import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore, ChatMessage } from '@/lib/store';

// Keep a module-level socket ref so it persists across drawer open/close
let globalSocket: WebSocket | null = null;

export function useAITwin() {
  const {
    messages,
    addMessage,
    updateLastAssistantMessage,
    selectedModel,
    chatMode,
    setChatMode,
    sessionId,
    isSathyananthamOnline,
    setSathyananthamOnline
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);

  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const chatModeRef = useRef(chatMode);
  useEffect(() => {
    chatModeRef.current = chatMode;
  }, [chatMode]);

  // Synchronous refs to prevent double execution of messages in React Strict Mode/Fast Refresh
  const addedOfflineTakeoverRef = useRef(false);
  const addedHandoffApologyRef = useRef(false);

  // Fetch initial presence status from backend on mount
  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiHost}/api/presence`);
        const data = await res.json();
        setSathyananthamOnline(data.is_online);
      } catch (err) {
        console.warn("Failed fetching initial presence:", err);
      }
    };
    fetchPresence();
  }, [setSathyananthamOnline]);
  const streamResponse = useCallback(async (text: string, currentHistory: ChatMessage[]) => {
    const assistantMsgPlaceholder: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      senderName: 'Sathyanantham AI Twin',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: ['Sathyanantham V Resume & Cover Letter Docs']
    };

    addMessage(assistantMsgPlaceholder);
    setIsLoading(true);

    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiHost}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentHistory.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          session_id: sessionId
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Backend stream endpoint unreachable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const parts = buffer.split('\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('data: ')) {
              const dataContent = trimmed.slice(6);
              if (dataContent === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataContent);
                if (parsed.content) {
                  updateLastAssistantMessage(parsed.content);
                }
              } catch (e) {
                // Ignore incomplete parse errors
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
  }, [selectedModel, sessionId, addMessage, updateLastAssistantMessage]);
  // Fallback to AI Twin if visitor switches to live mode while admin is offline
  useEffect(() => {
    if (chatMode === 'live_human' && !isSathyananthamOnline) {
      if (addedOfflineTakeoverRef.current) {
        setChatMode('ai_twin');
        return;
      }
      addedOfflineTakeoverRef.current = true;

      addMessage({
        id: `offline-takeover-${Date.now()}`,
        role: 'assistant',
        senderName: 'Sathyanantham AI Twin',
        content: "Sathyanantham V is currently offline. Please share your contact details (Name, Email, Phone number, and Purpose of connection) here, and I will record them and notify him immediately!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setChatMode('ai_twin');
    }
  }, [chatMode, isSathyananthamOnline, addMessage, setChatMode]);

  // Handoff timeout to AI Twin fallback if admin is online but doesn't respond in the configured time
  useEffect(() => {
    if (chatMode !== 'live_human' || !isSathyananthamOnline) return;

    // Check if the last message was from the user
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user') return;

    const timeoutDuration = Number(process.env.NEXT_PUBLIC_LIVE_HANDOFF_TIMEOUT) || 60000;

    const timer = setTimeout(async () => {
      const currentMsgs = messagesRef.current;
      const latest = currentMsgs[currentMsgs.length - 1];
      if (latest && latest.role === 'user') {
        if (addedHandoffApologyRef.current) {
          setChatMode('ai_twin');
          return;
        }
        addedHandoffApologyRef.current = true;

        addMessage({
          id: `takeover-apology-${Date.now()}`,
          role: 'assistant',
          senderName: 'Sathyanantham AI Twin',
          content: "I'm very sorry, but Sathyanantham is currently occupied or away from his desk. As his AI Twin, I would be happy to help you! Please share your contact details (Name, Email, Phone number, and Purpose of connection) so he can follow up with you as soon as he is back online. In the meantime, here is the answer to your inquiry:",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        setChatMode('ai_twin');
        
        // Trigger the LLM streaming response for the last user message
        await streamResponse(latest.content, currentMsgs);
      }
    }, timeoutDuration);

    return () => clearTimeout(timer);
  }, [chatMode, messages, isSathyananthamOnline, addMessage, setChatMode, streamResponse]);

  // Initialize and connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (globalSocket && (globalSocket.readyState === WebSocket.OPEN || globalSocket.readyState === WebSocket.CONNECTING)) {
      return globalSocket;
    }

    const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsProto = apiHost.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiHost.replace('http://', '').replace('https://', '');
    const wsUrl = `${wsProto}://${wsHost}/ws/chat?session_id=${sessionId}&role=visitor`;

    try {
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connection established.');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'presence_update') {
            setSathyananthamOnline(data.is_online);
          } else if (data.type === 'ai_stream_chunk') {
            setIsLoading(false);
            const currentMsgs = messagesRef.current;
            const lastMsg = currentMsgs[currentMsgs.length - 1];
            if (!lastMsg || lastMsg.role !== 'assistant') {
              addMessage({
                id: `assistant-ws-${Date.now()}`,
                role: 'assistant',
                senderName: 'Sathyanantham AI Twin',
                content: data.chunk,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sources: ['Sathyanantham V Resume & Cover Letter Docs']
              });
            } else {
              updateLastAssistantMessage(data.chunk);
            }
          } else if (data.type === 'ai_stream_end') {
            setIsLoading(false);
          } else if (data.type === 'human_response') {
            setIsLoading(false);
            addMessage({
              id: `live-${Date.now()}`,
              role: 'assistant',
              senderName: data.sender || 'Sathyanantham V (Live)',
              content: data.content,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            // If visitor has live mode off, guide them on how to respond!
            if (chatModeRef.current === 'ai_twin') {
              addMessage({
                id: `system-live-prompt-${Date.now()}`,
                role: 'assistant',
                senderName: 'Sathyanantham AI Twin',
                content: "Sathyanantham V is currently online and has messaged you! If you would like to reply directly, please enable **Live Handoff Mode** at the top of the chat (which will notify him). Otherwise, you can continue chatting with me (his AI Twin).",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
          } else if (data.type === 'system') {
            setIsLoading(false);
            addMessage({
              id: `system-${Date.now()}`,
              role: 'assistant',
              senderName: 'System Monitor',
              content: data.content,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
        } catch (e) {
          console.warn('Failed parsing socket message:', e);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed.');
        globalSocket = null;
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      globalSocket = socket;
      return socket;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      return null;
    }
  }, [sessionId, addMessage, updateLastAssistantMessage, setSathyananthamOnline]);

  // Connect on mount or when session ID is set
  useEffect(() => {
    if (sessionId && typeof window !== 'undefined') {
      connectWebSocket();
    }
    return () => {
      // Keep socket open so chat is persistent, but clean up listeners if needed
    };
  }, [sessionId, connectWebSocket]);

  // Handle live chat takeover request
  const requestHandoff = useCallback((reason: string) => {
    const socket = connectWebSocket();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'request_handoff',
        notes: reason
      }));
    } else {
      // If server is offline, just simulate the response
      setIsLoading(true);
      setTimeout(() => {
        addMessage({
          id: `handoff-system-${Date.now()}`,
          role: 'assistant',
          senderName: 'System Monitor',
          content: 'Sathyanantham V is currently offline. Your live takeover request has been recorded. Feel free to leave your contact details!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setIsLoading(false);
      }, 1000);
    }
  }, [connectWebSocket, addMessage]);

  // Monitor chatMode changes. If switched to live, trigger handoff request.
  useEffect(() => {
    if (chatMode === 'live_human') {
      requestHandoff("Visitor switched chat panel to Live Takeover Mode");
    }
  }, [chatMode, requestHandoff]);

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

    const socket = connectWebSocket();
    
    // If in Live Mode and WebSocket is connected, route through socket
    if (chatMode === 'live_human' && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'user_message',
        content: text,
        history: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      }));
      setIsLoading(false);
      return;
    }

    // Otherwise, route through standard HTTP SSE stream
    await streamResponse(text, [...messages, userMsg]);
  }, [messages, chatMode, isLoading, addMessage, connectWebSocket, streamResponse]);

  return { sendMessage, isLoading };
}
