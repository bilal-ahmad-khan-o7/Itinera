import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api';

export interface ServerStatus {
  status: 'ok';
  uptimeSeconds: number;
  demoMode: boolean;
  model: string | null;
}

export function useServerStatus() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<ServerStatus> => {
      const res = await fetch(`${API_BASE}/api/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
