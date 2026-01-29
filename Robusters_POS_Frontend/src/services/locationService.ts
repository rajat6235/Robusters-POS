import { apiClient } from '@/lib/api';

export interface LocationData {
  name: string;
  address?: string;
  phone?: string;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationsResponse {
  success: boolean;
  data: {
    locations: Location[];
  };
}

export interface LocationResponse {
  success: boolean;
  data: {
    location: Location;
  };
  message?: string;
}

export const locationService = {
  async getLocations(includeInactive = false): Promise<LocationsResponse> {
    const params = includeInactive ? '?includeInactive=true' : '';
    const response = await apiClient.get<LocationsResponse>(`/locations${params}`);
    return response.data;
  },

  async getLocation(id: string): Promise<LocationResponse> {
    const response = await apiClient.get<LocationResponse>(`/locations/${id}`);
    return response.data;
  },

  async createLocation(data: LocationData): Promise<LocationResponse> {
    const response = await apiClient.post<LocationResponse>('/locations', data);
    return response.data;
  },

  async updateLocation(id: string, data: Partial<LocationData>): Promise<LocationResponse> {
    const response = await apiClient.patch<LocationResponse>(`/locations/${id}`, data);
    return response.data;
  },

  async deleteLocation(id: string): Promise<LocationResponse> {
    const response = await apiClient.delete<LocationResponse>(`/locations/${id}`);
    return response.data;
  },
};
