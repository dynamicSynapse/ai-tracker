import { app, BrowserWindow, Tray, Menu, dialog, ipcMain, nativeImage } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from './db/database';
import { seedDefaultActivities } from './db/migrations';
import { createServer, startServer, stopServer } from './api/server';
import { registerIpcHandlers } from './api/ipc-handlers';
import { startScheduler, stopScheduler } from './scheduler/scheduler';
import { getSetting, setSetting, getActivities } from './db/queries';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const isDev = !app.isPackaged;

async function loadURLWithRetry(win: BrowserWindow, url: string, retries = 10, delay = 1000): Promise<void> {
    for (let i = 0; i < retries; i++) {
        try {
            await win.loadURL(url);
            return;
        } catch (err) {
            console.log(`[Main] Retry ${i + 1}/${retries}: Waiting for dev server...`);
            if (i === retries - 1) throw err;
            await new Promise((r) => setTimeout(r, delay));
        }
    }
}

function createWindow(): void {
    const iconPath = isDev
        ? path.join(__dirname, '../../build/icon.ico')
        : path.join(process.resourcesPath, 'app.asar.unpacked/build/icon.ico');
    // In a packaged app, if not explicitly excluded from asar, it might just be __dirname, '../../build/icon.ico'
    // Actually, electron-builder automatically handles window icons if we just point to the right place.
    // Let's use a safe resolution.
    const resolvedIconPath = app.isPackaged
        ? path.join(process.resourcesPath, 'build', 'icon.ico')
        : path.join(__dirname, '../../build/icon.ico');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: '#0A0E17',
        titleBarStyle: 'default',
        icon: isDev ? path.join(__dirname, '../../build/icon.ico') : undefined, // Packaged apps automatically pick it up, dev needs explicit
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // Fallback: show window after 8 seconds
    setTimeout(() => {
        if (mainWindow && !mainWindow.isVisible()) {
            console.log('[Main] Fallback: showing window after timeout');
            mainWindow.show();
        }
    }, 8000);

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        console.error(`[Main] Page failed to load: ${errorCode} - ${errorDescription}`);
    });

    if (isDev) {
        loadURLWithRetry(mainWindow, 'http://localhost:5173')
            .then(() => {
                console.log('[Main] Dev server loaded');
            })
            .catch((err) => {
                console.error('[Main] Failed to connect to dev server:', err);
                mainWindow?.show();
            });
    } else {
        const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');
        mainWindow.loadFile(rendererPath).catch((err) => {
            console.error('[Main] Failed to load renderer:', err);
            mainWindow?.show();
        });
    }

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
}

function createTray(): void {
    const iconPath = isDev ? path.join(__dirname, '../../build/icon.ico') : path.join(process.resourcesPath, 'build', 'icon.ico');
    // Note: If electron-builder doesn't copy build/ out of app.asar, we need to ensure it's accessible.
    // By default, electron-builder copies buildResources but doesn't necessarily bundle them into the app root at runtime unless specified.
    // However, if we just use the ico for the tray, let's try to load it. If it fails, fallback to a nativeImage empty or default.
    let icon;
    try {
        icon = nativeImage.createFromPath(isDev ? path.join(__dirname, '../../build/icon.ico') : path.join(__dirname, '../../build/icon.ico'));
    } catch (e) {
        icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('AI Tracker');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Dashboard',
            click: () => { mainWindow?.show(); mainWindow?.focus(); },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => { isQuitting = true; app.quit(); },
        },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// IPC for app info
ipcMain.handle('get-app-info', async () => ({
    version: app.getVersion(),
    dataPath: app.getPath('appData'),
    isPackaged: app.isPackaged,
}));

// IPC for notifications
ipcMain.on('send-notification', (_event, title: string, body: string) => {
    const { Notification } = require('electron');
    if (Notification.isSupported()) {
        new Notification({ title, body }).show();
    }
});

app.whenReady().then(async () => {
    try {
        console.log('[Main] Initializing...');
        const db = initDatabase();

        // Seed default activities on first run
        const activities = getActivities();
        if (activities.length === 0) {
            seedDefaultActivities(db);
            console.log('[Main] Seeded default activities');
        }

        // Defaults
        if (!getSetting('http_server_enabled')) setSetting('http_server_enabled', 'false');
        if (!getSetting('daily_summary_time')) setSetting('daily_summary_time', '21:00');

        createServer();
        const httpEnabled = getSetting('http_server_enabled') === 'true';
        if (httpEnabled) await startServer();

        console.log('[Main] Starting Telegram Bot');
        const { startTelegramBot } = require('./telegram/bot');
        startTelegramBot();

        registerIpcHandlers();
        createWindow();
        createTray();
        startScheduler();
        console.log('[Main] App ready');
    } catch (err) {
        console.error('[Main] FATAL:', err);
        try {
            const errWin = new BrowserWindow({ width: 600, height: 300, show: true });
            errWin.loadURL(
                `data:text/html,<html><body style="background:#0A0E17;color:#fff;font-family:sans-serif;padding:40px;text-align:center"><h2>⚠️ Startup Error</h2><p>${(err as Error).message}</p></body></html>`,
            );
        } catch { /* last resort */ }
    }
});

app.on('before-quit', () => {
    isQuitting = true;
    stopScheduler();
    stopServer();
    closeDatabase();
});

app.on('window-all-closed', () => { /* stay in tray */ });

app.on('activate', () => {
    if (mainWindow) mainWindow.show();
});
