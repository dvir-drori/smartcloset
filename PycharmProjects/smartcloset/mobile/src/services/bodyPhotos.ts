import api from './api';

export interface BodyPhoto {
  id: string;
  userId: string;
  angle: 'FRONT' | 'SIDE' | 'BACK';
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export async function uploadBodyPhoto(imageUri: string, angle: string): Promise<BodyPhoto> {
  const formData = new FormData();

  const filename = imageUri.split('/').pop() || 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  formData.append('image', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);
  formData.append('angle', angle);

  const { data } = await api.post<BodyPhoto>('/api/body-photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getBodyPhotos(): Promise<BodyPhoto[]> {
  const { data } = await api.get<BodyPhoto[]>('/api/body-photos');
  return data;
}

export async function deleteBodyPhoto(id: string): Promise<void> {
  await api.delete(`/api/body-photos/${id}`);
}
