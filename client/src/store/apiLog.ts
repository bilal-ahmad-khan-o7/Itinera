import { create } from 'zustand';
import type { ResponseMeta } from '@/lib/types';

export interface ClientCall {
  id: string;
  at: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  meta?: ResponseMeta;
  requestBody?: unknown;
  streamed?: boolean;
  error?: string;
}

interface ApiLogState {
  calls: ClientCall[];
  add: (call: Omit<ClientCall, 'id' | 'at'>) => void;
  clear: () => void;
}

/** In-memory record of every call the browser made to our API (powers the request inspector). */
export const useApiLog = create<ApiLogState>((set) => ({
  calls: [],
  add: (call) =>
    set((s) => ({
      calls: [{ ...call, id: crypto.randomUUID().slice(0, 8), at: new Date().toISOString() }, ...s.calls].slice(0, 80),
    })),
  clear: () => set({ calls: [] }),
}));
