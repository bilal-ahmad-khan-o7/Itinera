import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AgencyProfile {
  name: string;
  tagline: string;
  gstin: string;
  address: string;
  state: string;
  phone: string;
  email: string;
  website: string;
  bankDetails: string;
}

interface SettingsState {
  theme: ThemeMode;
  agency: AgencyProfile;
  defaultMarkupB2C: number;
  defaultMarkupB2B: number;
  gstPct: number;
  setTheme: (t: ThemeMode) => void;
  updateAgency: (patch: Partial<AgencyProfile>) => void;
  updatePricing: (patch: Partial<Pick<SettingsState, 'defaultMarkupB2C' | 'defaultMarkupB2B' | 'gstPct'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      agency: {
        name: 'Itinera Travel Desk',
        tagline: 'Holidays, crafted end to end',
        gstin: '09ABCDE1234F1Z5',
        address: 'Sector 48, Noida, Uttar Pradesh 201301',
        state: 'Uttar Pradesh',
        phone: '+91 120 000 0000',
        email: 'desk@itinera.example',
        website: 'itinera.example',
        bankDetails: 'Sample Bank · A/C 000000000000 · IFSC SMPL0000001',
      },
      defaultMarkupB2C: 15,
      defaultMarkupB2B: 8,
      gstPct: 5,
      setTheme: (theme) => set({ theme }),
      updateAgency: (patch) => set((s) => ({ agency: { ...s.agency, ...patch } })),
      updatePricing: (patch) => set(patch),
    }),
    { name: 'itinera-settings' },
  ),
);
