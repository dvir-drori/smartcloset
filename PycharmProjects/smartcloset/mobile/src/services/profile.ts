import api from './api';

export interface UserProfile {
  id: string;
  userId: string;
  heightCm: number;
  weightKg: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  shouldersCm?: number;
  skinTone?: string;
  preferredStyle: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  fullName: string;
  gender: string;
  createdAt: string;
  profile: UserProfile | null;
}

export interface UpsertProfileParams {
  heightCm: number;
  weightKg: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  shouldersCm?: number;
  skinTone?: string;
  preferredStyle?: string;
}

export interface UserStats {
  clothingCount: number;
  outfitCount: number;
  wearLogCount: number;
  favoriteCount: number;
}

export async function getProfile(): Promise<UserWithProfile> {
  const { data } = await api.get<UserWithProfile>('/api/profile');
  return data;
}

export async function upsertProfile(params: UpsertProfileParams): Promise<UserProfile> {
  const { data } = await api.put<UserProfile>('/api/profile', params);
  return data;
}

export async function getStats(): Promise<UserStats> {
  const { data } = await api.get<UserStats>('/api/profile/stats');
  return data;
}
