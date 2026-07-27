import React, { useEffect, useState } from 'react'
import { 
  MessageSquare, 
  FileText, 
  BookOpen, 
  Flame, 
  Sparkles, 
  Plus, 
  Cpu, 
  ArrowRight,
  TrendingUp
} from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import { useChatStore } from '../context/chatStore'

interface DashboardData {
  recent_chats: any[]
  recent_documents: any[]
  recent_notes: any[]
  ai_usage_stats: {
    total_chats: number
    total_documents: number
    total_notes: number
    total_messages: number
    tokens_spent: {
      openai: number
      gemini: number
      claude: number
      ollama: number
    }
  }
  favorite_prompts: any[]
}

interface DashboardProps {
  setActivePage: (page: string) => void
}

export const Dashboard: React.FC<DashboardProps> = ({ setActivePage }) => {
  const { token } = useAuthStore()
  const { createChat } = useChatStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return
      try {
        const res = await fetch('http://localhost:8000/api/v1/workspace/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [token])

  const handleStartNewChat = async () => {
    const chatId = await createChat('New Conversation', 'openai', 'gpt-4o')
    if (chatId) {
      setActivePage('chat')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 h-screen flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm">Synthesizing workspace dashboard...</p>
        </div>
      </div>
    )
  }

  const stats = data?.ai_usage_stats || {
    total_chats: 0,
    total_documents: 0,
    total_notes: 0,
    total_messages: 0,
    tokens_spent: { openai: 0, gemini: 0, claude: 0, ollama: 0 }
  }

  return (
    <div className="flex-grow h-screen overflow-y-auto p-8 text-slate-100 bg-[#0c0d14] bg-mesh-dark">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Workspace Dashboard</h1>
          <p className="text-sm text-slate-400">Nexora AI metrics and recent activities</p>
        </div>
        <button
          onClick={handleStartNewChat}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg glow-primary cursor-pointer transition-transform duration-100 hover:scale-[1.02]"
        >
          <Plus size={16} />
          <span>New AI Session</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4 hover:border-slate-700/60 transition-colors">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <MessageSquare size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">AI Chats</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{stats.total_chats}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4 hover:border-slate-700/60 transition-colors">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Indexed Files</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{stats.total_documents}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4 hover:border-slate-700/60 transition-colors">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Knowledge Notes</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{stats.total_notes}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4 hover:border-slate-700/60 transition-colors">
          <div className="p-3 bg-pink-500/10 text-pink-400 rounded-lg">
            <Flame size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">AI Messages</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{stats.total_messages}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid Widgets */}
      <div className="grid grid-cols-3 gap-8">
        
        {/* Left Column: Recent Chats & Notes */}
        <div className="col-span-2 space-y-8">
          
          {/* Recent Chats Widget */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md font-semibold text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-400" />
                <span>Recent AI Sessions</span>
              </h2>
              <button 
                onClick={() => setActivePage('chat')} 
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight size={12} />
              </button>
            </div>
            
            {data?.recent_chats && data.recent_chats.length > 0 ? (
              <div className="space-y-3">
                {data.recent_chats.map((chat) => (
                  <div 
                    key={chat.id} 
                    onClick={() => setActivePage('chat')}
                    className="p-3.5 bg-white/2 hover:bg-white/4 rounded-lg border border-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-slate-200 truncate max-w-sm">{chat.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 uppercase font-semibold tracking-wider">
                        {chat.provider} • {chat.model}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 text-slate-400 rounded-full">
                      {chat.message_count || 0} messages
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No active conversations yet. Click "New AI Session" to begin.
              </div>
            )}
          </div>

          {/* Recent Notes Widget */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md font-semibold text-white flex items-center gap-2">
                <BookOpen size={16} className="text-purple-400" />
                <span>Recent Notes & Knowledge Folders</span>
              </h2>
              <button 
                onClick={() => setActivePage('notes')}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight size={12} />
              </button>
            </div>
            
            {data?.recent_notes && data.recent_notes.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {data.recent_notes.map((note) => (
                  <div 
                    key={note.id} 
                    onClick={() => setActivePage('notes')}
                    className="p-4 bg-white/2 hover:bg-white/4 border border-white/5 rounded-lg cursor-pointer transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200 truncate">{note.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                        {note.summary || note.content_markdown.replace(/[#*`]/g, '').slice(0, 100)}
                      </p>
                    </div>
                    <span className="text-[10px] self-start px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md mt-4 font-semibold">
                      {note.folder_name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No notes created. Write a new markdown note under the Notes view.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Usage & Prompts */}
        <div className="space-y-8">
          
          {/* AI / Token Usage Stats */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800">
            <h2 className="text-md font-semibold text-white flex items-center gap-2 mb-5">
              <Cpu size={16} className="text-pink-400" />
              <span>AI Token Utilization</span>
            </h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1 text-slate-400 font-medium">
                  <span>OpenAI (GPT-4o)</span>
                  <span className="text-slate-300 font-bold">{stats.tokens_spent.openai.toLocaleString()} tokens</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${Math.min(100, (stats.tokens_spent.openai / 100000) * 100)}%` }} 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 text-slate-400 font-medium">
                  <span>Google Gemini</span>
                  <span className="text-slate-300 font-bold">{stats.tokens_spent.gemini.toLocaleString()} tokens</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${Math.min(100, (stats.tokens_spent.gemini / 100000) * 100)}%` }} 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 text-slate-400 font-medium">
                  <span>Anthropic Claude</span>
                  <span className="text-slate-300 font-bold">{stats.tokens_spent.claude.toLocaleString()} tokens</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full" 
                    style={{ width: `${Math.min(100, (stats.tokens_spent.claude / 100000) * 100)}%` }} 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 text-slate-400 font-medium">
                  <span>Ollama (Local Offline)</span>
                  <span className="text-slate-300 font-bold">0 tokens (Free)</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-500 rounded-full" 
                    style={{ width: '0%' }} 
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 p-3 bg-white/3 border border-white/5 rounded-lg text-[10px] text-slate-500 font-medium">
              <TrendingUp size={14} className="text-emerald-400" />
              <span>Offline local Ollama inference incurs zero API token costs.</span>
            </div>
          </div>

          {/* Quick templates / Prompts */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md font-semibold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-400 animate-pulse" />
                <span>Favorite Templates</span>
              </h2>
              <button 
                onClick={() => setActivePage('prompts')}
                className="text-xs text-yellow-400 hover:text-yellow-300 font-medium"
              >
                Browse
              </button>
            </div>
            
            {data?.favorite_prompts && data.favorite_prompts.length > 0 ? (
              <div className="space-y-3">
                {data.favorite_prompts.map((prompt) => (
                  <div 
                    key={prompt.id} 
                    onClick={() => setActivePage('prompts')}
                    className="p-3 bg-white/2 hover:bg-white/4 border border-white/5 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">{prompt.title}</h4>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5 tracking-wider">
                        {prompt.category}
                      </p>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase">Use</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No templates configured.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
