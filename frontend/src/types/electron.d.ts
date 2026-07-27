export interface IElectronAPI {
  toggleClipboardMonitor: (enabled: boolean) => Promise<boolean>;
  captureScreen: () => Promise<{ success: boolean; simulated: boolean; message: string } | null>;
  getAppVersion: () => Promise<string>;
  minimizeWindow: () => Promise<void>;
  hideWindow: () => Promise<void>;
  showWindow: () => Promise<void>;
  onClipboardChanged: (callback: (text: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}
