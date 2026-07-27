import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  toggleClipboardMonitor: (enabled: boolean) => 
    ipcRenderer.invoke('toggle-clipboard-monitor', enabled),
    
  captureScreen: () => 
    ipcRenderer.invoke('capture-screen'),
    
  getAppVersion: () => 
    ipcRenderer.invoke('get-app-version'),
    
  minimizeWindow: () => 
    ipcRenderer.invoke('minimize-window'),

  hideWindow: () => 
    ipcRenderer.invoke('hide-window'),

  showWindow: () => 
    ipcRenderer.invoke('show-window'),
    
  onClipboardChanged: (callback: (text: string) => void) => {
    const subscription = (event: any, text: string) => callback(text)
    ipcRenderer.on('clipboard-changed', subscription)
    return () => {
      ipcRenderer.removeListener('clipboard-changed', subscription)
    }
  }
})
