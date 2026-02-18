import api from './api';
import { Outfit } from './outfits';

export interface WearLog {
  id: string;
  userId: string;
  outfitId?: string;
  date: string;
  weatherTemp?: number;
  weatherCondition?: string;
  notes?: string;
  outfit?: Outfit;
  createdAt: string;
}

export interface CreateWearLogParams {
  outfitId?: string;
  date: string;
  weatherTemp?: number;
  weatherCondition?: string;
  notes?: string;
}

export async function createWearLog(params: CreateWearLogParams): Promise<WearLog> {
  const { data } = await api.post<WearLog>('/api/wear-logs', params);
  return data;
}

export async function getWearLogs(limit = 20, offset = 0): Promise<{ wearLogs: WearLog[]; total: number }> {
  const { data } = await api.get<{ wearLogs: WearLog[]; total: number }>('/api/wear-logs', {
    params: { limit, offset },
  });
  return data;
}

export async function deleteWearLog(id: string): Promise<void> {
  await api.delete(`/api/wear-logs/${id}`);
}
