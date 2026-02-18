import api from './api';
import { Occasion, Season, ClothingItem } from './clothingItems';
import { Outfit } from './outfits';

export interface RecommendationItem {
  id: string;
  name: string;
  category: string;
  color: string;
  imageUrl: string;
  thumbnailUrl?: string;
}

export interface Recommendation {
  items: RecommendationItem[];
  score: number;
  reasons: string[];
  suggestedName: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  message?: string;
}

export interface SaveRecommendationParams {
  name: string;
  occasion: Occasion;
  season?: Season[];
  itemIds: string[];
}

export async function getRecommendations(filters?: {
  occasion?: Occasion;
  season?: Season;
}): Promise<RecommendationsResponse> {
  const params: Record<string, string> = {};
  if (filters?.occasion) params.occasion = filters.occasion;
  if (filters?.season) params.season = filters.season;

  const { data } = await api.get<RecommendationsResponse>('/api/recommendations', { params });
  return data;
}

export async function saveRecommendation(params: SaveRecommendationParams): Promise<Outfit> {
  const { data } = await api.post<Outfit>('/api/recommendations/save', params);
  return data;
}
