import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isApproved: boolean;
  submittedIdea: string | null;
  oracleResponse: string | null;
  setApproved: (idea: string, response: string) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isApproved: false,
      submittedIdea: null,
      oracleResponse: null,
      
      setApproved: (idea, response) => {
        set({ 
          isApproved: true, 
          submittedIdea: idea,
          oracleResponse: response 
        });
      },
      
      reset: () => {
        set({ 
          isApproved: false, 
          submittedIdea: null,
          oracleResponse: null 
        });
      },
    }),
    {
      name: 'noshit-auth-storage',
    }
  )
);
