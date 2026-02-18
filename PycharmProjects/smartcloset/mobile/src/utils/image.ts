const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export function getFullImageUrl(relativePath: string): string {
  if (relativePath.startsWith('http')) return relativePath;
  return `${API_URL}${relativePath}`;
}
