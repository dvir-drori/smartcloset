import { create } from 'zustand';
import { User, registerUser, loginUser, logoutUser, getMe, RegisterParams, LoginParams } from '../services/auth';
import { setAccessToken, setRefreshToken, getAccessToken, getRefreshToken, clearTokens } from '../services/tokenStorage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  register: (params: RegisterParams) => Promise<void>;
  login: (params: LoginParams) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  register: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { user, accessToken, refreshToken } = await registerUser(params);
      await setAccessToken(accessToken);
      await setRefreshToken(refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Registration failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  login: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { user, accessToken, refreshToken } = await loginUser(params);
      await setAccessToken(accessToken);
      await setRefreshToken(refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } catch {
      // Ignore logout API errors
    } finally {
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  loadUser: async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      set({ isLoading: true });
      const { user } = await getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
