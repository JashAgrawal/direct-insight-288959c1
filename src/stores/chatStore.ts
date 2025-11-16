import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  agentId?: string; // which agent responded
  ideaId?: string; // associated idea if any
}

interface ChatState {
  messages: Message[];
  apiKey: string | null;
  isLoading: boolean;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setApiKey: (key: string) => void;
  setLoading: (loading: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      apiKey: null,
      isLoading: false,
      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            },
          ],
        })),
      setApiKey: (key) => set({ apiKey: key }),
      setLoading: (loading) => set({ isLoading: loading }),
      clearChat: () => set({ messages: [] }),
    }),
    {
      name: 'oracle-chat-storage',
    }
  )
);
