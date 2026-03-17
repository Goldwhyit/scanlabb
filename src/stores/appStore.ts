import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, Session } from '../db/database';

type Page =
  | 'home'
  | 'klant-kiezen'
  | 'scan-sessie'
  | 'database-beheer'
  | 'export-instellingen'
  | 'inkoop-scan';

interface AppState {
  currentPage: Page;
  pendingOrderType: 'verkoop' | 'inkoop' | null;
  activeSession: Session | null;
  scanActive: boolean;
  manualAantal: number | null;
  lastScanResult: { success: boolean; message: string; barcode?: string } | null;

  setPage: (page: Page) => void;
  setPendingOrderType: (type: 'verkoop' | 'inkoop') => void;
  startSession: (type: 'verkoop' | 'inkoop', klant: Customer) => Session;
  resumeSession: (session: Session) => void;
  endSession: () => void;
  setScanActive: (active: boolean) => void;
  setManualAantal: (n: number | null) => void;
  setLastScanResult: (r: AppState['lastScanResult']) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentPage: 'home',
      pendingOrderType: null,
      activeSession: null,
      scanActive: false,
      manualAantal: null,
      lastScanResult: null,

      setPage: (page) => set({ currentPage: page }),
      setPendingOrderType: (type) => set({ pendingOrderType: type }),

      startSession: (type, klant) => {
        const session: Session = {
          id: crypto.randomUUID(),
          type,
          klant,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({ activeSession: session, currentPage: 'scan-sessie' });
        return session;
      },

      resumeSession: (session) => {
        set({ activeSession: session, currentPage: 'scan-sessie' });
      },

      endSession: () => {
        set({ activeSession: null, currentPage: 'home', scanActive: false });
      },

      setScanActive: (active) => set({ scanActive: active }),
      setManualAantal: (n) => set({ manualAantal: n }),
      setLastScanResult: (r) => {
        set({ lastScanResult: r });
        if (r) {
          setTimeout(() => {
            if (get().lastScanResult === r) set({ lastScanResult: null });
          }, 2500);
        }
      },
    }),
    {
      name: 'scanlabb-app-state',
      partialize: (state) => ({
        activeSession: state.activeSession,
        currentPage: state.currentPage === 'scan-sessie' ? 'scan-sessie' : 'home',
      }),
    }
  )
);
