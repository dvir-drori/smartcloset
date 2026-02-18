import api from './api';

export type ClothingCategory = 'TOP' | 'BOTTOM' | 'OUTERWEAR' | 'SHOES' | 'ACCESSORY' | 'UNDERWEAR' | 'SWIMWEAR' | 'FORMAL';
export type Pattern = 'SOLID' | 'STRIPED' | 'PLAID' | 'FLORAL' | 'PRINTED' | 'OTHER';
export type Season = 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER';
export type Occasion = 'CASUAL' | 'WORK' | 'FORMAL' | 'SPORT' | 'GOING_OUT';

export interface ClothingItem {
  id: string;
  userId: string;
  name: string;
  category: ClothingCategory;
  subcategory: string;
  color: string;
  secondaryColor?: string;
  pattern: Pattern;
  material?: string;
  brand?: string;
  size?: string;
  season: Season[];
  occasion: Occasion[];
  imageUrl: string;
  thumbnailUrl?: string;
  timesWorn: number;
  lastWornAt?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClothingItemParams {
  name: string;
  category: ClothingCategory;
  subcategory: string;
  color: string;
  secondaryColor?: string;
  pattern?: Pattern;
  material?: string;
  brand?: string;
  size?: string;
  season?: Season[];
  occasion?: Occasion[];
  imageUri: string;
}

export async function createClothingItem(params: CreateClothingItemParams): Promise<ClothingItem> {
  const formData = new FormData();

  const filename = params.imageUri.split('/').pop() || 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  formData.append('image', {
    uri: params.imageUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  formData.append('name', params.name);
  formData.append('category', params.category);
  formData.append('subcategory', params.subcategory);
  formData.append('color', params.color);
  if (params.secondaryColor) formData.append('secondaryColor', params.secondaryColor);
  if (params.pattern) formData.append('pattern', params.pattern);
  if (params.material) formData.append('material', params.material);
  if (params.brand) formData.append('brand', params.brand);
  if (params.size) formData.append('size', params.size);
  if (params.season) formData.append('season', JSON.stringify(params.season));
  if (params.occasion) formData.append('occasion', JSON.stringify(params.occasion));

  const { data } = await api.post<ClothingItem>('/api/clothing-items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getClothingItems(filters?: { category?: ClothingCategory; favorite?: boolean }): Promise<ClothingItem[]> {
  const params: Record<string, string> = {};
  if (filters?.category) params.category = filters.category;
  if (filters?.favorite) params.favorite = 'true';

  const { data } = await api.get<ClothingItem[]>('/api/clothing-items', { params });
  return data;
}

export async function getClothingItem(id: string): Promise<ClothingItem> {
  const { data } = await api.get<ClothingItem>(`/api/clothing-items/${id}`);
  return data;
}

export async function deleteClothingItem(id: string): Promise<void> {
  await api.delete(`/api/clothing-items/${id}`);
}

export async function toggleFavorite(id: string): Promise<ClothingItem> {
  const { data } = await api.patch<ClothingItem>(`/api/clothing-items/${id}/favorite`);
  return data;
}
