import React, { useState, useEffect } from 'react'
import { 
  FolderPlus, 
  Plus, 
  Trash2, 
  FileText, 
  Sparkles, 
  BookOpen, 
  Folder, 
  Save,
  Check
} from 'lucide-react'
import { useAuthStore } from '../context/authStore'

interface Note {
  id: string
  title: string
  content_markdown: string
  summary: string | null
  folder_name: string
  created_at: string
  updated_at: string
}

export const Notes: React.FC = () => {
  const { token } = useAuthStore()
  
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  
  // Editor States
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [folder, setFolder] = useState('General')
  const [folders, setFolders] = useState<string[]>(['General', 'Coding', 'Research', 'Study'])
  const [newFolderName, setNewFolderName] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [activeFolderFilter, setActiveFolderFilter] = useState<string | null>(null)

  const fetchNotes = async () => {
    if (!token) return
    try {
      const res = await fetch('http://localhost:8000/api/v1/notes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setNotes(data)
        
        // Populate folder names list dynamically
        const uniqueFolders = Array.from(new Set(data.map((n: Note) => n.folder_name))) as string[]
        const merge = Array.from(new Set(['General', 'Coding', 'Research', 'Study', ...uniqueFolders]))
        setFolders(merge)
        
        // Select first note if any
        if (data.length > 0 && !selectedNoteId) {
          handleSelectNote(data[0])
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [token])

  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id)
    setTitle(note.title)
    setContent(note.content_markdown)
    setFolder(note.folder_name)
  }

  const handleCreateNote = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Untitled Note',
          content_markdown: '# Untitled Note\n\nWrite your thoughts here...',
          folder_name: activeFolderFilter || 'General'
        })
      })

      if (res.ok) {
        const newNote = await res.json()
        setNotes((prev) => [newNote, ...prev])
        handleSelectNote(newNote)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveNote = async () => {
    if (!selectedNoteId) return
    setSaving(true)
    try {
      const res = await fetch(`http://localhost:8000/api/v1/notes/${selectedNoteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title,
          content_markdown: content,
          folder_name: folder
        })
      })

      if (res.ok) {
        const updated = await res.json()
        setNotes((prev) => prev.map((n) => n.id === selectedNoteId ? updated : n))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const filtered = notes.filter((n) => n.id !== noteId)
        setNotes(filtered)
        if (selectedNoteId === noteId) {
          if (filtered.length > 0) {
            handleSelectNote(filtered[0])
          } else {
            setSelectedNoteId(null)
            setTitle('')
            setContent('')
          }
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSummarize = async () => {
    if (!selectedNoteId) return
    setSummarizing(true)
    try {
      const res = await fetch(`http://localhost:8000/api/v1/notes/${selectedNoteId}/summarize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setNotes((prev) => prev.map((n) => n.id === selectedNoteId ? data : n))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSummarizing(false)
    }
  }

  const handleAddFolder = () => {
    if (newFolderName.strip() && !folders.includes(newFolderName)) {
      setFolders((prev) => [...prev, newFolderName.strip()])
      setFolder(newFolderName.strip())
      setNewFolderName('')
      setShowFolderModal(false)
    }
  }

  const selectedNote = notes.find((n) => n.id === selectedNoteId)
  const filteredNotes = activeFolderFilter 
    ? notes.filter((n) => n.folder_name === activeFolderFilter)
    : notes

  return (
    <div className="flex-grow h-screen flex text-slate-200 bg-[#0c0d14]">
      
      {/* Sidebar: Folder & Notes lists */}
      <div className="w-80 border-r border-slate-800/80 bg-slate-950/40 flex flex-col p-4">
        
        {/* Knowledge Folders Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Knowledge Folders</span>
            <button 
              onClick={() => setShowFolderModal(true)}
              className="p-1 hover:bg-white/5 rounded text-indigo-400"
              title="Add folder"
            >
              <FolderPlus size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveFolderFilter(null)}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                activeFolderFilter === null 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white/3 border border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFolderFilter(f)}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  activeFolderFilter === f 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white/3 border border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800/60 my-2" />

        {/* Create Note Button */}
        <button
          onClick={handleCreateNote}
          className="w-full py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer mb-3"
        >
          <Plus size={14} />
          <span>New Markdown Note</span>
        </button>

        {/* Notes Items List */}
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {loading ? (
            <div className="text-center py-6 text-xs text-slate-500">Loading notes...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">No notes in folder.</div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`group p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedNoteId === note.id 
                    ? 'bg-white/8 border-white/10' 
                    : 'bg-transparent border-transparent hover:bg-white/3'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-200 truncate flex-1 pr-2">{note.title}</h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNote(note.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-500">
                  <span className="font-semibold text-indigo-400">{note.folder_name}</span>
                  <span>•</span>
                  <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor & AI Summary Pane */}
      {selectedNote ? (
        <div className="flex-1 flex bg-mesh-dark">
          
          {/* Main Markdown Editor */}
          <div className="flex-grow flex flex-col p-6 border-r border-slate-800/80">
            <div className="flex items-center justify-between gap-4 mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title"
                className="bg-transparent border-0 text-lg font-bold text-white focus:outline-none focus:ring-0 flex-grow"
              />
              
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                >
                  {folders.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>

                <button
                  onClick={handleSaveNote}
                  disabled={saving}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Write markdown here..."
              className="flex-grow bg-slate-950/20 p-4 border border-slate-800/60 rounded-xl text-xs font-mono text-slate-300 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* AI summaries Column */}
          <div className="w-80 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sparkles size={16} className="text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Knowledge Summary</h3>
              </div>

              {selectedNote.summary ? (
                <div className="p-4 bg-indigo-600/5 border border-indigo-500/15 rounded-xl text-xs leading-relaxed text-slate-300">
                  {selectedNote.summary}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs leading-relaxed">
                  No summary generated. Click "Generate AI Summary" to condense this markdown note.
                </div>
              )}
            </div>

            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10 cursor-pointer hover:scale-[1.01] transition-transform"
            >
              {summarizing ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Generate AI Summary</span>
                </>
              )}
            </button>
          </div>

        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-slate-500 text-center gap-4">
          <BookOpen size={48} className="text-slate-700" />
          <div>
            <h3 className="text-md font-bold text-white">Create or Select a Note</h3>
            <p className="text-xs max-w-sm mt-1 leading-relaxed">
              Compile summaries, copy-paste coding guidelines, and group in knowledge folders.
            </p>
            <button
              onClick={handleCreateNote}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white shadow-md cursor-pointer transition-transform hover:scale-[1.01]"
            >
              Create Note
            </button>
          </div>
        </div>
      )}

      {/* Add Folder Modal Popover */}
      {showFolderModal && (
        <div className="absolute inset-0 bg-[#090a0f]/80 z-20 flex items-center justify-center p-4">
          <div className="w-full max-w-xs glass-panel p-6 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">New Knowledge Folder</h3>
            <input
              type="text"
              placeholder="e.g. C++ Coding, Algorithms"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full p-2.5 text-xs glass-input text-white mb-4"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddFolder() }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowFolderModal(false)}
                className="flex-1 py-2 bg-white/5 border border-white/10 rounded text-xs text-slate-400 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFolder}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}
export type type = any;
