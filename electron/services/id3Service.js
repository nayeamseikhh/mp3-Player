const fs = require('fs');
const path = require('path');
const NodeID3 = require('node-id3');

/**
 * ID3 v2 tag writer
 * Writes tags directly into the audio file's ID3 header so the edit persists
 * even when the DB row is later replaced by a fresh scan.
 */
async function writeId3Tags(filePath, tags) {
  try {
    const { parseFile } = await import('music-metadata');
    const metadata = await parseFile(filePath, { duration: true, size: false });
    const oldTags = metadata.common;

    // Flatten into a node-id3 friendly format
    const payload = {
      ...oldTags,
      title: tags.title ?? (oldTags.title || null),
      artist: tags.artist ?? (oldTags.artist || null),
      album: tags.album ?? (oldTags.album || null),
      albumartist: tags.albumartist ?? (oldTags.albumartist || null),
      genre: tags.genre ?? (oldTags.genre || null),
      picture: tags.picture ? tags.picture : oldTags.picture ? [oldTags.picture[0]] : undefined,
      track: tags.track != null ? tags.track : oldTags.track ?? null,
      disk: tags.disk != null ? tags.disk : oldTags.disk ?? null,
      year: tags.year ? String(tags.year) : (oldTags.year ? String(oldTags.year) : null),
      composer: tags.composer ?? oldTags.composer ?? null,
      lyrics: tags.lyrics ?? null,
      comment: tags.comment ?? (oldTags.comment || null),
      extra: Object.fromEntries(Object.entries({
        ...oldTags,
        ...(tags.extra || {}),
      }).filter(([, v]) => v !== undefined && v !== null)),
    };

    // Filter out fields node-id3 can't write back cleanly
    const stripped = { ...payload };
    delete stripped.duration;
    delete stripped.bitrate;
    delete stripped.sampleRate;
    delete stripped.container;
    delete stripped.filesize;

    const result = NodeID3.write(stripped, filePath);
    return result === true;
  } catch (error) {
    console.error(`Failed to write ID3 tags to ${filePath}:`, error.message);
    throw new Error(`Failed to write ID3 tags: ${error.message}`);
  }
}

/**
 * Read raw ID3 tags from audio file
 */
async function readId3Tags(filePath) {
  try {
    const { parseFile } = await import('music-metadata');
    const metadata = await parseFile(filePath, { duration: true, size: false });
    return {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      albumartist: metadata.common.albumartist,
      genre: metadata.common.genre,
      composer: metadata.common.composer,
      track: metadata.common.track,
      disk: metadata.common.disk,
      year: metadata.common.year,
      lyrics: metadata.common.lyrics,
      comment: metadata.common.comment,
      picture: metadata.common.picture ? [metadata.common.picture[0]] : undefined,
      extra: metadata.common.extra,
      format: metadata.format.container,
      bitrate: metadata.format.bitrate,
      sampleRate: metadata.format.sampleRate,
    };
  } catch (error) {
    console.error(`Failed to read ID3 tags from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Get absolute file path for a song by scanning the default music folder
 * or looking up an existing scanned record.
 */
function findSongFilePath(songs, songId) {
  const song = songs.find((s) => s.id === songId);
  if (!song) return null;
  // songs store relative paths under the 'path' column in many cases, or just filenames
  if (song._path) return song._path;
  if (song.path) return song.path;
  if (song.file_path) return song.file_path;
  return null;
}

module.exports = {
  writeId3Tags,
  readId3Tags,
  findSongFilePath,
};
