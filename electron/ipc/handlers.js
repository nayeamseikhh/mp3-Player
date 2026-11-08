const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const DatabaseService = require('../database/connection').DatabaseService;

function registerFileHandlers(ipcMain) {
  ipcMain.handle('mymusicplayer:fs:selectFiles', async (event, options = {}) => {
    const { filters = [], properties = ['openFile', 'multiSelections'] } = options;
    const result = await dialog.showOpenDialog({
      filters: filters.length > 0 ? filters : [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'aiff', 'alac', 'opus', 'wma'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties
    });
    return result.filePaths || [];
  });

  ipcMain.handle('mymusicplayer:fs:selectFolder', async (event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return result.filePaths[0] || null;
  });

  ipcMain.handle('mymusicplayer:fs:readFile', async (event, filePath, encoding = 'utf8') => {
    try {
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  });

  ipcMain.handle('mymusicplayer:fs:writeFile', async (event, filePath, data, encoding = 'utf8') => {
    try {
      fs.writeFileSync(filePath, data, encoding);
      return true;
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  });

  ipcMain.handle('mymusicplayer:fs:exists', async (event, filePath) => {
    return fs.existsSync(filePath);
  });

  ipcMain.handle('mymusicplayer:fs:getFileSize', async (event, filePath) => {
    try {
      const stats = fs.statSync(filePath);
      return stats.isFile() ? stats.size : 0;
    } catch (error) {
      throw new Error(`Failed to read file size: ${error.message}`);
    }
  });

  ipcMain.handle('mymusicplayer:fs:listDirectory', async (event, dirPath) => {
    try {
      return fs.readdirSync(dirPath, { withFileTypes: true })
        .filter(d => d.isFile())
        .map(d => d.name);
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  });
}

function registerMusicHandlers(ipcMain) {
  ipcMain.handle('mymusicplayer:music:getAll', async (event, options = {}) => {
    return DatabaseService.getSongs(options);
  });

  ipcMain.handle('mymusicplayer:music:getById', async (event, id) => {
    return DatabaseService.getSongById(id);
  });

  ipcMain.handle('mymusicplayer:music:search', async (event, query) => {
    return DatabaseService.searchSongs(query);
  });

  ipcMain.handle('mymusicplayer:music:getStats', async (event) => {
    return DatabaseService.getSongStats();
  });

  ipcMain.handle('mymusicplayer:music:getRecentlyAdded', async (event, limit = 10) => {
    return DatabaseService.getRecentlyAdded(limit);
  });

  ipcMain.handle('mymusicplayer:music:getByArtist', async (event, artist, limit = 50) => {
    return DatabaseService.getByArtist(artist, limit);
  });

  ipcMain.handle('mymusicplayer:music:getByAlbum', async (event, album, limit = 50) => {
    return DatabaseService.getByAlbum(album, limit);
  });

  ipcMain.handle('mymusicplayer:music:getByGenre', async (event, genre, limit = 50) => {
    return DatabaseService.getByGenre(genre, limit);
  });

  ipcMain.handle('mymusicplayer:music:updateMetadata', async (event, id, metadata) => {
    return DatabaseService.updateSong(id, metadata);
  });

  ipcMain.handle('mymusicplayer:music:delete', async (event, id) => {
    return DatabaseService.deleteSong(id);
  });

  ipcMain.handle('mymusicplayer:music:checkMissing', async (event) => {
    return require('../services/musicScanner').checkMissingFiles();
  });

  ipcMain.handle('mymusicplayer:music:rescan', async (event, folderPath = null) => {
    const ScannerService = require('../services/musicScanner');
    return ScannerService.rescanLibrary(folderPath);
  });

  ipcMain.handle('mymusicplayer:music:import', async (event, options = {}) => {
    const { filePaths } = options;
    try {
      let paths = filePaths;
      // If no specific file paths provided, open a file picker dialog
      if (!paths || paths.length === 0) {
        const result = await dialog.showOpenDialog({
          properties: ['openFile', 'multiSelections'],
          filters: [
            { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'aiff', 'alac', 'opus', 'wma'] },
            { name: 'All Files', extensions: ['*'] }
          ],
        });
        paths = result.filePaths || [];
      }

      if (!paths || paths.length === 0) {
        return { success: false, error: 'No files selected', imported: 0, duplicates: 0, errors: 0 };
      }

      const ScannerService = require('../services/musicScanner');
      const result = await ScannerService.scanAndImport(paths, {
        duplicateHandling: options.duplicateHandling || 'skip',
        recursive: options.includeSubfolders !== false,
        onProgress: (current, total, filePath) => {
          try { event.sender.send('mymusicplayer:music:importProgress', { current, total, filePath }); } catch { }
        },
      });

      const foundFiles = result.imported + result.skipped + result.duplicates;
      return {
        success: foundFiles > 0,
        ...result,
        ...(foundFiles === 0 ? { error: 'No supported audio files could be imported from the selected paths.' } : {}),
      };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, error: error.message, imported: 0, duplicates: 0, errors: 0 };
    }
  });

  ipcMain.handle('mymusicplayer:music:importFolder', async (event, folderPath = null, options = {}) => {
    try {
      let targetFolder = folderPath;
      // If no specific folder provided, open a folder picker dialog
      if (!targetFolder) {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],
        });
        targetFolder = result.filePaths[0] || null;
      }

      if (!targetFolder) {
        return { success: false, error: 'No folder selected', imported: 0, duplicates: 0, errors: 0 };
      }

      const ScannerService = require('../services/musicScanner');
      const result = await ScannerService.scanAndImport(targetFolder, {
        duplicateHandling: options.duplicateHandling || 'skip',
        recursive: options.includeSubfolders !== false,
        onProgress: (current, total, filePath) => {
          try { event.sender.send('mymusicplayer:music:importProgress', { current, total, filePath }); } catch { }
        },
      });

      const foundFiles = result.imported + result.skipped + result.duplicates;
      return {
        success: foundFiles > 0,
        ...result,
        ...(foundFiles === 0 ? { error: 'No supported audio files were found in this folder.' } : {}),
        folder: targetFolder,
      };
    } catch (error) {
      console.error('Folder import failed:', error);
      return { success: false, error: error.message, imported: 0, duplicates: 0, errors: 0 };
    }
  });
}

function registerPlaylistHandlers(ipcMain) {
  ipcMain.handle('mymusicplayer:playlist:getAll', async (event) => {
    return DatabaseService.getPlaylists();
  });

  ipcMain.handle('mymusicplayer:playlist:getById', async (event, id) => {
    return DatabaseService.getPlaylistById(id);
  });

  ipcMain.handle('mymusicplayer:playlist:create', async (event, playlist) => {
    return DatabaseService.createPlaylist(playlist);
  });

  ipcMain.handle('mymusicplayer:playlist:update', async (event, id, updates) => {
    return DatabaseService.updatePlaylist(id, updates);
  });

  ipcMain.handle('mymusicplayer:playlist:delete', async (event, id) => {
    return DatabaseService.deletePlaylist(id);
  });

  ipcMain.handle('mymusicplayer:playlist:addSong', async (event, playlistId, songId) => {
    return DatabaseService.addSongToPlaylist(playlistId, songId);
  });

  ipcMain.handle('mymusicplayer:playlist:removeSong', async (event, playlistId, songId) => {
    return DatabaseService.removeSongFromPlaylist(playlistId, songId);
  });

  ipcMain.handle('mymusicplayer:playlist:reorder', async (event, playlistId, songOrder) => {
    return DatabaseService.reorderPlaylist(playlistId, songOrder);
  });

  ipcMain.handle('mymusicplayer:playlist:getSongs', async (event, playlistId) => {
    return DatabaseService.getPlaylistSongs(playlistId);
  });

  ipcMain.handle('mymusicplayer:playlist:exportM3U', async (event, playlistId, format = 'm3u') => {
    const playlist = DatabaseService.getPlaylistById(playlistId);
    const songs = DatabaseService.getPlaylistSongs(playlistId);

    if (format === 'm3u') {
      let content = '#EXTM3U\n';
      for (const song of songs) {
        content += `#EXTINF:${Math.round(song.duration)},${song.artist} - ${song.title}\n`;
        content += `${song.file_path}\n`;
      }
      return { success: true, content, filename: `${playlist.name}.m3u` };
    }
    return { success: false, error: 'Unsupported format' };
  });

  ipcMain.handle('mymusicplayer:playlist:importM3U', async (event, m3uContent, playlistName = 'Imported') => {
    try {
      const lines = m3uContent.split('\n');
      let currentPlaylistId = null;

      // Check if playlist already exists by name
      const existing = DatabaseService.getPlaylists().find(p => p.name === playlistName);
      if (existing) {
        currentPlaylistId = existing.id;
        // Remove all songs from this playlist first
        const songs = DatabaseService.getPlaylistSongs(currentPlaylistId);
        for (const song of songs) {
          DatabaseService.removeSongFromPlaylist(currentPlaylistId, song.id);
        }
      }

      // Create new playlist if not exists
      if (!currentPlaylistId) {
        const newPlaylist = DatabaseService.createPlaylist({ name: playlistName });
        currentPlaylistId = newPlaylist.id;
      }

      // Parse M3U and add songs
      let count = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#EXTINF:')) {
          // Next non-empty line contains the file path
          continue;
        } else if (trimmed && !trimmed.startsWith('#')) {
          // This is a file path line - find matching song
          // Search for a song with this exact path
          const matchingSong = DatabaseService.db.prepare('SELECT * FROM songs WHERE file_path = ?').get(trimmed);
          if (matchingSong) {
            DatabaseService.addSongToPlaylist(currentPlaylistId, matchingSong.id);
            count++;
          } else {
            console.warn(`Could not find file: ${trimmed}`);
          }
        }
      }

      return { success: true, playlistId: currentPlaylistId, imported: count, message: 'Playlist imported successfully' };
    } catch (error) {
      console.error('M3U import error:', error);
      return { success: false, error: error.message };
    }
  });
}

function registerFavoriteHandlers(ipcMain) {
  ipcMain.handle('mymusicplayer:favorite:getAll', async (event) => {
    return DatabaseService.getFavorites();
  });

  ipcMain.handle('mymusicplayer:favorite:add', async (event, songId) => {
    return DatabaseService.addFavorite(songId);
  });

  ipcMain.handle('mymusicplayer:favorite:remove', async (event, songId) => {
    return DatabaseService.removeFavorite(songId);
  });

  ipcMain.handle('mymusicplayer:favorite:toggle', async (event, songId) => {
    return DatabaseService.toggleFavorite(songId);
  });
}

function registerPlaybackHandlers(ipcMain) {
  ipcMain.handle('mymusicplayer:playback:getState', async (event) => {
    // State is managed in renderer, this is for persistence
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:play', async (event) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:pause', async (event) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:stop', async (event) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:next', async (event) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:previous', async (event) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:seek', async (event, position) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:setVolume', async (event, volume) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:setShuffle', async (event, enabled) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:setRepeat', async (event, mode) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:setSpeed', async (event, speed) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:setQueue', async (event, queue) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:addToQueue', async (event, song) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:removeFromQueue', async (event, index) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:clearQueue', async (event) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:reorderQueue', async (event, queue) => {
    return { success: true };
  });

  ipcMain.handle('mymusicplayer:playback:shuffleQueue', async (event) => {
    return { success: true };
  });
}

function registerRecentlyPlayedHandlers(ipcMain) {
  ipcMain.handle('mymusicplayer:recentlyPlayed:getAll', async (event, limit = 20) => {
    return DatabaseService.getRecentlyPlayed(limit);
  });

  ipcMain.handle('mymusicplayer:recentlyPlayed:add', async (event, songId, position = 0, completed = 0) => {
    return DatabaseService.addPlayHistory(songId, position, completed);
  });

  ipcMain.handle('mymusicplayer:recentlyPlayed:clear', async (event) => {
    return DatabaseService.clearPlayHistory();
  });
}

function registerDashboardHandlers(ipcMain) {
  ipcMain.handle('mymusicplayer:dashboard:getLayouts', async (event) => {
    return DatabaseService.getDashboardLayouts();
  });

  ipcMain.handle('mymusicplayer:dashboard:saveLayout', async (event, layout) => {
    return DatabaseService.saveDashboardLayout(layout);
  });

  ipcMain.handle('mymusicplayer:dashboard:deleteLayout', async (event, id) => {
    return DatabaseService.deleteDashboardLayout(id);
  });

  ipcMain.handle('mymusicplayer:dashboard:setDefaultLayout', async (event, id) => {
    return DatabaseService.setDefaultDashboardLayout(id);
  });

  ipcMain.handle('mymusicplayer:dashboard:getWidgets', async (event, layoutId) => {
    return DatabaseService.db.prepare('SELECT * FROM dashboard_widgets WHERE layout_id = ? ORDER BY position').all(layoutId);
  });

  ipcMain.handle('mymusicplayer:dashboard:saveWidget', async (event, layoutId, widget) => {
    return DatabaseService.saveDashboardWidget(layoutId, widget);
  });

  ipcMain.handle('mymusicplayer:dashboard:removeWidget', async (event, layoutId, widgetId) => {
    return DatabaseService.removeDashboardWidget(layoutId, widgetId);
  });

  ipcMain.handle('mymusicplayer:dashboard:reorderWidgets', async (event, layoutId, widgets) => {
    return DatabaseService.reorderDashboardWidgets(layoutId, widgets);
  });

  ipcMain.handle('mymusicplayer:dashboard:resetToDefault', async (event) => {
    return DatabaseService.resetDashboardToDefault();
  });

}

// ipcMain.handle('mymusicplayer:smartPlaylist:getSmartPlaylistTypes', async (event) => {
//   return DatabaseService.getSmartPlaylistTypes();
// });

// ipcMain.handle('mymusicplayer:smartPlaylist:getSongs', async (event, smartPlaylistType, limit = 50, params = {}) => {
//   return DatabaseService.getSmartPlaylistSongs(smartPlaylistType, limit);
// });

function registerSmartPlaylistHandlers(ipcMain) {
  ipcMain.handle(
    'mymusicplayer:smartPlaylist:getSmartPlaylistTypes',
    async () => {
      return DatabaseService.getSmartPlaylistTypes();
    }
  );

  ipcMain.handle(
    'mymusicplayer:smartPlaylist:getSongs',
    async (event, smartPlaylistType, limit = 50, params = {}) => {
      return DatabaseService.getSmartPlaylistSongs(smartPlaylistType, limit);
    }
  );
}

function registerSettingsHandlers(ipcMain) {
  ipcMain.handle('mymusicplayer:settings:get', async (event, key) => {
    return DatabaseService.getSetting(key);
  });

  ipcMain.handle('mymusicplayer:settings:set', async (event, key, value) => {
    return DatabaseService.setSetting(key, value);
  });

  ipcMain.handle('mymusicplayer:settings:getAll', async (event) => {
    return DatabaseService.getAllSettings();
  });

  ipcMain.handle('mymusicplayer:settings:reset', async (event) => {
    return DatabaseService.resetSettings();
  });
}

function registerMetadataHandlers(ipcMain) {
  ipcMain.handle('mymusicplayer:metadata:read', async (event, songId) => {
    const song = DatabaseService.getSongById(songId);
    if (!song) {
      throw new Error('Song not found');
    }

    const metadata = {};
    if (song.title) metadata.title = song.title;
    if (song.artist) metadata.artist = song.artist;
    if (song.album) metadata.album = song.album;
    if (song.genre) metadata.genre = song.genre;
    if (song.year) metadata.year = song.year;
    if (song.track_number) metadata.trackNumber = song.track_number;
    if (song.disc_number) metadata.discNumber = song.disc_number;

    return { success: true, metadata };
  });

  ipcMain.handle('mymusicplayer:id3:read', async (event, filePath) => {
    const id3Service = require('../services/id3Service');
    return id3Service.readId3Tags(filePath);
  });

  ipcMain.handle('mymusicplayer:id3:write', async (event, filePath, tags = {}) => {
    const id3Service = require('../services/id3Service');
    const normalizedTags = {
      ...tags,
      track: tags.track ?? tags.trackNumber,
      disk: tags.disk ?? tags.discNumber,
    };
    const success = await id3Service.writeId3Tags(filePath, normalizedTags);
    return { success: Boolean(success), error: success ? null : 'ID3 tag write failed' };
  });

  ipcMain.handle('mymusicplayer:metadata:write', async (event, songId, metadata) => {
    const song = DatabaseService.getSongById(songId);
    if (!song) {
      return { success: false, error: 'Song not found' };
    }

    try {
      // Validate metadata fields
      const allowedFields = [
        'title', 'artist', 'album', 'genre', 'year', 'trackNumber', 'discNumber', 'lyrics'
      ];
      const updates = {};
      for (const [key, value] of Object.entries(metadata)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates[key] = value;
        }
      }

      // Map camelCase to DB column names
      const dbUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        dbUpdates[dbKey] = value;
      }

      // Update database
      DatabaseService.updateSong(songId, dbUpdates);

      // Write ID3 tags to the actual file using node-id3 (MP3 only)
      let fileWriteResult = { success: false, message: 'File-level ID3 writing not supported for this format' };
      try {
        const ID3 = require('node-id3');
        const ext = song.file_path.split('.').pop().toLowerCase();
        if (ext === 'mp3') {
          const id3Tags = {};
          if (updates.title) id3Tags.title = updates.title;
          if (updates.artist) id3Tags.artist = updates.artist;
          if (updates.album) id3Tags.album = updates.album;
          if (updates.genre) id3Tags.genre = updates.genre;
          if (updates.year) id3Tags.year = String(updates.year);
          if (updates.trackNumber) id3Tags.trackNumber = String(updates.trackNumber);
          if (updates.discNumber) id3Tags.discNumber = String(updates.discNumber);

          if (Object.keys(id3Tags).length > 0) {
            const success = ID3.write(id3Tags, song.file_path);
            fileWriteResult = { success, message: success ? 'ID3 tags written to file' : 'Failed to write ID3 tags' };
          }
        }
      } catch (id3Error) {
        console.error('ID3 file write error:', id3Error.message);
        fileWriteResult = { success: false, error: id3Error.message };
      }

      // Store lyrics in database
      const lyricsUpdates = {};
      if (updates.lyrics !== undefined) {
        lyricsUpdates.lyrics = updates.lyrics;
        const dbKey = 'lyrics'.replace(/([A-Z])/g, '_$1').toLowerCase();
        dbUpdates[dbKey] = updates.lyrics;
      }
      if (Object.keys(lyricsUpdates).length > 0) {
        DatabaseService.updateSong(songId, lyricsUpdates);
      }

      return {
        success: true,
        message: 'Metadata updated successfully',
        fileWrite: fileWriteResult,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

function registerDatabaseHandlers(ipcMain) {
  ipcMain.handle('mymusicplayer:database:backup', async (event, backupPath) => {
    return DatabaseService.backupDatabase(backupPath);
  });

  // Export/import library data as JSON
  ipcMain.handle('mymusicplayer:library:export', async () => {
    const data = DatabaseService.exportLibraryData();
    return JSON.stringify(data);
  });

  ipcMain.handle('mymusicplayer:library:import', async (event, data) => {
    const library = JSON.parse(data);
    const result = DatabaseService.importLibraryData(library);
    return result;
  });

  ipcMain.handle('mymusicplayer:database:restore', async (event, backupPath) => {
    try {
      if (!backupPath) {
        return { success: false, error: 'Backup path required' };
      }
      return DatabaseService.restoreDatabase(backupPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mymusicplayer:database:getInfo', async (event) => {
    return DatabaseService.getDatabaseInfo();
  });

  ipcMain.handle('mymusicplayer:database:vacuum', async (event) => {
    return DatabaseService.vacuum();
  });

  ipcMain.handle('mymusicplayer:database:syncNow', async () => {
    const changeQueue = DatabaseService.prepareChangeQueue();
    const pendingChanges = {
      addedSongs: changeQueue.addedSongs,
      modifiedSongs: changeQueue.modifiedSongs,
      deletedSongs: changeQueue.deletedSongs,
      modifiedSettings: changeQueue.modifiedSettings,
      modifiedPlaylists: changeQueue.modifiedPlaylists,
      addedPlaylists: changeQueue.addedPlaylists,
      addedFavorites: changeQueue.addedFavorites,
    };
    // In a real-world offline sync system this would push changes to a remote server
    // For now we simulate success and clear the queue
    DatabaseService.resetChangeQueue();
    return { success: true, syncVersion: '1.0.0', lastSync: Date.now(), pendingChanges };
  });

  ipcMain.handle('mymusicplayer:database:getIndexedDBState', async () => {
    return DatabaseService.getIndexedDBState();
  });

  // Conflict detection and resolution
  ipcMain.handle('mymusicplayer:database:detectConflicts', async () => {
    // Detect conflicts between local database state and incoming changes
    const conflicts = DatabaseService.detectConflicts();
    return { success: true, conflicts };
  });

  ipcMain.handle('mymusicplayer:database:resolveConflict', async (event, conflictId, resolution, data) => {
    // resolution: 'local_wins' | 'remote_wins' | 'merge'
    // data: merged data for manual merge
    const result = DatabaseService.resolveConflict(conflictId, resolution, data);
    if (result.success) {
      // Clear resolved conflict from queue
      DatabaseService.clearResolvedConflict(conflictId);
    }
    return result;
  });
}

function registerWindowHandlers(ipcMain) {
  let miniPlayerWindow = null;

  const createMiniPlayerWindow = async () => {
    const { BrowserWindow, app } = require('electron');
    const path = require('path');

    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
      miniPlayerWindow.focus();
      return { success: true, message: 'Mini player already open' };
    }

    miniPlayerWindow = new BrowserWindow({
      width: 400,
      height: 200,
      minWidth: 350,
      minHeight: 150,
      show: false,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
      title: 'MyMusicPlayer Mini',
    });

    if (!app.isPackaged) {
      await miniPlayerWindow.loadURL('http://localhost:5174/mini-player');
    } else {
      await miniPlayerWindow.loadFile(path.join(__dirname, '../../dist/index.html'), { hash: '/mini-player' });
    }

    miniPlayerWindow.once('ready-to-show', () => {
      if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
        miniPlayerWindow.show();
        miniPlayerWindow.focus();
      }
    });
    miniPlayerWindow.on('closed', () => { miniPlayerWindow = null; });
    return { success: true, message: 'Mini player created' };
  };

  ipcMain.handle('mymusicplayer:window:miniPlayer:create', createMiniPlayerWindow);
  ipcMain.handle('mymusicplayer:window:miniPlayer:close', async () => {
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) miniPlayerWindow.close();
    miniPlayerWindow = null;
    return { success: true };
  });
  ipcMain.handle('mymusicplayer:window:miniPlayer:toggle', async () => {
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
      miniPlayerWindow.close();
      miniPlayerWindow = null;
      return { success: true, action: 'closed' };
    }
    const result = await createMiniPlayerWindow();
    return { ...result, action: 'opened' };
  });
  ipcMain.handle('mymusicplayer:window:miniPlayer:isOpen', async () => ({
    success: true,
    isOpen: Boolean(miniPlayerWindow && !miniPlayerWindow.isDestroyed()),
  }));
  ipcMain.handle('mymusicplayer:window:miniPlayer:setAlwaysOnTop', async (event, enabled) => {
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
      miniPlayerWindow.setAlwaysOnTop(Boolean(enabled));
      return { success: true };
    }
    return { success: false, error: 'Mini player not open' };
  });
}

module.exports = {
  registerFileHandlers,
  registerMetadataHandlers,
  registerMusicHandlers,
  registerPlaylistHandlers,
  registerFavoriteHandlers,
  registerPlaybackHandlers,
  registerRecentlyPlayedHandlers,
  registerDashboardHandlers,
  registerSettingsHandlers,
  registerDatabaseHandlers,
  registerWindowHandlers,
  registerSmartPlaylistHandlers,
};
