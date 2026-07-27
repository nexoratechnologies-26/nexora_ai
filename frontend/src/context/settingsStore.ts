import { create } from 'zustand'
import { useAuthStore } from './authStore'

export interface Settings {
  theme: 'dark' | 'light';
  font_size: number;
  model_provider: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  clipboard_monitoring_enabled: boolean;
  voice_enabled: boolean;
  api_keys_json: string; // JSON string representing API keys config dict
}

interface SettingsState {
  settings: Settings | null;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (update: Partial<Settings>) => Promise<boolean>;
  getApiKeys: () => Record<string, string>;
  setApiKey: (provider: string, key: string) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  getApiKeys: () => {
    const jsonStr = get().settings?.api_keys_json || '{}'
    try {
      return JSON.parse(jsonStr)
    } catch {
      return {}
    }
  },

  loadSettings: async () => {
    const token = useAuthStore.getState().token
    if (!token) return

    set({ isLoading: true, error: null })
    try {
      const res = await fetch('http://localhost:8000/api/v1/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const settings = await res.json()
        set({ settings, isLoading: false })
        
        // Sync Tailwind CSS Dark Theme
        if (settings.theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }

        // Sync Electron clipboard watcher
        if (window.electronAPI) {
          window.electronAPI.toggleClipboardMonitor(settings.clipboard_monitoring_enabled)
        }
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to load settings', isLoading: false })
    }
  },

  updateSettings: async (update) => {
    const token = useAuthStore.getState().token
    const current = get().settings
    if (!token || !current) return false

    // Optimistic Update
    const updatedSettings = { ...current, ...update }
    set({ settings: updatedSettings })

    // Sync theme class
    if (update.theme) {
      if (update.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    // Sync Electron clipboard
    if (update.clipboard_monitoring_enabled !== undefined && window.electronAPI) {
      window.electronAPI.toggleClipboardMonitor(update.clipboard_monitoring_enabled)
    }

    try {
      const res = await fetch('http://localhost:8000/api/v1/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(update)
      })

      if (res.ok) {
        const refreshed = await res.json()
        set({ settings: refreshed })
        return true
      }
      return false
    } catch (e: any) {
      // Revert on error
      set({ settings: current })
      return false
    }
  },

  setApiKey: async (provider, key) => {
    const currentKeys = get().getApiKeys()
    currentKeys[provider] = key
    const newJson = JSON.stringify(currentKeys)
    return get().updateSettings({ api_keys_json: newJson })
  }
}))
