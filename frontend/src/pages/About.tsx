import React, { useEffect, useState } from 'react'
import { Bot, Shield, Cpu, Code, Lock } from 'lucide-react'

export const About: React.FC = () => {
  const [version, setVersion] = useState('1.0.0')

  useEffect(() => {
    const fetchVersion = async () => {
      if (window.electronAPI) {
        const v = await window.electronAPI.getAppVersion()
        setVersion(v)
      }
    }
    fetchVersion()
  }, [])

  return (
    <div className="flex-grow h-screen overflow-y-auto p-8 text-slate-100 bg-[#0c0d14] bg-mesh-dark">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight font-sans">About Nexora AI</h1>
        <p className="text-sm text-slate-400">Desktop Copilot version details and security commitments</p>
      </div>

      <div className="max-w-2xl space-y-6">
        
        {/* Core details card */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 flex items-center gap-6">
          <div className="p-4 bg-indigo-600 rounded-2xl glow-primary flex items-center justify-center shrink-0">
            <Bot size={40} className="text-white" />
          </div>
          <div>
            <h2 className="text-md font-bold text-white">Nexora AI Copilot</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              An intelligent cross-platform desktop application designed for student studies, developer code refactoring, document RAG queries, and OCR layout explanations.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded text-slate-400 font-semibold uppercase tracking-wider">
                Version {version}
              </span>
              <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded text-slate-400 font-semibold uppercase tracking-wider">
                Build: Stable-Release
              </span>
            </div>
          </div>
        </div>

        {/* Privacy Pledge */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield size={14} className="text-emerald-400" />
            <span>Ethical Security & Privacy Pledge</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs leading-relaxed text-slate-400">
            <div className="space-y-1.5 p-3.5 bg-white/2 rounded-lg border border-white/5">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <Lock size={12} className="text-emerald-400" />
                <span>Zero Hidden Scraping</span>
              </h4>
              <p className="text-[11px]">
                We do not collect or monitor background activities. Screen capturing and clipboard analysis execute only under direct user instruction.
              </p>
            </div>

            <div className="space-y-1.5 p-3.5 bg-white/2 rounded-lg border border-white/5">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <Shield size={12} className="text-emerald-400" />
                <span>Encrypted Local DB</span>
              </h4>
              <p className="text-[11px]">
                API keys and chats are stored securely inside a local SQLite instance on your workspace drive.
              </p>
            </div>
          </div>
        </div>

        {/* Technical stack information */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Code size={14} className="text-indigo-400" />
            <span>Architecture & Stack Specifications</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-400">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
              <span className="font-medium text-slate-300">Frontend Application</span>
              <span>React 19 + TypeScript + Vite + Tailwind CSS v4</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
              <span className="font-medium text-slate-300">Desktop Runtime</span>
              <span>Electron Shell wrapper (Alt+Space hotkey bridge)</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
              <span className="font-medium text-slate-300">Inference Backend API</span>
              <span>FastAPI Python 3.12 (uvicorn server)</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="font-medium text-slate-300">Vector Storage (RAG)</span>
              <span>Local Persistent ChromaDB Client indexing</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
