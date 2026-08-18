// @ts-nocheck
import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  senderName?: string;
  sources?: string[];
  toolAction?: string;
}

interface AppState {
  isAIDrawerOpen: boolean;
  setAIDrawerOpen: (open: boolean) => void;
  toggleAIDrawer: () => void;
  
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  
  isSathyananthamOnline: boolean;
  setSathyananthamOnline: (online: boolean) => void;
  
  chatMode: 'ai_twin' | 'live_human';
  setChatMode: (mode: 'ai_twin' | 'live_human') => void;
  
  sessionId: string;
  setSessionId: (id: string) => void;
  
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (chunk: string) => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAIDrawerOpen: false,
  setAIDrawerOpen: (open: boolean) => set({ isAIDrawerOpen: open }),
  toggleAIDrawer: () => set((state: AppState) => ({ isAIDrawerOpen: !state.isAIDrawerOpen })),
  
  selectedModel: process.env.NEXT_PUBLIC_LLM_MODEL || process.env.NEXT_PUBLIC_OPENROUTER_API_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free',
  setSelectedModel: (model: string) => set({ selectedModel: model }),
  
  isSathyananthamOnline: false,
  setSathyananthamOnline: (online: boolean) => set({ isSathyananthamOnline: online }),
  
  chatMode: 'ai_twin',
  setChatMode: (mode: 'ai_twin' | 'live_human') => set({ chatMode: mode }),
  
  sessionId: '',
  setSessionId: (id: string) => set({ sessionId: id }),
  
  messages: [
    {
      id: 'welcome-1',
      role: 'assistant',
      senderName: 'Sathyanantham AI Twin',
      content: "Hello! 👋 I'm Sathyanantham V's AI Digital Twin. I can share details about my 13+ years of experience as a Lead Software Engineer, Frontend Architect, and AI Integrator. Ask me anything about my work on Order Management Systems, React/Next.js architectures, or how to get in touch with me directly!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ],
  addMessage: (msg: ChatMessage) => set((state: AppState) => ({ messages: [...state.messages, msg] })),
  updateLastAssistantMessage: (chunk: string) => set((state: AppState) => {
    const msgs = [...state.messages];
    const last = msgs[msgs.length - 1];
    if (last && last.role === 'assistant') {
      last.content += chunk;
      return { messages: msgs };
    }
    return state;
  }),
  clearMessages: () => set({
    messages: [
      {
        id: 'welcome-reset',
        role: 'assistant',
        senderName: 'Sathyanantham AI Twin',
        content: "Chat history cleared. How can I assist you with Sathyanantham's portfolio today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  })
}));
