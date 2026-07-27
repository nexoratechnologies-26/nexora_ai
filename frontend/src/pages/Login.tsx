import React, { useState } from 'react'
import { useAuthStore } from '../context/authStore'
import { Bot, Mail, Lock, User as UserIcon, LogIn, Sparkles, Globe } from 'lucide-react'

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  
  const { login, signup, loginGuest, isLoading, error } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    if (isSignUp) {
      await signup(email, password, name)
    } else {
      await login(email, password)
    }
  }

  const handleGuestMode = async () => {
    await loginGuest()
  }

  return (
    <div className="w-screen h-screen bg-[#090a0f] flex items-center justify-center bg-mesh-dark p-4">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative z-10 text-slate-200">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-lg glow-primary flex items-center justify-center">
            <Bot size={32} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-wider text-white">
              {isSignUp ? 'Create Nexora Account' : 'Welcome back'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isSignUp ? 'Sign up to start sync' : 'Secure offline-first AI desktop companion'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Full Name</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm glass-input text-white"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3.5 text-slate-500" />
              <input
                type="email"
                placeholder="developer@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 text-sm glass-input text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3.5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 text-sm glass-input text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-semibold text-white transition-all shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.01] flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest px-3 font-semibold">Or continue with</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* OAuth Buttons & Guest mode */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => loginGuest()} 
              className="py-2.5 px-4 bg-white/3 border border-white/5 rounded-lg text-xs font-medium hover:bg-white/6 flex items-center justify-center gap-2 text-slate-300 transition-colors"
            >
              <Globe size={14} className="text-red-400" />
              Google
            </button>
            <button 
              onClick={() => loginGuest()} 
              className="py-2.5 px-4 bg-white/3 border border-white/5 rounded-lg text-xs font-medium hover:bg-white/6 flex items-center justify-center gap-2 text-slate-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5 fill-current text-slate-200" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>

          <button
            onClick={handleGuestMode}
            className="w-full py-3 bg-white/5 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-2 transition-all hover:bg-indigo-500/5 glow-btn cursor-pointer"
          >
            <Sparkles size={14} className="animate-pulse" />
            <span>Launch Guest Mode (Instant Access)</span>
          </button>
        </div>

        <div className="text-center text-xs mt-6 text-slate-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-400 hover:underline font-semibold"
          >
            {isSignUp ? 'Sign In' : 'Register now'}
          </button>
        </div>
      </div>
    </div>
  )
}
