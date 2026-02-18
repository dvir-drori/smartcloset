import api from './api';
import { ClothingItem, Occasion, Season } from './clothingItems';

export interface Outfit {
  id: string;
  userId: string;
  name: string;
  occasion: Occasion;
  season: Season[];
  rating?: number;
  isAISuggested: boolean;
  imageUrl?: string;
  items: ClothingItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOutfitParams {
  name: string;
  occasion: Occasion;
  season?: Season[];
  itemIds: string[];
}

export interface UpdateOutfitParams {
  name?: string;
  occasion?: Occasion;
  season?: Season[];
  rating?: number;
  itemIds?: string[];
}

export async function createOutfit(params: CreateOutfitParams): Promise<Outfit> {
  const { data } = await api.post<Outfit>('/api/outfits', params);
  return data;
}

export async function getOutfits(filters?: { occasion?: Occasion }): Promise<Outfit[]> {
  const params: Record<string, string> = {};
  if (filters?.occasion) params.occasion = filters.occasion;

  const { data } = await api.get<Outfit[]>('/api/outfits', { params });
  return data;
}

export async function getOutfit(id: string): Promise<Outfit> {
  const { data } = await api.get<Outfit>(`/api/outfits/${id}`);
  return data;
}

export async function updateOutfit(id: string, params: UpdateOutfitParams): Promise<Outfit> {
  const { data } = await api.put<Outfit>(`/api/outfits/${id}`, params);
  return data;
}

export async function deleteOutfit(id: string): Promise<void> {
  await api.delete(`/api/outfits/${id}`);
}
