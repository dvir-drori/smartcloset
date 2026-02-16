import api from './api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  fullName: string;
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
}

export interface LoginParams {
  email: string;
  password: string;
}

export async function registerUser(params: RegisterParams): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/register', params);
  return data;
}

export async function loginUser(params: LoginParams): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', params);
  return data;
}

export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await api.post('/api/auth/refresh', { refreshToken });
  return data;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await api.post('/api/auth/logout', { refreshToken });
}

export async function getMe(): Promise<{ user: User }> {
  const { data } = await api.get<{ user: User }>('/api/auth/me');
  return data;
}
