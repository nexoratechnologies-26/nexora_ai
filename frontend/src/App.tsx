import { useState, useEffect } from 'react'
import { useAuthStore } from './context/authStore'
import { useSettingsStore } from './context/settingsStore'
import { Sidebar } from './components/Sidebar'
import { Splash } from './components/Splash'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Chat } from './pages/Chat'
import { Documents } from './pages/Documents'
import { ScreenshotAnalyzer } from './pages/ScreenshotAnalyzer'
import { Notes } from './pages/Notes'
import { Workspace } from './pages/Workspace'
import { PromptLibrary } from './pages/PromptLibrary'
import { Settings } from './pages/Settings'
import { About } from './pages/About'

function App() {
  const { isAuthenticated, initialize, isLoading } = useAuthStore()
  const { loadSettings } = useSettingsStore()
  
  const [splashDone, setSplashDone] = useState(false)
  const [activePage, setActivePage] = useState('dashboard')

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings()
    }
  }, [isAuthenticated])

  // 1. Splash Phase
  if (!splashDone) {
    return <Splash onFinish={() => setSplashDone(true)} />
  }

  // 2. Auth Loading state
  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-[#090a0f] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm">Restoring desktop session...</p>
        </div>
      </div>
    )
  }

  // 3. Unauthenticated Login screen
  if (!isAuthenticated) {
    return <Login />
  }

  // 4. Authenticated Desktop layout shell
  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} />
      case 'chat':
        return <Chat />
      case 'documents':
        return <Documents />
      case 'screenshot':
        return <ScreenshotAnalyzer />
      case 'notes':
        return <Notes />
      case 'workspace':
        return <Workspace />
      case 'prompts':
        return <PromptLibrary />
      case 'settings':
        return <Settings />
      case 'about':
        return <About />
      default:
        return <Dashboard setActivePage={setActivePage} />
    }
  }

  return (
    <div className="w-screen h-screen flex overflow-hidden font-sans select-none antialiased bg-[#090a0f] text-slate-200">
      {/* Sidebar Navigation */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      
      {/* Dynamic Main Pane View */}
      <main className="flex-1 h-full overflow-hidden flex flex-col">
        {renderActivePage()}
      </main>
    </div>
  )
}

export default App
