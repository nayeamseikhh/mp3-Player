const fs = require('fs');
const path = require('path');

const SUPPORTED_FORMATS = [
  'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'aiff', 'alac', 'opus', 'wma'
];

const AUDIO_MIME_TYPES = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  aiff: 'audio/aiff',
  alac: 'audio/mp4',
  opus: 'audio/opus',
  wma: 'audio/x-ms-wma',
};

function isSupportedFormat(filename) {
  const ext = path.extname(filename).toLowerCase().slice(1);
  return SUPPORTED_FORMATS.includes(ext);
}

function getFormatFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  return SUPPORTED_FORMATS.includes(ext) ? ext : null;
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  return AUDIO_MIME_TYPES[ext] || 'application/octet-stream';
}

function getFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtimeMs,
      modifiedAt: stats.mtimeMs,
    };
  } catch (error) {
    return null;
  }
}

async function scanDirectory(dirPath, options = {}) {
  const { recursive = true, onProgress, onFile, supportedOnly = true } = options;

  const results = {
    files: [],
    errors: [],
    totalScanned: 0,
  };

  function scan(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        results.totalScanned++;

        if (entry.isDirectory()) {
          if (recursive) {
            scan(fullPath);
          }
        } else if (entry.isFile()) {
          if (!supportedOnly || isSupportedFormat(entry.name)) {
            results.files.push(fullPath);
            if (onFile) onFile(fullPath);
          }
        }
      }
    } catch (error) {
      results.errors.push({ path: dir, error: error.message });
    }
  }

  scan(dirPath);
  return results;
}

async function findAudioFiles(dirPath, options = {}) {
  const { recursive = true, maxDepth = 10 } = options;

  const audioFiles = [];

  // Import can receive either a folder to scan or individual file paths from
  // the file picker. Handle files directly instead of trying to readdir them.
  try {
    const stats = fs.statSync(dirPath);
    if (stats.isFile()) {
      if (isSupportedFormat(dirPath)) {
        audioFiles.push({
          path: dirPath,
          name: path.basename(dirPath),
          format: getFormatFromPath(dirPath),
          stats: getFileStats(dirPath),
        });
      }
      return audioFiles;
    }
  } catch (error) {
    console.error(`Cannot access import path ${dirPath}:`, error.message);
    return audioFiles;
  }

  function scan(dir, depth = 0) {
    if (depth > maxDepth) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (recursive) {
            scan(fullPath, depth + 1);
          }
        } else if (entry.isFile() && isSupportedFormat(entry.name)) {
          audioFiles.push({
            path: fullPath,
            name: entry.name,
            format: getFormatFromPath(fullPath),
            stats: getFileStats(fullPath),
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning ${dir}:`, error);
    }
  }

  scan(dirPath);
  return audioFiles;
}

function validateFileAccess(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return { accessible: true };
  } catch (error) {
    return { accessible: false, error: error.message };
  }
}

function sanitizePath(filePath) {
  return path.normalize(filePath).replace(/\\/g, '/');
}

function getRelativePath(filePath, basePath) {
  try {
    return path.relative(basePath, filePath).replace(/\\/g, '/');
  } catch {
    return filePath;
  }
}

function isFileModified(filePath, lastKnownMtime) {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtimeMs > lastKnownMtime;
  } catch {
    return false;
  }
}

module.exports = {
  SUPPORTED_FORMATS,
  AUDIO_MIME_TYPES,
  isSupportedFormat,
  getFormatFromPath,
  getMimeType,
  getFileStats,
  scanDirectory,
  findAudioFiles,
  validateFileAccess,
  sanitizePath,
  getRelativePath,
  isFileModified,
};
