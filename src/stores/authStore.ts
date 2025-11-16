import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OracleVerdict = 'TRASH' | 'MID' | 'VIABLE' | 'FIRE';

interface AuthState {
  verdict: OracleVerdict | null;
  isUnlocked: boolean; // true for VIABLE/FIRE, false for TRASH/MID
  submittedIdea: string | null;
  oracleResponse: string | null;
  setVerdict: (verdict: OracleVerdict, idea: string, response: string) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      verdict: null,
      isUnlocked: false,
      submittedIdea: null,
      oracleResponse: null,
      
      setVerdict: (verdict, idea, response) => {
        const isUnlocked = verdict === 'VIABLE' || verdict === 'FIRE';
        set({ 
          verdict,
          isUnlocked,
          submittedIdea: idea,
          oracleResponse: response 
        });
      },
      
      reset: () => {
        set({ 
          verdict: null,
          isUnlocked: false,
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
