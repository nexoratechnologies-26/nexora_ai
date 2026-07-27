import React, { useState, useEffect } from 'react'
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  BookOpen, 
  Code,
  Languages,
  PenTool,
  Brain
} from 'lucide-react'
import { useAuthStore } from '../context/authStore'

interface Prompt {
  id: string
  title: string
  template: string
  category: string
  is_custom: boolean
}

export const PromptLibrary: React.FC = () => {
  const { token } = useAuthStore()
  
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  
  // Custom Prompt Creation States
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [template, setTemplate] = useState('')
  const [category, setCategory] = useState('Coding')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const categories = ['Coding', 'Research', 'Study', 'Resume', 'Email', 'Translation', 'Custom']

  const fetchPrompts = async () => {
    if (!token) return
    try {
      const res = await fetch('http://localhost:8000/api/v1/prompts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setPrompts(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts()
  }, [token])

  const handleCreatePrompt = async () => {
    if (!title || !template) return
    try {
      const res = await fetch('http://localhost:8000/api/v1/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          template,
          category
        })
      })
      if (res.ok) {
        const newPrompt = await res.json()
        setPrompts((prev) => [...prev, newPrompt])
        setShowModal(false)
        setTitle('')
        setTemplate('')
        setCategory('Coding')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeletePrompt = async (promptId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/prompts/${promptId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        setPrompts((prev) => prev.filter((p) => p.id !== promptId))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'coding': return <Code size={16} className="text-blue-400" />
      case 'research': return <Brain size={16} className="text-purple-400" />
      case 'study': return <BookOpen size={16} className="text-emerald-400" />
      case 'translation': return <Languages size={16} className="text-pink-400" />
      case 'email': return <PenTool size={16} className="text-yellow-400" />
      default: return <Sparkles size={16} className="text-indigo-400" />
    }
  }

  return (
    <div className="flex-grow h-screen overflow-y-auto p-8 text-slate-100 bg-[#0c0d14] bg-mesh-dark relative">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Prompt Library</h1>
          <p className="text-sm text-slate-400">Standardized instruction templates to accelerate coding, writing, research, and analysis workflows</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg glow-primary cursor-pointer transition-transform duration-100 hover:scale-[1.02]"
        >
          <Plus size={16} />
          <span>Add Custom Template</span>
        </button>
      </div>

      {/* Prompts list grid */}
      {loading ? (
        <div className="text-center py-24 text-slate-500 text-xs">
          Loading library templates...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {prompts.map((prompt) => {
            return (
              <div 
                key={prompt.id}
                className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700/60 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="flex items-center gap-2 text-xs font-semibold text-white">
                      {getCategoryIcon(prompt.category)}
                      {prompt.category}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      prompt.is_custom 
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                        : 'bg-white/5 text-slate-500'
                    }`}>
                      {prompt.is_custom ? 'Custom' : 'System'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-200 mb-2">{prompt.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                    {prompt.template}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-4">
                  <button
                    onClick={() => handleCopyPrompt(prompt.template, prompt.id)}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    {copiedId === prompt.id ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Template Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Template</span>
                      </>
                    )}
                  </button>

                  {prompt.is_custom && (
                    <button
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete prompt template"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Custom Prompt Template Modal overlay */}
      {showModal && (
        <div className="absolute inset-0 bg-[#090a0f]/80 z-20 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Add Prompt Template</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Template Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Kotlin Optimization guide"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 text-xs glass-input text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded p-2.5 focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Prompt Instructions template</label>
                <textarea
                  placeholder="Write the full template instructions... (e.g. Analyze this snippet and explain optimizations: \n\n[INSERT CODE])"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full p-3 h-28 text-xs glass-input text-white resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded text-xs text-slate-400 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePrompt}
                  disabled={!title || !template}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white font-semibold cursor-pointer disabled:opacity-40"
                >
                  Save Template
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
export type type = any;
export type str = string;
