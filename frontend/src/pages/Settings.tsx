import React, { useEffect, useState } from 'react'
import { 
  Save, 
  Cpu, 
  Settings as SettingsIcon, 
  Eye, 
  EyeOff, 
  Clipboard, 
  Volume2, 
  Sliders,
  Check,
  Key
} from 'lucide-react'
import { useSettingsStore, Settings as SettingsType } from '../context/settingsStore'

export const Settings: React.FC = () => {
  const { settings, isLoading, error, loadSettings, updateSettings, getApiKeys, setApiKey } = useSettingsStore()

  // Form states
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [fontSize, setFontSize] = useState(14)
  const [provider, setProvider] = useState('openai')
  const [modelName, setModelName] = useState('gpt-4o')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [clipboardMon, setClipboardMon] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)

  // API keys states
  const [openaiKey, setOpenaiKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434')

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (settings) {
      setTheme(settings.theme)
      setFontSize(settings.font_size)
      setProvider(settings.model_provider)
      setModelName(settings.model_name)
      setTemperature(settings.temperature)
      setMaxTokens(settings.max_tokens)
      setClipboardMon(settings.clipboard_monitoring_enabled)
      setVoiceEnabled(settings.voice_enabled)

      const keys = getApiKeys()
      setOpenaiKey(keys.openai || '')
      setGeminiKey(keys.gemini || '')
      setClaudeKey(keys.claude || '')
      setOllamaHost(keys.ollama_host || 'http://localhost:11434')
    }
  }, [settings])

  const toggleShowKey = (providerName: string) => {
    setShowKeys((prev) => ({ ...prev, [providerName]: !prev[providerName] }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)

    // Save core settings
    const successCore = await updateSettings({
      theme,
      font_size: fontSize,
      model_provider: provider,
      model_name: modelName,
      temperature,
      max_tokens: maxTokens,
      clipboard_monitoring_enabled: clipboardMon,
      voice_enabled: voiceEnabled
    })

    // Save API keys
    const keys = {
      openai: openaiKey,
      gemini: geminiKey,
      claude: claudeKey,
      ollama_host: ollamaHost
    }
    const successKeys = await updateSettings({ api_keys_json: JSON.stringify(keys) })

    if (successCore && successKeys) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
    setSaving(false)
  }

  if (isLoading && !settings) {
    return (
      <div className="flex-grow h-screen flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm">Retrieving local configuration parameters...</p>
        </div>
      </div>
    )
  }

  const providers = [
    { id: 'openai', label: 'OpenAI (Cloud)', defaultModel: 'gpt-4o' },
    { id: 'gemini', label: 'Google Gemini (Cloud)', defaultModel: 'gemini-1.5-flash' },
    { id: 'claude', label: 'Anthropic Claude (Cloud)', defaultModel: 'claude-3-5-sonnet-20240620' },
    { id: 'ollama', label: 'Ollama (Local Offline)', defaultModel: 'llama3' }
  ]

  return (
    <div className="flex-grow h-screen overflow-y-auto p-8 text-slate-100 bg-[#0c0d14] bg-mesh-dark">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-400">Configure model providers, secure credentials, custom visuals, and automation preferences</p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-2 max-w-2xl">
          <Check size={14} />
          <span>System configuration saved successfully. Workspace synced.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold max-w-2xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="max-w-2xl space-y-8">
        
        {/* Model Provider Config */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Cpu size={16} className="text-indigo-400" />
            <span>AI Model & Inference Provider</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Default Model Provider</label>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value)
                  const matched = providers.find((p) => p.id === e.target.value)
                  if (matched) setModelName(matched.defaultModel)
                }}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded p-2.5 focus:outline-none"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Active Model Name</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. gpt-4o"
                className="w-full p-2.5 text-xs glass-input text-white"
              />
            </div>
          </div>

          {/* Sliders for Temperature / Token counts */}
          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Temperature</span>
                <span className="text-indigo-400">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Max Prediction Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full p-2 text-xs glass-input text-white"
              />
            </div>
          </div>
        </div>

        {/* API Credentials */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key size={16} className="text-yellow-400" />
            <span>API Credentials & Key Storage</span>
          </h3>

          <div className="space-y-3.5">
            {/* OpenAI API Key */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase">OpenAI API Key</label>
              <div className="relative">
                <input
                  type={showKeys['openai'] ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full pl-3 pr-10 py-2.5 text-xs glass-input text-white"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('openai')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showKeys['openai'] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Google Gemini API Key */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Google Gemini API Key</label>
              <div className="relative">
                <input
                  type={showKeys['gemini'] ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-3 pr-10 py-2.5 text-xs glass-input text-white"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('gemini')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showKeys['gemini'] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Anthropic Claude API Key */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Anthropic Claude API Key</label>
              <div className="relative">
                <input
                  type={showKeys['claude'] ? 'text' : 'password'}
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full pl-3 pr-10 py-2.5 text-xs glass-input text-white"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('claude')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showKeys['claude'] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Ollama Local Host */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Ollama Host (Offline local models)</label>
              <input
                type="text"
                value={ollamaHost}
                onChange={(e) => setOllamaHost(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full p-2.5 text-xs glass-input text-white"
              />
            </div>
          </div>
        </div>

        {/* Feature Switches & Visuals */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders size={16} className="text-emerald-400" />
            <span>Preferences & Privacy Controls</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Visual Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded p-2.5 focus:outline-none"
              >
                <option value="dark">Dark Glassmorphism (Recommended)</option>
                <option value="light">Light Slate Glassmorphism</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Base Font Size (px)</label>
              <input
                type="number"
                min="11"
                max="20"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full p-2.5 text-xs glass-input text-white"
              />
            </div>
          </div>

          <div className="pt-2 space-y-3">
            {/* Clipboard watch toggle */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={clipboardMon}
                onChange={(e) => setClipboardMon(e.target.checked)}
                className="mt-0.5 w-4 h-4 bg-slate-900 border border-slate-800 rounded accent-indigo-600 focus:ring-0 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-slate-200">Enable Clipboard AI Watcher</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  Automatically listens to copied text only. Processing triggers only when you explicitly select a popover command.
                </p>
              </div>
            </label>

            {/* Voice toggle */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="mt-0.5 w-4 h-4 bg-slate-900 border border-slate-800 rounded accent-indigo-600 focus:ring-0 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-slate-200">Enable Voice Assistance (STT/TTS)</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  Synthesizes chat text responses into audio outputs and enables push-to-talk microphone recordings.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white flex items-center gap-2 shadow-lg glow-primary cursor-pointer transition-transform hover:scale-[1.01]"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={14} />
              <span>Save System Configuration</span>
            </>
          )}
        </button>

      </form>
    </div>
  )
}
