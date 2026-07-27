import React, { useState, useEffect, useRef } from 'react'
import { 
  Plus, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Mic, 
  MicOff, 
  Bot,
  User as UserIcon
} from 'lucide-react'
import { useChatStore } from '../context/chatStore'
import { useSettingsStore } from '../context/settingsStore'
import { useAuthStore } from '../context/authStore'

export const Chat: React.FC = () => {
  const { 
    chats, 
    selectedChatId, 
    messages, 
    isLoadingChats, 
    isGenerating, 
    loadChats, 
    selectChat, 
    createChat, 
    deleteChat, 
    sendMessage 
  } = useChatStore()

  const { settings } = useSettingsStore()
  const { token } = useAuthStore()

  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Voice state
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    loadChats()
  }, [])

  useEffect(() => {
    // Auto-scroll to bottom of messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    await sendMessage(text)
  }

  const handleNewChat = async () => {
    const provider = settings?.model_provider || 'openai'
    const model = settings?.model_name || 'gpt-4o'
    await createChat('New Conversation', provider, model)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // --- Voice Transcription Implementation ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const formData = new FormData()
        formData.append('file', audioBlob, 'voice.wav')

        try {
          const res = await fetch('http://localhost:8000/api/v1/voice/stt', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          })
          if (res.ok) {
            const data = await res.json()
            if (data.text) {
              setInput((prev) => (prev + ' ' + data.text).trim())
            }
          }
        } catch (err) {
          console.error('Voice transcription error:', err)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to access microphone:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      // Stop all tracks on the stream
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)
    }
  }

  // --- Render custom markdown logic helper ---
  const renderMessageContent = (content: string, messageId: string) => {
    // Standard splitting by backticks to discover code blocks
    const parts = content.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        // Code Block
        const rawCode = part.replace(/```/g, '')
        const lines = rawCode.split('\n')
        const language = lines[0].trim() || 'code'
        const codeText = lines.slice(1).join('\n')
        
        return (
          <div key={i} className="my-4 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              <span>{language}</span>
              <button 
                onClick={() => copyToClipboard(codeText, `${messageId}_code_${i}`)}
                className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer transition-colors"
              >
                {copiedId === `${messageId}_code_${i}` ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-slate-300 leading-relaxed">
              <code>{codeText}</code>
            </pre>
          </div>
        )
      } else {
        // Plain Markdown text with bold and code tags
        const formattedText = part.split(/(\*\*.*?\*\*|`.*?`)/g).map((subPart, subIdx) => {
          if (subPart.startsWith('**') && subPart.endsWith('**')) {
            return <strong key={subIdx} className="font-bold text-white">{subPart.slice(2, -2)}</strong>
          } else if (subPart.startsWith('`') && subPart.endsWith('`')) {
            return <code key={subIdx} className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 font-mono text-xs text-indigo-300">{subPart.slice(1, -1)}</code>
          }
          return subPart
        })
        
        return <p key={i} className="whitespace-pre-wrap leading-relaxed text-sm text-slate-200">{formattedText}</p>
      }
    })
  }

  const selectedChat = chats.find((c) => c.id === selectedChatId)

  return (
    <div className="flex-grow h-screen flex text-slate-200 bg-[#0c0d14]">
      
      {/* Session History Sidebar */}
      <div className="w-72 border-r border-slate-800/80 bg-slate-950/40 flex flex-col p-4">
        <button
          onClick={handleNewChat}
          className="w-full py-3 mb-4 bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Plus size={16} />
          <span>New AI Conversation</span>
        </button>

        {isLoadingChats ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
            Loading conversations...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => selectChat(chat.id)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedChatId === chat.id 
                    ? 'bg-white/8 border border-white/10' 
                    : 'hover:bg-white/4'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-slate-200 truncate">{chat.title}</h4>
                  <p className="text-[9px] text-slate-500 uppercase font-semibold mt-0.5">
                    {chat.provider} • {chat.model}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteChat(chat.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-all"
                  title="Delete Chat"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Conversation Pane */}
      <div className="flex-1 flex flex-col justify-between h-full bg-mesh-dark">
        {selectedChat ? (
          <>
            {/* Header info */}
            <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/20 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white truncate max-w-lg">{selectedChat.title}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {selectedChat.provider} ({selectedChat.model})
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Provider Active</span>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center gap-3">
                  <Bot size={40} className="text-indigo-500 animate-bounce" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Ask Nexora AI</h3>
                    <p className="text-xs max-w-sm mt-1 leading-relaxed">
                      Send a message to begin. You can write equations, code fragments, or query document collections.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role !== 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <Bot size={16} />
                      </div>
                    )}
                    
                    <div className={`max-w-2xl px-4 py-3 rounded-xl ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md rounded-tr-none' 
                        : 'bg-white/3 border border-white/5 text-slate-200 rounded-tl-none'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        renderMessageContent(msg.content, msg.id)
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
                        <UserIcon size={16} />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating input bar */}
            <div className="p-6 bg-gradient-to-t from-slate-950/80 to-transparent">
              <div className="max-w-3xl mx-auto relative flex items-center gap-2">
                
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-3 rounded-lg border transition-all ${
                    isRecording 
                      ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' 
                      : 'bg-white/3 border-white/5 text-slate-400 hover:text-indigo-400 hover:bg-white/5'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Voice Input (Push-to-Talk)'}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend()
                    }}
                    placeholder={isGenerating ? "Nexora is writing..." : "Ask a question, explain code, or reference document 'doc:summary'..."}
                    disabled={isGenerating}
                    className="w-full pl-4 pr-12 py-3 text-sm glass-input text-white"
                  />
                  <button
                    onClick={handleSend}
                    disabled={isGenerating || !input.trim()}
                    className="absolute right-3 top-2.5 p-1 text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-30 disabled:hover:text-slate-500 cursor-pointer"
                  >
                    <Send size={16} />
                  </button>
                </div>

              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center gap-4">
            <Bot size={48} className="text-slate-700" />
            <div>
              <h3 className="text-md font-bold text-white">Select a Chat Session</h3>
              <p className="text-xs max-w-sm mt-1 leading-relaxed">
                Choose an existing session from the history sidebar, or create a new session to begin.
              </p>
              <button
                onClick={handleNewChat}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white shadow-md cursor-pointer transition-transform hover:scale-[1.01]"
              >
                Create Conversation
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
