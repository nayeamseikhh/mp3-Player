const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const { pathToFileURL } = require('url');
const ipcHandlers = require('./ipc/handlers');

protocol.registerSchemesAsPrivileged([{
  scheme: 'music',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    stream: true,
    corsEnabled: true,
    bypassCSP: true,
  },
}]);

const mimeTypes = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wave': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/opus',
  '.aiff': 'audio/aiff',
  '.aif': 'audio/aiff',
  '.wma': 'audio/x-ms-wma',
  '.alac': 'audio/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

// Set application name early
app.setName('MyMusicPlayer');

// Handle squirrel startup on Windows (no-op on macOS)
if (process.platform === 'win32') {
  try {
    const squirrelStartup = require('electron-squirrel-startup');
    if (squirrelStartup) {
      app.quit();
    }
  } catch (e) {
    // optional dependency on non-windows
  }
}

const isDev = !app.isPackaged;
const IS_MAC = process.platform === 'darwin';

// Application data directory - use userData for database
const appDataPath = app.getPath('userData');
const databasePath = path.join(appDataPath, 'mymusicplayer.db');

// Ensure data directory exists
if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath, { recursive: true });
}

// Database service reference
let DatabaseService = null;

// Attach database service once initialized
function attachDatabase(db) {
  DatabaseService = db;
  console.log('Database service attached in main.js');
}

// Initialize database connection
async function initDatabase() {
  try {
    const { DatabaseService: DS } = require('./database/connection');
    const db = await DS.initialize(databasePath);
    attachDatabase(db);
    console.log('Database initialized at:', databasePath);
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return null;
  }
}

// Create the main application window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,
    },
    title: 'MyMusicPlayer',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Don't show until DOM is loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

let mainWindow = null;

app.whenReady().then(async () => {
  // Initialize database first
  const db = await initDatabase();

  protocol.handle('music', async (request) => {
    try {
      let rawPath = request.url.replace(/^music:\/\/track\//, '').split('?')[0];
      const filePath = decodeURIComponent(rawPath);
      if (!path.isAbsolute(filePath)) {
        return new Response('Not found', { status: 404 });
      }

      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

      // Security validation: verify with database if available
      if (DatabaseService?.db) {
        try {
          const knownMedia = DatabaseService.db.prepare(`
            SELECT 1 FROM songs WHERE file_path = ? OR artwork_path = ?
            UNION SELECT 1 FROM playlists WHERE cover_path = ?
            LIMIT 1
          `).get(filePath, filePath, filePath);

          if (!knownMedia) {
            const normalized = path.normalize(filePath);
            const knownNorm = DatabaseService.db.prepare(`
              SELECT 1 FROM songs WHERE file_path = ? OR artwork_path = ?
              UNION SELECT 1 FROM playlists WHERE cover_path = ?
              LIMIT 1
            `).get(normalized, normalized, normalized);

            if (!knownNorm) {
              const ext = path.extname(filePath).toLowerCase();
              if (!mimeTypes[ext]) {
                return new Response('Not found', { status: 404 });
              }
            }
          }
        } catch (dbErr) {
          console.warn('Media verification warning:', dbErr);
        }
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const mimeType = getMimeType(filePath);

      // Handle HEAD request
      if (request.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': String(fileSize),
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const rangeHeader = request.headers.get('range');
      if (rangeHeader) {
        let start = 0;
        let end = fileSize - 1;
        const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
        if (match) {
          if (match[1] !== '') {
            start = parseInt(match[1], 10);
            if (match[2] !== '') {
              end = parseInt(match[2], 10);
            }
          } else if (match[2] !== '') {
            const suffix = parseInt(match[2], 10);
            start = Math.max(0, fileSize - suffix);
            end = fileSize - 1;
          }
        }

        if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
          return new Response(null, {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        const chunkSize = end - start + 1;
        const stream = fs.createReadStream(filePath, { start, end });
        return new Response(Readable.toWeb(stream), {
          status: 206,
          statusText: 'Partial Content',
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // No range specified -> stream full file with range headers enabled
      const stream = fs.createReadStream(filePath);
      return new Response(Readable.toWeb(stream), {
        status: 200,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': String(fileSize),
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Failed to serve library media:', error);
      return new Response('Unable to load media', { status: 500 });
    }
  });

  // Register IPC handlers
  Object.values(ipcHandlers).forEach((registerFn) => {
    if (typeof registerFn === 'function') {
      try {
        registerFn(ipcMain);
      } catch (err) {
        console.error('Failed to register IPC handler:', err);
      }
    }
  });

  // Create window
  mainWindow = createWindow();
});

app.on('window-all-closed', () => {
  if (!IS_MAC) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
});

app.on('before-quit', () => {
  if (DatabaseService) {
    try {
      DatabaseService.savePlaybackState();
    } catch (error) {
      console.error('Error saving playback state:', error);
    }
  }
});

// Handle power events for sleep/wake behavior
app.on('browser-window-blur', () => {
  // Window lost focus, could pause if needed
});

app.on('browser-window-focus', () => {
  // Window gained focus, resume audio context if suspended
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win.webContents) {
      win.webContents.send('mymusicplayer:app:focus');
    }
  });
});

app.on('will-quit', () => {
  ipcMain.removeAllListeners();
});

module.exports = { app, BrowserWindow, ipcMain, databasePath };
