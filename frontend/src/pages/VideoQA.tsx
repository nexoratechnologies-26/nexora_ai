import React, { useState, useEffect, useRef } from 'react'
import { 
  Video, 
  VideoOff, 
  Monitor, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  RefreshCw, 
  Check, 
  Copy, 
  MessageSquare,
  Zap,
  Radio
} from 'lucide-react'
import { useAuthStore } from '../context/authStore'

interface QAHistoryItem {
  id: string
  timestamp: string
  prompt: string
  answer: string
  snapshotUrl?: string
}

export const VideoQA: React.FC = () => {
  const { token } = useAuthStore()
  
  // Media Stream States
  const [streamMode, setStreamMode] = useState<'webcam' | 'screen'>('webcam')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Audio & TTS States
  const [isMicListening, setIsMicListening] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  
  // Input & History
  const [prompt, setPrompt] = useState('What do you see in front of the video stream right now? Explain in detail.')
  const [history, setHistory] = useState<QAHistoryItem[]>([])
  const [autoInterval, setAutoInterval] = useState<number>(0) // 0 = off, else seconds
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Video Stream Elements
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const speechRecognitionRef = useRef<any>(null)
  const autoTimerRef = useRef<any>(null)

  useEffect(() => {
    // Start default webcam stream on mount
    startStream('webcam')
    return () => {
      stopStream()
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (autoInterval > 0 && isStreaming) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
      autoTimerRef.current = setInterval(() => {
        handleAnalyzeFrame()
      }, autoInterval * 1000)
    } else {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    }
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    }
  }, [autoInterval, isStreaming])

  const startStream = async (mode: 'webcam' | 'screen') => {
    stopStream()
    try {
      let stream: MediaStream
      if (mode === 'webcam') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
        })
      }
      
      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setStreamMode(mode)
      setIsStreaming(true)
    } catch (err) {
      console.error('Failed to access media stream:', err)
      setIsStreaming(false)
    }
  }

  const stopStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
  }

  const captureFrameBase64 = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  }

  const handleAnalyzeFrame = async () => {
    const base64Image = captureFrameBase64()
    if (!base64Image) return
    
    setIsAnalyzing(true)
    const currentPrompt = prompt.trim() || 'Describe this video frame'
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    
    try {
      const res = await fetch('http://localhost:8000/api/v1/video/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image_base64: base64Image,
          prompt: currentPrompt
        })
      })

      if (res.ok) {
        const data = await res.json()
        const newItem: QAHistoryItem = {
          id: String(Date.now()),
          timestamp,
          prompt: currentPrompt,
          answer: data.analysis || 'No analysis generated.',
          snapshotUrl: base64Image
        }
        
        setHistory((prev) => [newItem, ...prev])
        
        // Speak response aloud if TTS enabled
        if (ttsEnabled && window.speechSynthesis) {
          window.speechSynthesis.cancel() // stop prior speech
          const cleanText = data.analysis.replace(/[*#`>_]/g, '')
          const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 300))
          utterance.rate = 1.05
          window.speechSynthesis.speak(utterance)
        }
      }
    } catch (err) {
      console.error('Real-Time Video Q&A error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleSpeechToText = () => {
    if (isMicListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop()
      }
      setIsMicListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsMicListening(true)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setPrompt(transcript)
      setIsMicListening(false)
    }
    recognition.onerror = () => setIsMicListening(false)
    recognition.onend = () => setIsMicListening(false)

    speechRecognitionRef.current = recognition
    recognition.start()
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex-grow h-screen overflow-hidden flex flex-col bg-[#08090e] text-slate-100 bg-mesh-dark">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Video className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">Real-Time Video Copilot</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-ping text-emerald-400" />
                Live Multimodal Vision
              </span>
            </div>
            <p className="text-xs text-slate-400">Stream webcam or screen capture & ask real-time questions via voice or text</p>
          </div>
        </div>

        {/* Controls Header */}
        <div className="flex items-center gap-2">
          {/* Stream Mode Selector */}
          <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => startStream('webcam')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer font-medium ${
                streamMode === 'webcam' && isStreaming
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video size={14} />
              <span>Webcam</span>
            </button>
            <button
              onClick={() => startStream('screen')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer font-medium ${
                streamMode === 'screen' && isStreaming
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor size={14} />
              <span>Screen Share</span>
            </button>
          </div>

          {/* Toggle Stream Start/Stop */}
          {isStreaming ? (
            <button
              onClick={stopStream}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
            >
              <VideoOff size={14} />
              <span>Pause Stream</span>
            </button>
          ) : (
            <button
              onClick={() => startStream(streamMode)}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
            >
              <Video size={14} />
              <span>Resume Stream</span>
            </button>
          )}

          {/* TTS Audio Readout Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title="Toggle Voice Readout of AI Answers"
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              ttsEnabled 
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Live Viewfinder, Right AI Answers */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Side: Video Viewfinder & Frame Q&A Input (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 h-full overflow-hidden">
          {/* Video Container HUD */}
          <div className="relative flex-1 bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-2xl group">
            {/* Live Video Element */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-contain ${!isStreaming && 'hidden'}`} 
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Offline / Stopped Stream Placeholder */}
            {!isStreaming && (
              <div className="flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-600">
                  <VideoOff size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Live Video Stream Off</h3>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">Select Webcam or Screen Share above to start real-time visual Q&A</p>
                </div>
                <button
                  onClick={() => startStream(streamMode)}
                  className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  Start Stream
                </button>
              </div>
            )}

            {/* Stream HUD Top Overlay */}
            {isStreaming && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[11px] text-slate-300 font-mono">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-semibold text-white uppercase">{streamMode} LIVE</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">30 FPS</span>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[11px] text-slate-300">
                  <Zap size={12} className="text-amber-400" />
                  <span>Low Latency Vision</span>
                </div>
              </div>
            )}

            {/* Auto Stream Capture Interval Badge */}
            {autoInterval > 0 && isStreaming && (
              <div className="absolute bottom-3 left-3 bg-purple-950/80 backdrop-blur-md border border-purple-500/30 px-3 py-1 rounded-lg text-[11px] text-purple-300 flex items-center gap-1.5 animate-pulse">
                <RefreshCw size={12} className="animate-spin text-purple-400" />
                <span>Auto-analyzing every {autoInterval}s</span>
              </div>
            )}
          </div>

          {/* Real-Time Prompt Controls Bar */}
          <div className="glass-panel p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2 bg-slate-950/40 backdrop-blur-md">
            <div className="flex items-center gap-2">
              {/* Mic Speech-to-Text Button */}
              <button
                onClick={toggleSpeechToText}
                title={isMicListening ? "Listening..." : "Click to speak your question"}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                  isMicListening 
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse shadow-lg shadow-rose-500/20' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {isMicListening ? <Mic size={16} /> : <MicOff size={16} />}
              </button>

              {/* Text Input Prompt */}
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAnalyzeFrame()
                }}
                placeholder="Ask anything about what the camera/screen sees right now..."
                className="flex-1 bg-slate-900/90 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
              />

              {/* Instant Frame Q&A Button */}
              <button
                onClick={handleAnalyzeFrame}
                disabled={!isStreaming || isAnalyzing}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all hover:scale-[1.01]"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Ask Parakeet</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Prompt Presets & Auto-Interval Select */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-slate-500 font-medium">Quick Prompts:</span>
                <button
                  onClick={() => setPrompt("What object or scene is in front of the camera right now?")}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  Identify Object
                </button>
                <button
                  onClick={() => setPrompt("Read and transcribe all visible text or code on screen.")}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  Read Text/Code
                </button>
                <button
                  onClick={() => setPrompt("Explain what is happening in this live scene step-by-step.")}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  Explain Scene
                </button>
              </div>

              {/* Auto interval mode dropdown */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-slate-500">Auto Scan:</span>
                <select
                  value={autoInterval}
                  onChange={(e) => setAutoInterval(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-0.5 focus:outline-none cursor-pointer"
                >
                  <option value={0}>Manual On-Demand</option>
                  <option value={3}>Every 3 sec</option>
                  <option value={5}>Every 5 sec</option>
                  <option value={10}>Every 10 sec</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: AI Q&A Stream & Visual Answers (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-slate-950/60 rounded-2xl border border-slate-800/80 backdrop-blur-md">
          {/* Panel Header */}
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-400" />
              <h2 className="text-xs font-bold text-white tracking-wide">Visual AI Q&A Response Log</h2>
            </div>
            {history.length > 0 && (
              <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full font-mono">
                {history.length} responses
              </span>
            )}
          </div>

          {/* Q&A Stream Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-3 p-6">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-300">No Video Q&A History Yet</h3>
                  <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                    Click <strong>Ask Parakeet</strong> or enable <strong>Auto Scan</strong> to generate real-time visual answers from your live feed.
                  </p>
                </div>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  className="glass-panel p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-all bg-slate-900/50 flex flex-col gap-2.5 group"
                >
                  {/* Timestamp & User Prompt */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-xs font-semibold text-indigo-300">"{item.prompt}"</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{item.timestamp}</span>
                  </div>

                  {/* Frame Snapshot Thumbnail & Markdown Response */}
                  <div className="flex items-start gap-3">
                    {item.snapshotUrl && (
                      <div className="w-20 h-14 rounded-lg overflow-hidden border border-slate-800 flex-shrink-0 bg-black">
                        <img src={item.snapshotUrl} alt="Frame Snapshot" className="w-full h-full object-cover" />
                      </div>
                    )}
                    
                    <div className="flex-1 text-xs text-slate-300 leading-relaxed space-y-1 font-sans">
                      {item.answer.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/40">
                    <button
                      onClick={() => copyToClipboard(item.answer, item.id)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-400 transition-colors font-medium cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy Answer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
