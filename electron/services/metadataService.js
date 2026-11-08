const fs = require('fs');
const path = require('path');

async function extractMetadata(filePath) {
  try {
    // Get file stats first
    const stats = fs.statSync(filePath);

    // Use music-metadata to parse audio file
    const { parseFile } = await import('music-metadata');
    const metadata = await parseFile(filePath, {
      duration: true,
      size: false,
      tags: ['id3v2.3', 'id3v2.4', 'id3v1', 'mp4', 'ogg', 'flac', 'aiff'],
    });

    // Extract artwork if present
    let artworkPath = null;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      if (picture.format && picture.data) {
        // Save artwork as file in the app data directory
        const appDataPath = path.join(require('electron').app.getPath('userData'), 'artwork');
        if (!fs.existsSync(appDataPath)) {
          fs.mkdirSync(appDataPath, { recursive: true });
        }

        const artworkFilePath = path.join(appDataPath, `${path.basename(filePath, path.extname(filePath))}.jpg`);
        fs.writeFileSync(artworkFilePath, picture.data);
        artworkPath = artworkFilePath;
      }
    }

    return {
      title: metadata.common.title || path.parse(filePath).name,
      artist: metadata.common.artist || null,
      album: metadata.common.album || null,
      albumArtist: metadata.common.albumartist || null,
      genre: metadata.common.genre || null,
      duration: metadata.format.duration || 0,
      trackNumber: metadata.common.track || null,
      discNumber: metadata.common.disk || null,
      year: metadata.common.year || metadata.common.originalDate || null,
      bitrate: metadata.format.bitrate || null,
      sampleRate: metadata.format.sampleRate || null,
      format: metadata.format.container || path.extname(filePath).slice(1).toUpperCase(),
      fileSize: stats.size,
      artworkPath,
      hasArtwork: !!(metadata.common.picture && metadata.common.picture.length > 0),
    };
  } catch (error) {
    console.error(`Failed to extract metadata from ${filePath}:`, error.message);
    return null;
  }
}

async function scanAudioFiles(dirPath, options = {}) {
  const { supportedOnly = true, onProgress } = options;
  const fileService = require('./fileService');
  const audioFiles = await fileService.findAudioFiles(dirPath, { recursive: true });

  const scannedFiles = [];
  const errors = [];
  let scannedCount = 0;

  for (const audioFile of audioFiles) {
    try {
      const metadata = await extractMetadata(audioFile.path);

      if (metadata) {
        scannedFiles.push({
          filePath: audioFile.path,
          fileName: audioFile.name,
          ...metadata,
        });
      } else {
        errors.push(`Failed to extract metadata from ${audioFile.path}`);
      }

      scannedCount++;
      if (onProgress) onProgress(scannedCount, audioFiles.length);
      if (scannedCount % 10 === 0) {
        console.log(`Scanned ${scannedCount} files...`);
      }
    } catch (error) {
      console.error(`Failed to process ${audioFile.path}:`, error);
      errors.push(error.message);
    }
  }

  return {
    totalFiles: audioFiles.length,
    scannedFiles,
    errors,
  };
}

async function batchExtractMetadata(filePaths, onProgress) {
  const results = [];

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    try {
      const metadata = await extractMetadata(filePath);
      results.push(metadata);
      if (onProgress) onProgress(i + 1, filePaths.length);
    } catch (error) {
      results.push(null);
      console.error(`Failed to extract metadata from ${filePath}:`, error);
    }
  }

  return results;
}

function getArtworkCacheInfo(filePath) {
  const appDataPath = path.join(require('electron').app.getPath('userData'), 'artwork');
  const artworkPath = path.join(appDataPath, `${path.basename(filePath, path.extname(filePath))}.jpg`);

  try {
    const stats = fs.statSync(artworkPath);
    return {
      path: artworkPath,
      size: stats.size,
      modifiedAt: stats.mtimeMs,
      exists: true,
    };
  } catch {
    return { exists: false };
  }
}

function cleanupOldArtwork(maxAgeDays = 30) {
  try {
    const appDataPath = path.join(require('electron').app.getPath('userData'), 'artwork');
    if (!fs.existsSync(appDataPath)) {
      return { cleaned: false, files: 0 };
    }

    const files = fs.readdirSync(appDataPath);
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const file of files) {
      const filePath = path.join(appDataPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch (err) {
        // File might have been deleted
      }
    }

    return { cleaned, files: files.length };
  } catch (error) {
    return { error: error.message, cleaned: false, files: 0 };
  }
}

module.exports = {
  extractMetadata,
  scanAudioFiles,
  batchExtractMetadata,
  getArtworkCacheInfo,
  cleanupOldArtwork,
};
