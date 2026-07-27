import { create } from 'zustand'

export interface User {
  id: str;
  email: string;
  name: string;
  auth_provider: 'local' | 'google' | 'github' | 'guest';
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name?: string) => Promise<boolean>;
  loginGuest: () => Promise<boolean>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('nexora_token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    const token = get().token
    if (!token) {
      set({ isAuthenticated: false, isLoading: false })
      return
    }

    set({ isLoading: true })
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const user = await res.json()
        set({ user, isAuthenticated: true, error: null })
      } else {
        // Expired token
        localStorage.removeItem('nexora_token')
        set({ user: null, token: null, isAuthenticated: false })
      }
    } catch (e) {
      // Offline or network error
      set({ isAuthenticated: true }) // Assume authenticated from token cache to allow local-first offline usage
    } finally {
      set({ isLoading: false })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed')
      }

      localStorage.setItem('nexora_token', data.access_token)
      set({
        token: data.access_token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
      return true
    } catch (e: any) {
      set({ error: e.message || 'Server error', isLoading: false })
      return false
    }
  },

  signup: async (email, password, name) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, auth_provider: 'local' })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed')
      }

      // Automatically log in after registration
      const success = await get().login(email, password)
      return success
    } catch (e: any) {
      set({ error: e.message || 'Server error', isLoading: false })
      return false
    }
  },

  loginGuest: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Guest login failed')
      }

      localStorage.setItem('nexora_token', data.access_token)
      set({
        token: data.access_token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
      return true
    } catch (e: any) {
      set({ error: e.message || 'Server error', isLoading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('nexora_token')
    set({ user: null, token: null, isAuthenticated: false, error: null })
  }
}))
export type str = string;
export type type = any;
