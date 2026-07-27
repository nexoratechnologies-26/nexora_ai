import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  UploadCloud, 
  Trash2, 
  Brain, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../context/authStore'

interface Document {
  id: string
  filename: string
  file_type: string
  file_size: number
  created_at: string
}

interface Flashcard {
  question: string
  answer: string
}

export const Documents: React.FC = () => {
  const { token } = useAuthStore()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  // Flashcard States
  const [activeFlashcards, setActiveFlashcards] = useState<Flashcard[]>([])
  const [flashcardLoading, setFlashcardLoading] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  const fetchDocuments = async () => {
    if (!token) return
    try {
      const res = await fetch('http://localhost:8000/api/v1/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [token])

  const handleUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf', 'docx', 'txt', 'pptx'].includes(ext)) {
      setUploadError('Only PDF, DOCX, TXT, and PPTX files are supported.')
      return
    }

    setUploading(true)
    setUploadError(null)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://localhost:8000/api/v1/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (res.ok) {
        fetchDocuments()
      } else {
        const data = await res.json()
        setUploadError(data.detail || 'Upload failed.')
      }
    } catch (err) {
      setUploadError('Server connection error.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0])
    }
  }

  const handleDelete = async (docId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleGenerateFlashcards = async (docId: string) => {
    setFlashcardLoading(true)
    setActiveFlashcards([])
    setShowAnswer(false)
    setCurrentCardIndex(0)
    
    try {
      const res = await fetch(`http://localhost:8000/api/v1/documents/${docId}/flashcards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setActiveFlashcards(data.flashcards || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setFlashcardLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex-grow h-screen overflow-y-auto p-8 text-slate-100 bg-[#0c0d14] bg-mesh-dark relative">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Document Intelligence</h1>
        <p className="text-sm text-slate-400">Upload research reports, homework, PDFs for local RAG questions and Study guides</p>
      </div>

      {/* Grid: Uploader and List */}
      <div className="grid grid-cols-3 gap-8">
        
        {/* Left Column: Drag & Drop Uploader */}
        <div className="space-y-6">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-500/5' 
                : 'border-slate-800 bg-white/2 hover:border-slate-700 hover:bg-white/4'
            }`}
          >
            <input 
              type="file" 
              id="file-upload-input" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0])
              }}
            />
            <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-4">
              <div className="p-4 bg-indigo-600/10 text-indigo-400 rounded-full">
                <UploadCloud size={32} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Drag & drop files here</p>
                <p className="text-xs text-slate-500 mt-1">Supports PDF, DOCX, TXT, and PPTX</p>
              </div>
            </label>
          </div>

          {uploading && (
            <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-3">
              <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              <span>Analyzing text structures and vectorizing RAG chunks...</span>
            </div>
          )}

          {uploadError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold">
              {uploadError}
            </div>
          )}

          <div className="p-5 glass-panel rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Brain size={14} className="text-indigo-400" />
              <span>How RAG works in Nexora AI</span>
            </h4>
            <p>1. Uploaded files are segmented into overlapping text blocks.</p>
            <p>2. Chunks are mapped into mathematical vector spaces locally.</p>
            <p>3. When asking chats about documents, the app fetches matching blocks and summarizes context offline or online.</p>
          </div>
        </div>

        {/* Right Columns: Document library */}
        <div className="col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-xl border border-slate-800">
            <h2 className="text-md font-semibold text-white flex items-center gap-2 mb-4">
              <FileText size={18} className="text-indigo-400" />
              <span>Document Library</span>
            </h2>

            {loading ? (
              <div className="py-12 flex justify-center text-xs text-slate-500">
                Loading database files...
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs leading-relaxed">
                No documents uploaded. Drop a file in the parser zone to begin indexing.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="p-4 bg-white/2 hover:bg-white/3 border border-white/5 rounded-lg flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-200 truncate max-w-md">{doc.filename}</h4>
                        <p className="text-[10px] text-slate-500 uppercase mt-0.5 font-medium">
                          {doc.file_type} • {formatBytes(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleGenerateFlashcards(doc.id)}
                        className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="AI Flashcards"
                      >
                        <Brain size={13} />
                        <span>Flashcards</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Flashcard Study Overlay Carousel */}
      {(flashcardLoading || activeFlashcards.length > 0) && (
        <div className="absolute inset-0 bg-[#090a0f]/90 z-20 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-slate-800 relative flex flex-col items-center">
            
            {/* Close Button */}
            <button 
              onClick={() => setActiveFlashcards([])}
              className="absolute right-4 top-4 text-xs font-bold px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200"
            >
              Close
            </button>

            {flashcardLoading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">AI study helper is drafting flashcards from text...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-6 self-start">
                  <Brain size={20} className="text-purple-400" />
                  <h3 className="text-md font-bold text-white">Interactive AI Flashcards</h3>
                </div>

                {/* Flip Card Container */}
                <div 
                  onClick={() => setShowAnswer(!showAnswer)}
                  className={`w-full min-h-[220px] p-6 rounded-xl border flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-300 transform select-none ${
                    showAnswer 
                      ? 'bg-purple-950/20 border-purple-500/40 text-purple-200 rotate-y-180' 
                      : 'bg-white/3 border-white/5 text-slate-200 hover:border-slate-800'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-4">
                    {showAnswer ? 'Answer' : 'Question'}
                  </span>
                  
                  <p className="text-sm font-semibold leading-relaxed max-w-sm">
                    {showAnswer 
                      ? activeFlashcards[currentCardIndex].answer 
                      : activeFlashcards[currentCardIndex].question
                    }
                  </p>
                  
                  <span className="text-[9px] text-purple-400/60 font-semibold uppercase tracking-wider mt-6">
                    Click card to flip
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between w-full mt-8">
                  <button 
                    disabled={currentCardIndex === 0}
                    onClick={() => {
                      setCurrentCardIndex(c => c - 1)
                      setShowAnswer(false)
                    }}
                    className="p-2 bg-white/5 border border-white/10 text-slate-300 rounded-lg disabled:opacity-20 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="text-xs text-slate-500 font-semibold">
                    {currentCardIndex + 1} / {activeFlashcards.length}
                  </span>

                  <button 
                    disabled={currentCardIndex === activeFlashcards.length - 1}
                    onClick={() => {
                      setCurrentCardIndex(c => c + 1)
                      setShowAnswer(false)
                    }}
                    className="p-2 bg-white/5 border border-white/10 text-slate-300 rounded-lg disabled:opacity-20 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export type type = any;
