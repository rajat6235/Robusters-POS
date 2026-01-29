'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { locationService, Location } from '@/services/locationService';

interface LocationStore {
  locations: Location[];
  selectedLocationId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchLocations: (includeInactive?: boolean) => Promise<void>;
  setSelectedLocation: (id: string | null) => void;
  getSelectedLocation: () => Location | null;
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      locations: [],
      selectedLocationId: null,
      isLoading: false,
      error: null,

      fetchLocations: async (includeInactive = false) => {
        set({ isLoading: true, error: null });
        try {
          const response = await locationService.getLocations(includeInactive);
          if (response.success) {
            const locations = response.data.locations;
            set({ locations, isLoading: false });

            // Auto-select first active location if none selected
            const state = get();
            if (!state.selectedLocationId && locations.length > 0) {
              const active = locations.find(l => l.is_active);
              if (active) {
                set({ selectedLocationId: active.id });
              }
            }

            // Clear selection if the selected location no longer exists
            if (state.selectedLocationId) {
              const exists = locations.find(l => l.id === state.selectedLocationId);
              if (!exists) {
                const active = locations.find(l => l.is_active);
                set({ selectedLocationId: active?.id || null });
              }
            }
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Failed to load locations',
            isLoading: false,
          });
        }
      },

      setSelectedLocation: (id) => {
        set({ selectedLocationId: id });
      },

      getSelectedLocation: () => {
        const state = get();
        return state.locations.find(l => l.id === state.selectedLocationId) || null;
      },
    }),
    {
      name: 'robusters-location-storage',
      partialize: (state) => ({
        selectedLocationId: state.selectedLocationId,
      }),
    }
  )
);
