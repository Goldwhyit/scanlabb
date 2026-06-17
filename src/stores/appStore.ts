import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, Session } from '../db/database';

type Page = 'home' | 'klant-kiezen' | 'scan-sessie' | 'database-beheer' | 'export-instellingen';

interface ScanResult {
  success: boolean;
  message: string;
  barcode?: string;
}

interface AppState {
  currentPage: Page;
  pendingOrderType: 'verkoop' | 'inkoop' | null;
  activeSession: Session | null;
  scanActive: boolean;
  lastScanResult: ScanResult | null;
  scannerProfile: string | null;
  setScannerProfile: (p: string | null) => void;
  setPendingOrderType: (t: 'verkoop' | 'inkoop') => void;
  setPage: (p: Page) => void;
  startSession: (type: 'verkoop' | 'inkoop', klant: Customer) => Session;
  endSession: () => void;
  setScanActive: (v: boolean) => void;
  setLastScanResult: (r: ScanResult | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentPage: 'home',
      pendingOrderType: null,
      activeSession: null,
      scanActive: false,
      lastScanResult: null,
      scannerProfile: null,

      setPage: (p) => set({ currentPage: p }),
      setPendingOrderType: (t) => set({ pendingOrderType: t }),

      startSession: (type, klant) => {
        const session: Session = {
          id: crypto.randomUUID(),
          type, klant,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({ activeSession: session, currentPage: 'scan-sessie' });
        return session;
      },

      endSession: () => set({ activeSession: null, currentPage: 'home', scanActive: false }),
      setScanActive: (v) => set({ scanActive: v }),

      setLastScanResult: (r) => {
        set({ lastScanResult: r });
        if (r) {
          setTimeout(() => {
            if (get().lastScanResult === r) set({ lastScanResult: null });
          }, 2800);
        }
      },
      setScannerProfile: (p) => set({ scannerProfile: p }),
    }),
    {
      name: 'scanlabb-state',
      partialize: (s) => ({
        activeSession: s.activeSession,
        currentPage: s.currentPage === 'scan-sessie' ? 'scan-sessie' : 'home',
        scannerProfile: s.scannerProfile,
      }),
    }
  )
);
