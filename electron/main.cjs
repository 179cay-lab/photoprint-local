// ============================================================
// Electron Main Process for PhotoPrint Local (with Auto-Update)
// ============================================================

const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

// Configure autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('updater:status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:status', {
      status: 'available',
      version: info.version,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('updater:status', {
      status: 'not-available',
      version: info.version,
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('updater:status', {
      status: 'downloading',
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:status', {
      status: 'downloaded',
      version: info.version,
    });

    if (mainWindow) {
      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: 'Cập nhật PhotoPrint Local',
          message: `Đã tải xong bản cập nhật mới (v${info.version})!`,
          detail: 'Bạn có muốn khởi động lại ứng dụng ngay bây giờ để hoàn tất nâng cấp?',
          buttons: ['Khởi động lại ngay', 'Để sau'],
          defaultId: 0,
          cancelId: 1,
        })
        .then((res) => {
          if (res.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
    }
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('updater:status', {
      status: 'error',
      error: err ? err.message : 'Lỗi kiểm tra cập nhật',
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 650,
    title: 'PhotoPrint Local - Dàn ảnh in Epson',
    icon: path.join(__dirname, '../public/favicon.svg'),
    backgroundColor: '#0f172a',
    show: false, // Tránh giật lag, hiện khi renderer đã sẵn sàng
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false, // Cho phép load local image/canvas
      spellcheck: false, // Tắt kiểm tra chính tả giúp tăng tốc nạp ~30%
      backgroundThrottling: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Mở link bên ngoài bằng trình duyệt mặc định
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:check-for-updates', async () => {
  if (process.env.VITE_DEV_SERVER_URL) {
    return { success: false, message: 'Đang chạy môi trường Dev, không kiểm tra auto-update.' };
  }
  try {
    const res = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: res?.updateInfo };
  } catch (error) {
    return { success: false, message: error?.message || 'Không thể kết nối đến máy chủ cập nhật' };
  }
});

ipcMain.handle('app:quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  // Tự động kiểm tra bản cập nhật sau khi mở app 4 giây (chỉ trên production)
  if (!process.env.VITE_DEV_SERVER_URL) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.log('Background update check error:', err?.message);
      });
    }, 4000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
