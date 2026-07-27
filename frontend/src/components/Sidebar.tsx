import React from 'react'
import { 
  LayoutDashboard, 
  MessageSquare, 
  Video,
  FileText, 
  Camera, 
  BookOpen, 
  FolderOpen, 
  Sparkles, 
  Settings as SettingsIcon, 
  Info, 
  LogOut, 
  Moon, 
  Sun,
  Bot
} from 'lucide-react'
import { useAuthStore } from '../context/authStore'
import { useSettingsStore } from '../context/settingsStore'

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const { user, logout } = useAuthStore()
  const { settings, updateSettings } = useSettingsStore()

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'video-qa', label: 'Real-Time Video', icon: Video },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'screenshot', label: 'Screenshots', icon: Camera },
    { id: 'notes', label: 'Notes', icon: BookOpen },
    { id: 'workspace', label: 'Workspace', icon: FolderOpen },
    { id: 'prompts', label: 'Prompt Library', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'about', label: 'About', icon: Info },
  ]

  const toggleTheme = () => {
    if (settings) {
      updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
    }
  }

  return (
    <aside className="w-64 h-screen glass-panel flex flex-col justify-between p-4 z-10 border-r border-slate-800 text-slate-200">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg glow-primary flex items-center justify-center">
            <Bot size={24} className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-400">
              NEXORA AI
            </h1>
            <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold">
              Desktop Copilot
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md glow-primary font-semibold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* User Session card & Theme controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium">Appearance</span>
          <button 
            onClick={toggleTheme}
            className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-indigo-400 transition-colors"
          >
            {settings?.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {user && (
          <div className="p-3 bg-white/3 rounded-lg border border-white/5 flex items-center justify-between gap-2 overflow-hidden">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
            <button 
              onClick={logout}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
