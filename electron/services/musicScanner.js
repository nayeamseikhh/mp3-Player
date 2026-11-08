const DatabaseService = require('../database/connection').DatabaseService;
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const metadataService = require('./metadataService');
const fileService = require('./fileService');

// Resolve the userData path and artwork directory
function getPaths() {
  const userDataPath = app.getPath('userData');
  const artworkDir = path.join(userDataPath, 'artwork');
  return { userDataPath, artworkDir };
}

function sqliteText(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(sqliteText).filter(Boolean).join(', ') || null;
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    if (value.text !== undefined) return sqliteText(value.text);
    if (value.no !== undefined) return sqliteText(value.no);
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

function sqliteNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const candidate = typeof value === 'object' ? (value.no ?? value.value) : value;
  const number = Number(candidate);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * Scan a folder (or array of paths) for audio files, extract metadata,
 * and insert into the database with duplicate detection.
 *
 * Returns: { imported, skipped, errors, duplicates }
 */
async function scanAndImport(inputPaths, options = {}) {
  const {
    duplicateHandling = 'skip', // 'skip' | 'replace' | 'keepBoth'
    recursive = true,
    onProgress,
  } = options;

  if (!Array.isArray(inputPaths)) inputPaths = [inputPaths];

  // Use the already-initialized DatabaseService singleton from the main process
  const db = DatabaseService.db;
  if (!db) {
    console.error('Database not initialized, cannot scan');
    return { imported: 0, skipped: 0, errors: 0, duplicates: 0 };
  }

  const results = { imported: 0, skipped: 0, errors: 0, duplicates: 0 };

  // Collect all audio files across all input paths
  const allAudioFiles = [];
  for (const p of inputPaths) {
    const found = await fileService.findAudioFiles(p, { recursive });
    for (const f of found) {
      allAudioFiles.push(f);
    }
  }

  // Deduplicate by file path within this batch
  const seenPaths = new Set();
  const uniqueFiles = [];
  for (const f of allAudioFiles) {
    if (seenPaths.has(f.path)) continue;
    seenPaths.add(f.path);
    uniqueFiles.push(f);
  }

  // Process each unique file
  for (let i = 0; i < uniqueFiles.length; i++) {
    const audioFile = uniqueFiles[i];
    const reportProgress = () => {
      try { onProgress?.(i + 1, uniqueFiles.length, audioFile.path); } catch {}
    };
    try {
      // Check if file already in library
      const existing = db.prepare('SELECT id FROM songs WHERE file_path = ?').get(audioFile.path);

      if (existing) {
        results.duplicates++;
        db.prepare('UPDATE songs SET is_available = 1 WHERE id = ?').run(existing.id);
        if (duplicateHandling === 'replace') {
          // Replace existing entry metadata
          const meta = await metadataService.extractMetadata(audioFile.path);
          if (meta && meta.title !== undefined) {
            db.prepare('UPDATE songs SET title=?, artist=?, album=?, album_artist=?, genre=?, duration=?, track_number=?, disc_number=?, year=?, bitrate=?, sample_rate=?, file_size=?, format=?, artwork_path=?, updated_at=? WHERE id=?')
              .run(
                sqliteText(meta.title), sqliteText(meta.artist), sqliteText(meta.album), sqliteText(meta.albumArtist), sqliteText(meta.genre),
                sqliteNumber(meta.duration, 0), sqliteNumber(meta.trackNumber), sqliteNumber(meta.discNumber), sqliteNumber(meta.year),
                sqliteNumber(meta.bitrate), sqliteNumber(meta.sampleRate), sqliteNumber(meta.fileSize, 0), sqliteText(meta.format),
                sqliteText(meta.artworkPath), Date.now(), existing.id
              );
            results.imported++;
          }
        } else {
          results.skipped++;
        }
        reportProgress();
        continue;
      }

      // Extract metadata
      const metadata = await metadataService.extractMetadata(audioFile.path);
      if (!metadata) {
        results.errors++;
        reportProgress();
        continue;
      }

      // Insert into database
      const stmt = db.prepare(`
        INSERT INTO songs
        (file_path, title, artist, album, album_artist, genre, duration, track_number, disc_number, year, bitrate, sample_rate, file_size, format, artwork_path, is_available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        String(audioFile.path),
        sqliteText(metadata.title) || path.parse(audioFile.path).name,
        sqliteText(metadata.artist),
        sqliteText(metadata.album),
        sqliteText(metadata.albumArtist),
        sqliteText(metadata.genre),
        sqliteNumber(metadata.duration, 0),
        sqliteNumber(metadata.trackNumber),
        sqliteNumber(metadata.discNumber),
        sqliteNumber(metadata.year),
        sqliteNumber(metadata.bitrate),
        sqliteNumber(metadata.sampleRate),
        sqliteNumber(metadata.fileSize, 0),
        sqliteText(metadata.format) || 'UNKNOWN',
        sqliteText(metadata.artworkPath),
        1
      );

      results.imported++;
    } catch (error) {
      console.error(`Failed to import ${audioFile.path}:`, error);
      results.errors++;
    }

    reportProgress();
  }

  return results;
}

/**
 * Scan a single audio file and add it to the library.
 */
async function importSingleFile(filePath) {
  try {
    const result = await scanAndImport([filePath], { duplicateHandling: 'skip', onProgress: () => {} });
    return result;
  } catch (error) {
    console.error('Failed to import single file:', error);
    return { imported: 0, skipped: 0, errors: 1, duplicates: 0 };
  }
}

/**
 * Rescan a folder: mark all as unavailable, then re-import new/changed files.
 */
async function rescanLibrary(folderPath) {
  const db = DatabaseService.db;
  if (!db) return { success: false, message: 'Database is not initialized.' };

  const missing = checkMissingFiles();
  const imported = folderPath
    ? await scanAndImport(folderPath, { duplicateHandling: 'skip' })
    : { imported: 0, skipped: 0, duplicates: 0, errors: 0 };
  return { success: true, missing: missing.length, ...imported };
}

/**
 * Check which stored files are no longer accessible.
 */
function checkMissingFiles() {
  const db = DatabaseService.db;
  if (!db) return [];

  const songs = db.prepare('SELECT id, file_path FROM songs WHERE is_available = 1').all();
  const missing = [];

  for (const song of songs) {
    if (!fs.existsSync(song.file_path)) {
      missing.push(song.id);
    }
  }

  if (missing.length > 0) {
    const placeholders = missing.map(() => '?').join(', ');
    db.prepare(`UPDATE songs SET is_available = 0 WHERE id IN (${placeholders})`).run(...missing);
    console.log(`Marked ${missing.length} files as unavailable`);
  }

  return missing;
}

module.exports = {
  scanAndImport,
  importSingleFile,
  rescanLibrary,
  checkMissingFiles,
};
