/// <reference types="vite/client" />

import type { ElectronAPI } from './types';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on?: (channel: string, listener: (...args: any[]) => void) => void;
        send?: (channel: string, ...args: any[]) => void;
      };
    };
  }
}

export {};
