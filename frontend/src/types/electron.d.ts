export interface IElectronAPI {
  toggleClipboardMonitor: (enabled: boolean) => Promise<boolean>;
  captureScreen: () => Promise<{ success: boolean; simulated: boolean; message: string } | null>;
  getAppVersion: () => Promise<string>;
  onClipboardChanged: (callback: (text: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}
