import api from './api';

export interface TryOnResult {
  id: string;
  userId: string;
  bodyPhotoId: string;
  clothingItemId: string;
  resultImageUrl: string;
  createdAt: string;
  clothingItem?: {
    id: string;
    name: string;
    category: string;
    color: string;
    thumbnailUrl?: string;
    imageUrl: string;
  };
}

export interface TryOnCheckResult {
  hasBodyPhoto: boolean;
  result: TryOnResult | null;
}

export async function generateTryOn(clothingItemId: string): Promise<TryOnResult> {
  const { data } = await api.post<TryOnResult>(
    '/api/tryon/generate',
    { clothingItemId },
    { timeout: 60000 }
  );
  return data;
}

export async function getTryOnResults(): Promise<TryOnResult[]> {
  const { data } = await api.get<TryOnResult[]>('/api/tryon/results');
  return data;
}

export async function checkTryOnResult(clothingItemId: string): Promise<TryOnCheckResult> {
  const { data } = await api.get<TryOnCheckResult>(`/api/tryon/result/${clothingItemId}`);
  return data;
}
