import React, { useState, useEffect } from 'react'
import { 
  Folder, 
  MessageSquare, 
  FileText, 
  BookOpen, 
  Search, 
  Trash2,
  Calendar,
  Layers
} from 'lucide-react'
import { useAuthStore } from '../context/authStore'

interface WorkspaceItem {
  id: string
  type: 'chat' | 'document' | 'note'
  title: string
  subtitle: string
  created_at: string
}

export const Workspace: React.FC = () => {
  const { token } = useAuthStore()
  const [items, setItems] = useState<WorkspaceItem[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'chats' | 'documents' | 'notes'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchWorkspaceItems = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/v1/workspace/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        const mappedItems: WorkspaceItem[] = []
        
        // Map chats
        if (data.recent_chats) {
          data.recent_chats.forEach((chat: any) => {
            mappedItems.push({
              id: chat.id,
              type: 'chat',
              title: chat.title,
              subtitle: `${chat.provider} • ${chat.model}`,
              created_at: chat.updated_at
            })
          })
        }
        
        // Map docs
        if (data.recent_documents) {
          data.recent_documents.forEach((doc: any) => {
            mappedItems.push({
              id: doc.id,
              type: 'document',
              title: doc.filename,
              subtitle: `${doc.file_type.toUpperCase()} file`,
              created_at: doc.created_at
            })
          })
        }

        // Map notes
        if (data.recent_notes) {
          data.recent_notes.forEach((note: any) => {
            mappedItems.push({
              id: note.id,
              type: 'note',
              title: note.title,
              subtitle: `Folder: ${note.folder_name}`,
              created_at: note.updated_at
            })
          })
        }

        // Sort by date
        mappedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setItems(mappedItems)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkspaceItems()
  }, [token])

  const handleItemDelete = async (item: WorkspaceItem) => {
    const endpoint = item.type === 'chat' 
      ? `chat/chats/${item.id}` 
      : item.type === 'document' 
        ? `documents/${item.id}` 
        : `notes/${item.id}`
        
    try {
      const res = await fetch(`http://localhost:8000/api/v1/${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        setItems((prev) => prev.filter((i) => !(i.id === item.id && i.type === item.type)))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredItems = items
    .filter((item) => {
      if (activeTab === 'all') return true
      if (activeTab === 'chats') return item.type === 'chat'
      if (activeTab === 'documents') return item.type === 'document'
      if (activeTab === 'notes') return item.type === 'note'
      return true
    })
    .filter((item) => {
      return item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    })

  return (
    <div className="flex-grow h-screen overflow-y-auto p-8 text-slate-100 bg-[#0c0d14] bg-mesh-dark">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Workspace Hub</h1>
          <p className="text-sm text-slate-400">Search and organize all related files, notes, and previous AI sessions</p>
        </div>
      </div>

      {/* Tabs and search row */}
      <div className="flex items-center justify-between mb-6 gap-4">
        
        {/* Tabs switcher */}
        <div className="flex bg-white/2 border border-white/5 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={13} />
            <span>All Items</span>
          </button>
          <button 
            onClick={() => setActiveTab('chats')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'chats' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare size={13} />
            <span>Chats</span>
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'documents' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText size={13} />
            <span>Files</span>
          </button>
          <button 
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'notes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={13} />
            <span>Notes</span>
          </button>
        </div>

        {/* Global Search input */}
        <div className="w-80 relative">
          <Search size={14} className="absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search items, titles, metadata..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs glass-input text-white"
          />
        </div>
      </div>

      {/* Items List Grid */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">Loading workspace files...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">No workspace items found matching criteria.</div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              return (
                <div 
                  key={`${item.type}_${item.id}`}
                  className="p-4 bg-white/2 hover:bg-white/4 border border-white/5 rounded-lg flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-2.5 rounded-lg shrink-0 ${
                      item.type === 'chat' 
                        ? 'bg-blue-500/10 text-blue-400' 
                        : item.type === 'document' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {item.type === 'chat' && <MessageSquare size={16} />}
                      {item.type === 'document' && <FileText size={16} />}
                      {item.type === 'note' && <BookOpen size={16} />}
                    </div>
                    
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-200 truncate max-w-lg">{item.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span className="font-semibold">{item.subtitle}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleItemDelete(item)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
export type type = any;
