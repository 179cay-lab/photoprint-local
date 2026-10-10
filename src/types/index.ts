export * from './project';

export interface UpdateStatusData {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  bytesPerSecond?: number;
  error?: string;
}

declare global {
  interface Window {
    electronEnv?: {
      isElectron: boolean;
      platform: string;
      getAppVersion: () => Promise<string>;
      checkForUpdates: () => Promise<{ success: boolean; message?: string; updateInfo?: unknown }>;
      quitAndInstall: () => Promise<void>;
      onUpdateStatus: (callback: (data: UpdateStatusData) => void) => () => void;
    };
  }
}
