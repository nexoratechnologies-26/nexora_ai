import React, { useEffect } from 'react'
import { Bot } from 'lucide-react'

interface SplashProps {
  onFinish: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish()
    }, 2200)
    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <div className="w-screen h-screen bg-[#090a0f] flex flex-col items-center justify-center text-white relative overflow-hidden bg-mesh-dark">
      {/* Background radial effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Core animation panel */}
      <div className="flex flex-col items-center gap-6 animate-fade-in relative z-10">
        <div className="p-5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl shadow-2xl shadow-indigo-500/20 glow-primary flex items-center justify-center animate-bounce duration-1000">
          <Bot size={48} className="text-white animate-pulse" />
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-indigo-400">
            NEXORA AI
          </h1>
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-[0.25em]">
            Ethical Desktop Copilot
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mt-6 relative">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-loading-bar absolute left-0 w-2/3" />
        </div>
        
        <span className="text-[10px] text-slate-500 tracking-wider">
          Initializing local workspace environment...
        </span>
      </div>

      {/* Embedded CSS animations for specific loader speeds */}
      <style>{`
        @keyframes loading {
          0% { left: -100%; width: 50%; }
          50% { left: 30%; width: 70%; }
          100% { left: 100%; width: 30%; }
        }
        .animate-loading-bar {
          animation: loading 2.2s infinite ease-in-out;
        }
      `}</style>
    </div>
  )
}
