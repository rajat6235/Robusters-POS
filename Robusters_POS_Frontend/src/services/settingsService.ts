import { apiClient } from '@/lib/api';

export interface LoyaltyPointsRatio {
  spend_amount: number;
  points_earned: number;
}

export interface TierThresholds {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface VipOrderThreshold {
  min_orders: number;
}

export interface SettingEntry<T = any> {
  value: T;
  description: string;
  updated_at: string;
}

export interface AllSettingsResponse {
  success: boolean;
  data: {
    settings: {
      loyalty_points_ratio: SettingEntry<LoyaltyPointsRatio>;
      tier_thresholds: SettingEntry<TierThresholds>;
      vip_order_threshold: SettingEntry<VipOrderThreshold>;
    };
  };
}

export interface PublicSettingsResponse {
  success: boolean;
  data: {
    tier_thresholds: TierThresholds;
    vip_order_threshold: VipOrderThreshold;
  };
}

export const settingsService = {
  async getAllSettings(): Promise<AllSettingsResponse> {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  async getPublicSettings(): Promise<PublicSettingsResponse> {
    const response = await apiClient.get('/settings/public');
    return response.data;
  },

  async updateSetting(key: string, value: any) {
    const response = await apiClient.put(`/settings/${key}`, { value });
    return response.data;
  },
};
