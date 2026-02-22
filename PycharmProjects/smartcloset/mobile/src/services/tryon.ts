import api from './api';
import { getAccessToken } from './tokenStorage';

export interface TryOnResult {
  id: string;
  userId: string;
  bodyPhotoId: string;
  clothingItemId: string;
  resultImageUrl: string;
  createdAt: string;
  fromCache?: boolean;
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
    { timeout: 120000 }
  );
  return data;
}

// SSE-based try-on with progress callbacks
export function generateTryOnWithProgress(
  clothingItemId: string,
  callbacks: {
    onProgress: (stage: string) => void;
    onComplete: (result: TryOnResult) => void;
    onError: (error: string) => void;
  },
): () => void {
  let aborted = false;

  (async () => {
    try {
      const token = await getAccessToken();
      const baseUrl = api.defaults.baseURL || '';
      const url = `${baseUrl}/api/tryon/generate/stream?clothingItemId=${encodeURIComponent(clothingItemId)}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
      });

      if (aborted) return;

      // If server returned JSON directly (cached result), parse it
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.error) {
          callbacks.onError(data.error);
        } else {
          callbacks.onComplete(data as TryOnResult);
        }
        return;
      }

      if (!response.ok) {
        callbacks.onError('Failed to start try-on generation');
        return;
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError('Streaming not supported');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              if (eventType === 'progress') {
                callbacks.onProgress(parsed.stage);
              } else if (eventType === 'complete') {
                callbacks.onComplete(parsed as TryOnResult);
              } else if (eventType === 'error') {
                callbacks.onError(parsed.error);
              }
            } catch { /* skip malformed data */ }
            eventType = '';
          }
        }
      }
    } catch (err) {
      if (!aborted) {
        callbacks.onError('Connection failed. Please try again.');
      }
    }
  })();

  // Return abort function
  return () => { aborted = true; };
}

export async function getTryOnResults(): Promise<TryOnResult[]> {
  const { data } = await api.get<TryOnResult[]>('/api/tryon/results');
  return data;
}

export async function checkTryOnResult(clothingItemId: string): Promise<TryOnCheckResult> {
  const { data } = await api.get<TryOnCheckResult>(`/api/tryon/result/${clothingItemId}`);
  return data;
}
