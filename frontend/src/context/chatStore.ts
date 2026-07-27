import { create } from 'zustand'
import { useAuthStore } from './authStore'

export interface Message {
  id: string
  chat_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens_used: number
  created_at: string
}

export interface Chat {
  id: string
  title: string
  provider: string
  model: string
  message_count?: number
  created_at: string
  updated_at: string
  messages?: Message[]
}

interface ChatState {
  chats: Chat[]
  selectedChatId: string | null
  messages: Message[]
  isLoadingChats: boolean
  isGenerating: boolean
  error: string | null
  
  loadChats: () => Promise<void>
  selectChat: (chatId: string) => Promise<void>
  createChat: (title: string, provider: string, model: string) => Promise<string | null>
  deleteChat: (chatId: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  selectedChatId: null,
  messages: [],
  isLoadingChats: false,
  isGenerating: false,
  error: null,

  loadChats: async () => {
    const token = useAuthStore.getState().token
    if (!token) return

    set({ isLoadingChats: true, error: null })
    try {
      const res = await fetch('http://localhost:8000/api/v1/chat/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const chats = await res.json()
        set({ chats, isLoadingChats: false })
      } else {
        set({ isLoadingChats: false })
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to load chats', isLoadingChats: false })
    }
  },

  selectChat: async (chatId) => {
    const token = useAuthStore.getState().token
    if (!token) return

    set({ selectedChatId: chatId, messages: [] })
    try {
      const res = await fetch(`http://localhost:8000/api/v1/chat/chats/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const chat = await res.json()
        set({ messages: chat.messages || [] })
      }
    } catch (e) {
      console.error(e)
    }
  },

  createChat: async (title, provider, model) => {
    const token = useAuthStore.getState().token
    if (!token) return null

    try {
      const res = await fetch('http://localhost:8000/api/v1/chat/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, provider, model })
      })

      if (res.ok) {
        const newChat = await res.json()
        set((state) => ({
          chats: [newChat, ...state.chats],
          selectedChatId: newChat.id,
          messages: []
        }))
        return newChat.id
      }
      return null
    } catch (e) {
      console.error(e)
      return null
    }
  },

  deleteChat: async (chatId) => {
    const token = useAuthStore.getState().token
    if (!token) return

    try {
      const res = await fetch(`http://localhost:8000/api/v1/chat/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        set((state) => {
          const filtered = state.chats.filter((c) => c.id !== chatId)
          const nextSelect = filtered.length > 0 ? filtered[0].id : null
          return {
            chats: filtered,
            selectedChatId: nextSelect,
            messages: []
          }
        })
        const nextId = get().selectedChatId
        if (nextId) {
          get().selectChat(nextId)
        }
      }
    } catch (e) {
      console.error(e)
    }
  },

  sendMessage: async (content) => {
    const token = useAuthStore.getState().token
    const chatId = get().selectedChatId
    if (!token || !chatId || get().isGenerating) return

    // Prepend user message in state immediately
    const tempUserMsg: Message = {
      id: Math.random().toString(),
      chat_id: chatId,
      role: 'user',
      content: content,
      tokens_used: 0,
      created_at: new Date().toISOString()
    }
    
    // Add space for assistant reply block
    const tempAssistantMsg: Message = {
      id: 'assistant-streaming',
      chat_id: chatId,
      role: 'assistant',
      content: '',
      tokens_used: 0,
      created_at: new Date().toISOString()
    }

    set((state) => ({
      messages: [...state.messages, tempUserMsg, tempAssistantMsg],
      isGenerating: true,
      error: null
    }))

    try {
      const response = await fetch(`http://localhost:8000/api/v1/chat/chats/${chatId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: 'user', content: content })
      })

      if (!response.ok) {
        throw new Error('Failed to start stream')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No readable stream body')

      let assistantText = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // SSE formatting: data: {"text": "something"}\n\n
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim()
            if (dataStr === '[DONE]') {
              break
            }
            try {
              const dataObj = JSON.parse(dataStr)
              if (dataObj.text) {
                assistantText += dataObj.text
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === 'assistant-streaming' ? { ...m, content: assistantText } : m
                  )
                }))
              } else if (dataObj.error) {
                throw new Error(dataObj.error)
              }
            } catch (e) {
              // Ignore empty parse errors
            }
          }
        }
      }

      // Finish Generation and reload chats to update titles/last activity
      set({ isGenerating: false })
      get().loadChats()
      // Reload final message with proper server-created UUID
      get().selectChat(chatId)
    } catch (e: any) {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== 'assistant-streaming'),
        isGenerating: false,
        error: e.message || 'Stream processing failed'
      }))
    }
  }
}))

// Extend string prototype for convenient stripping helper
if (!(String.prototype as any).strip) {
  (String.prototype as any).strip = function() {
    return this.replace(/^\s+|\s+$/g, '');
  };
}
