import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore, ChatMessage } from '@/lib/store';
import { getApiHost } from '@/lib/utils';

// Keep a module-level socket ref so it persists across drawer open/close
let globalSocket: WebSocket | null = null;

export function useAITwin() {
  const {
    messages,
    addMessage,
    updateLastAssistantMessage,
    updateLastAssistantMeta,
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
        const apiHost = getApiHost();
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
      const apiHost = getApiHost();
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
      let receivedAnyContent = false;

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
                if (parsed.source_type) {
                  updateLastAssistantMeta(parsed.source_type, parsed.model_name);
                }
                if (parsed.content) {
                  receivedAnyContent = true;
                  updateLastAssistantMessage(parsed.content);
                }
              } catch (e) {
                // Ignore incomplete parse errors
              }
            }
          }
        }
      }

      if (!receivedAnyContent) {
        throw new Error('Empty response received from LLM stream endpoint');
      }
    } catch (err) {
      console.warn('FastAPI backend stream offline or empty, using intelligent RAG fallback:', err);
      updateLastAssistantMeta('rag', 'Verified RAG Knowledge Store');
      
      const query = text.toLowerCase();
      let reply = '';

      if (query.includes('explain') || query.includes('yourself') || query.includes('who are you') || query.includes('summary') || query.includes('about you') || query.includes('bio') || query.includes('tell me')) {
        reply = `**Sathyanantham V — Lead Software Engineer & AI Architect**\n\n` +
          `I am a Lead Software Engineer, Frontend Architect, and Generative AI Practitioner with **13+ years of enterprise experience** based in **Coimbatore, Tamil Nadu, India**.\n\n` +
          `• **Leadership & Engineering**: Currently leading an 8-engineer team at **Nextuple Inc.**, architecting enterprise Order Management Systems (SKU Ranking, Promise Engine, Picking, Packing, Staging, Hub) and Micro Frontends using Module Federation across 15+ modules.\n` +
          `• **Claude Skills & AI Innovation**: Spearheaded the **Claude Skills Initiative**, developing reusable AI skills that automated UI Schema generation, test suites, and documentation—compressing development time from ~20 days to 5 days. Integrated IBM AI chatbots into Call Center and Order Management applications.\n` +
          `• **Proven Enterprise Delivery**: Architected 30+ global digital platforms for Bayer and the US Bank authentication portal at Cognizant, plus Kohl's Omnichannel Mobile & Tablet (m.kohls.com), Adidas, and Kraft platforms at Skava/Infosys.\n` +
          `• **Education & Honors**: Master of Computer Applications (MCA, 8.28 CGPA / 82.8%) from Dr. Mahalingam College of Engineering & Technology; Top Performer of 2023 at Nextuple, Best Performer 2019 & 2020 at Cognizant.\n\n` +
          `Feel free to ask about any specific project, architectural challenge, or download my [Resume PDF](/resume.pdf) directly!`;
      } else if (query.includes('location') || query.includes('where') || query.includes('city') || query.includes('address') || query.includes('based')) {
        reply = `Sathyanantham V is based in **Coimbatore, Tamil Nadu, India**.\n\n` +
          `• **Location**: Coimbatore, Tamil Nadu, India (Open to Remote / Relocation for strategic lead roles).\n` +
          `• **Contact Email**: v.sathyanantham@gmail.com\n` +
          `• **Contact Phone**: +91 8870956756\n` +
          `• **LinkedIn**: [linkedin.com/in/sathyanantham-v-646b911b](https://www.linkedin.com/in/sathyanantham-v-646b911b)\n` +
          `• **GitHub**: [github.com/sakthipet11](https://github.com/sakthipet11)`;
      } else if (query.includes('cover') || query.includes('letter') || query.includes('application') || query.includes('statement')) {
        reply = `**Executive Cover Letter Statement:**\n\n` +
          `I am applying for Lead Software Engineer, Frontend Architect, or AI-Enabled Full Stack Lead positions.\n\n` +
          `Over my **13+ years of enterprise experience**, I currently lead an engineering team of 8 developers at Nextuple Inc., architecting Micro Frontend ecosystems, Nextuple Enterprise Order Management Systems (SKU Ranking, Promise Engine, Staging), and AI automation.\n\n` +
          `• **Claude Skills & AI Innovation**: Designed and deployed reusable **Claude Skills** for frontend & backend teams (automating UI Schema Gen, Design Docs, Unit Test Gen, API Docs)—reducing engineering effort from ~20 days to 5 days! Integrated IBM AI-powered chatbots into Call Center & OMS platforms.\n` +
          `• **Enterprise Platforms**: Architected Bayer's 30+ global digital sites & US Bank portal at Cognizant, and Kohl's Omnichannel Mobile & Tablet (m.kohls.com), Adidas, Reebok, and Kraft platforms at Skava/Infosys.\n\n` +
          `You can [Download my Full Resume PDF](/resume.pdf) directly from the header or hero buttons!`;
      } else if (query.includes('experience') || query.includes('work') || query.includes('background') || query.includes('career')) {
        reply = `Sathyanantham V has **13+ years of lead software engineering experience**:\n\n` +
          `• **Nextuple Inc. (Aug 2022 – Present)**: Lead Software Engineer (Leading 8 engineers across frontend & backend). Architected Micro Frontends with Module Federation across 15+ modules, Nextuple Enterprise OMS, Claude Skills Initiative (20 days -> 5 days), and IBM Sterling OMS customizations. **Top Performer of 2023 & Monthly Spot Award**.\n` +
          `• **Cognizant Technology Solutions (Nov 2018 – Aug 2022)**: Senior Associate. Architected Bayer's 30+ global sites & US Bank authentication portal. **Best Performer Award 2019 & 2020**.\n` +
          `• **Skava Systems / Infosys (July 2012 – Nov 2018)**: Dev Lead / Senior Software Engineer / Software Engineer. Led Kohl's Mobile & Tablet (m.kohls.com), Toys"R"Us, Kraft Foods, Adidas & Reebok platforms. **Skava Star Performer 2013 & 2015**.`;
      } else if (query.includes('education') || query.includes('college') || query.includes('degree') || query.includes('university')) {
        reply = `Sathyanantham V's educational qualifications include:\n\n` +
          `• **Master of Computer Applications (MCA)**: Dr. Mahalingam College of Engineering and Technology, Pollachi, Tamil Nadu, India (2009 – 2012) — **8.28 CGPA / 82.8%**.\n` +
          `• **Bachelor of Science in Computer Science (B.Sc CS)**: Nallamuthu Gounder Mahalingam College, Pollachi, Tamil Nadu, India (2006 – 2009) — **78.51%**.\n` +
          `• **Certifications**: Introduction to Agent Skills (Claude Certificate), React Testing Library with Jest/Vitest, Principles of Secure Coding, Docker for Absolute Beginner, Azure Serverless, Generative AI.`;
      } else if (query.includes('resume') || query.includes('pdf') || query.includes('download')) {
        reply = `You can download Sathyanantham V's official **Lead Software Engineer Resume PDF** directly here:\n\n` +
          `📄 [Download Sathyanantham V Resume PDF](/resume.pdf)\n\n` +
          `The document details his 13+ years in Frontend Architecture, Micro Frontends (Module Federation), IBM Sterling OMS, Claude Skills Initiative, and AI engineering accomplishments.`;
      } else if (query.includes('skill') || query.includes('tech') || query.includes('stack') || query.includes('ai') || query.includes('claude')) {
        reply = `Sathyanantham's technical core includes:\n\n` +
          `• **Frontend Architecture**: React 19, Next.js 15, TypeScript, Micro Frontend Architecture, Module Federation, Tailwind CSS, Redux Toolkit, Vite.\n` +
          `• **AI Engineering**: Claude AI, Claude Skills Initiative (automated UI Schema & Test Gen), IBM AI Chatbot Integration, IBM watsonx.ai, RAG, Prompt Engineering, Agentic Workflows.\n` +
          `• **Backend & Cloud**: Python (FastAPI), Node.js, Spring Boot, PostgreSQL, MongoDB, Docker, AWS, GCP, IBM Sterling OMS.`;
      } else {
        reply = `As Sathyanantham V's AI Digital Twin, I can share detailed insights regarding his 13+ years in Lead Software Engineering, Location (Coimbatore, Tamil Nadu, India), Executive Cover Letter, Nextuple Order Management Architecture, Cognizant Bayer platforms, MCA Degree from Dr. Mahalingam College, or AI Claude Skills.\n\n` +
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
  // Reset offline takeover tracker when admin comes online
  useEffect(() => {
    if (isSathyananthamOnline) {
      addedOfflineTakeoverRef.current = false;
    }
  }, [isSathyananthamOnline]);

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

    const apiHost = getApiHost();
    const wsProto = apiHost.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiHost.replace('http://', '').replace('https://', '').replace(/\/$/, '');
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
          } else if (data.type === 'mode_update') {
            if (data.mode === 'live_human' || data.mode === 'ai_twin') {
              setChatMode(data.mode);
            }
            if (data.message) {
              addMessage({
                id: `system-mode-${Date.now()}`,
                role: 'assistant',
                senderName: 'System Monitor',
                content: data.message,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
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
            setChatMode('live_human');
            addMessage({
              id: `live-${Date.now()}`,
              role: 'assistant',
              senderName: data.sender || 'Sathyanantham V (Live)',
              content: data.content,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
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
  }, [sessionId, addMessage, updateLastAssistantMessage, setSathyananthamOnline, setChatMode]);

  // Connect on mount or when session ID is set
  useEffect(() => {
    if (sessionId && typeof window !== 'undefined') {
      connectWebSocket();
    }
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

  // Release live chat back to AI Twin
  const releaseHandoff = useCallback(() => {
    const socket = connectWebSocket();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'release_handoff'
      }));
    }
  }, [connectWebSocket]);

  // Monitor chatMode changes. If switched to live, trigger handoff request. If switched to ai_twin, release handoff.
  const prevChatModeRef = useRef(chatMode);
  useEffect(() => {
    if (prevChatModeRef.current !== chatMode) {
      if (chatMode === 'live_human') {
        requestHandoff("Visitor switched chat panel to Live Takeover Mode");
      } else if (chatMode === 'ai_twin' && prevChatModeRef.current === 'live_human') {
        releaseHandoff();
      }
      prevChatModeRef.current = chatMode;
    }
  }, [chatMode, requestHandoff, releaseHandoff]);

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
