import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  agentId?: string; // which agent responded
}

// Per-idea chat storage structure
interface IdeaChats {
  [ideaId: string]: Message[];
}

interface AgentChats {
  [ideaId: string]: {
    [agentId: string]: Message[];
  };
}

interface ChatState {
  // Oracle chats per idea
  oracleChats: IdeaChats;

  // Individual agent chats per idea
  agentChats: AgentChats;

  // HiveMind orchestrator chats per idea (shared context)
  hivemindChats: IdeaChats;

  // Boardroom/meeting chats per idea (shared context)
  boardroomChats: IdeaChats;

  isLoading: boolean;

  // Oracle chat methods
  addOracleMessage: (ideaId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  getOracleMessages: (ideaId: string) => Message[];
  clearOracleChat: (ideaId: string) => void;

  // Agent chat methods
  addAgentMessage: (ideaId: string, agentId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  getAgentMessages: (ideaId: string, agentId: string) => Message[];
  clearAgentChat: (ideaId: string, agentId: string) => void;

  // HiveMind chat methods
  addHivemindMessage: (ideaId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  getHivemindMessages: (ideaId: string) => Message[];
  clearHivemindChat: (ideaId: string) => void;

  // Boardroom chat methods
  addBoardroomMessage: (ideaId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  getBoardroomMessages: (ideaId: string) => Message[];
  clearBoardroomChat: (ideaId: string) => void;

  // Shared context for Assistant (can see everything)
  getAssistantContext: (ideaId: string) => {
    oracle: Message[];
    agents: { [agentId: string]: Message[] };
    hivemind: Message[];
    boardroom: Message[];
  };

  // Shared context for regular agents (can see HiveMind + Boardroom only)
  getSharedContext: (ideaId: string) => {
    hivemind: Message[];
    boardroom: Message[];
  };

  setLoading: (loading: boolean) => void;

  // Delete all chats for an idea
  deleteIdeaChats: (ideaId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      oracleChats: {},
      agentChats: {},
      hivemindChats: {},
      boardroomChats: {},
      isLoading: false,

      // Oracle chat methods
      addOracleMessage: (ideaId, message) =>
        set((state) => ({
          oracleChats: {
            ...state.oracleChats,
            [ideaId]: [
              ...(state.oracleChats[ideaId] || []),
              {
                ...message,
                id: crypto.randomUUID(),
                timestamp: Date.now(),
              },
            ],
          },
        })),

      getOracleMessages: (ideaId) => {
        const state = get();
        return state.oracleChats[ideaId] || [];
      },

      clearOracleChat: (ideaId) =>
        set((state) => ({
          oracleChats: {
            ...state.oracleChats,
            [ideaId]: [],
          },
        })),

      // Agent chat methods
      addAgentMessage: (ideaId, agentId, message) =>
        set((state) => ({
          agentChats: {
            ...state.agentChats,
            [ideaId]: {
              ...(state.agentChats[ideaId] || {}),
              [agentId]: [
                ...((state.agentChats[ideaId]?.[agentId]) || []),
                {
                  ...message,
                  id: crypto.randomUUID(),
                  timestamp: Date.now(),
                  agentId,
                },
              ],
            },
          },
        })),

      getAgentMessages: (ideaId, agentId) => {
        const state = get();
        return state.agentChats[ideaId]?.[agentId] || [];
      },

      clearAgentChat: (ideaId, agentId) =>
        set((state) => ({
          agentChats: {
            ...state.agentChats,
            [ideaId]: {
              ...(state.agentChats[ideaId] || {}),
              [agentId]: [],
            },
          },
        })),

      // HiveMind chat methods
      addHivemindMessage: (ideaId, message) =>
        set((state) => ({
          hivemindChats: {
            ...state.hivemindChats,
            [ideaId]: [
              ...(state.hivemindChats[ideaId] || []),
              {
                ...message,
                id: crypto.randomUUID(),
                timestamp: Date.now(),
              },
            ],
          },
        })),

      getHivemindMessages: (ideaId) => {
        const state = get();
        return state.hivemindChats[ideaId] || [];
      },

      clearHivemindChat: (ideaId) =>
        set((state) => ({
          hivemindChats: {
            ...state.hivemindChats,
            [ideaId]: [],
          },
        })),

      // Boardroom chat methods
      addBoardroomMessage: (ideaId, message) =>
        set((state) => ({
          boardroomChats: {
            ...state.boardroomChats,
            [ideaId]: [
              ...(state.boardroomChats[ideaId] || []),
              {
                ...message,
                id: crypto.randomUUID(),
                timestamp: Date.now(),
              },
            ],
          },
        })),

      getBoardroomMessages: (ideaId) => {
        const state = get();
        return state.boardroomChats[ideaId] || [];
      },

      clearBoardroomChat: (ideaId) =>
        set((state) => ({
          boardroomChats: {
            ...state.boardroomChats,
            [ideaId]: [],
          },
        })),

      // Get full context for Assistant (sees everything)
      getAssistantContext: (ideaId) => {
        const state = get();
        return {
          oracle: state.oracleChats[ideaId] || [],
          agents: state.agentChats[ideaId] || {},
          hivemind: state.hivemindChats[ideaId] || [],
          boardroom: state.boardroomChats[ideaId] || [],
        };
      },

      // Get shared context for regular agents (HiveMind + Boardroom only)
      getSharedContext: (ideaId) => {
        const state = get();
        return {
          hivemind: state.hivemindChats[ideaId] || [],
          boardroom: state.boardroomChats[ideaId] || [],
        };
      },

      setLoading: (loading) => set({ isLoading: loading }),

      // Delete all chats for an idea
      deleteIdeaChats: (ideaId) =>
        set((state) => {
          const newOracleChats = { ...state.oracleChats };
          const newAgentChats = { ...state.agentChats };
          const newHivemindChats = { ...state.hivemindChats };
          const newBoardroomChats = { ...state.boardroomChats };

          delete newOracleChats[ideaId];
          delete newAgentChats[ideaId];
          delete newHivemindChats[ideaId];
          delete newBoardroomChats[ideaId];

          return {
            oracleChats: newOracleChats,
            agentChats: newAgentChats,
            hivemindChats: newHivemindChats,
            boardroomChats: newBoardroomChats,
          };
        }),
    }),
    {
      name: 'noshit-chats-storage',
    }
  )
);
