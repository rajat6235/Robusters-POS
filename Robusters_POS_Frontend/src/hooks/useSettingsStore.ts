import { create } from 'zustand';
import { settingsService, TierThresholds, VipOrderThreshold } from '@/services/settingsService';

interface SettingsState {
  tierThresholds: TierThresholds | null;
  vipThreshold: VipOrderThreshold | null;
  isLoading: boolean;
  error: string | null;
  fetchPublicSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  tierThresholds: null,
  vipThreshold: null,
  isLoading: false,
  error: null,

  fetchPublicSettings: async () => {
    const state = get();
    if (state.tierThresholds && state.vipThreshold) {
      // Already loaded
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await settingsService.getPublicSettings();
      set({
        tierThresholds: response.data.tier_thresholds,
        vipThreshold: response.data.vip_order_threshold,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load settings',
        isLoading: false,
      });
    }
  },
}));