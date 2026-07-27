import { app, BrowserWindow, globalShortcut, clipboard, ipcMain, screen } from 'electron'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null
let clipboardTimer: NodeJS.Timeout | null = null
let lastClipboardText = ''
let clipboardMonitoring = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    titleBarStyle: 'hiddenInset', // Sleek macOS style window controls
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // In development, load the Vite local server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load the compiled index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Global Hotkey Setup
function registerGlobalHotkeys() {
  // Alt+Space to toggle window visibility
  globalShortcut.register('Alt+Space', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

// Clipboard Monitor Loop
function startClipboardMonitoring() {
  if (clipboardTimer) clearInterval(clipboardTimer)
  
  lastClipboardText = clipboard.readText()
  clipboardTimer = setInterval(() => {
    if (!clipboardMonitoring) return

    const currentText = clipboard.readText()
    if (currentText && currentText !== lastClipboardText) {
      lastClipboardText = currentText
      if (mainWindow) {
        mainWindow.webContents.send('clipboard-changed', currentText)
      }
    }
  }, 1000)
}

// IPC Receivers
ipcMain.handle('toggle-clipboard-monitor', (event, enabled: boolean) => {
  clipboardMonitoring = enabled
  if (enabled) {
    startClipboardMonitoring()
  } else if (clipboardTimer) {
    clearInterval(clipboardTimer)
  }
  return clipboardMonitoring
})

ipcMain.handle('capture-screen', async () => {
  if (!mainWindow) return null

  // Hide the copilot window before taking the screenshot so it is not in the image
  mainWindow.hide()
  
  // Wait brief duration for window to hide
  await new Promise(resolve => setTimeout(resolve, 350))
  
  // In a full packaging scenario, you can spawn a native crop utility or screen-capture command
  // For local presentation, we can read an image from our database or a simulated crop area
  // Here we grab a simulated desktop screenshot asset/local mockup image
  mainWindow.show()
  
  return {
    success: true,
    simulated: true,
    message: "Screen capture captured successfully. Mock screenshot returned."
  }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

app.whenReady().then(() => {
  createWindow()
  registerGlobalHotkeys()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (clipboardTimer) clearInterval(clipboardTimer)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
