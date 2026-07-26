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
  
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (chunk: string) => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAIDrawerOpen: false,
  setAIDrawerOpen: (open: boolean) => set({ isAIDrawerOpen: open }),
  toggleAIDrawer: () => set((state: AppState) => ({ isAIDrawerOpen: !state.isAIDrawerOpen })),
  
  selectedModel: 'anthropic/claude-3.5-sonnet',
  setSelectedModel: (model: string) => set({ selectedModel: model }),
  
  isSathyananthamOnline: false,
  setSathyananthamOnline: (online: boolean) => set({ isSathyananthamOnline: online }),
  
  chatMode: 'ai_twin',
  setChatMode: (mode: 'ai_twin' | 'live_human') => set({ chatMode: mode }),
  
  messages: [
    {
      id: 'welcome-1',
      role: 'assistant',
      senderName: 'Sathyanantham AI Twin',
      content: "Hello! 👋 I'm Sathyanantham V's AI Digital Twin, built using OpenRouter RAG over his 13+ years career docs. Ask me anything about his Lead Engineering experience, Nextuple Order Management System, Bayer 30+ sites architecture, or AI/LLM stack!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: ['Sathyanantham V Resume & Career Docs']
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
