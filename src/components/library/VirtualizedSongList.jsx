/**
 * Virtualized song list for large library performance.
 * Uses react-virtualized's List to only render visible rows.
 */
import React from 'react';
import { List } from 'react-virtualized';
import { Heart, Music } from 'lucide-react';
import { mediaUrl } from '@utils/media';

const ROW_HEIGHT = 64;

export function VirtualizedSongList({
  songs,
  favorites,
  onPlay,
  onToggleFavorite,
  formatDuration,
}) {
  if (!songs || songs.length === 0) return null;

  const rowRenderer = ({ index, key, style }) => {
    const song = songs[index];
    const isFavorite = favorites.some((f) => f.id === song.id);

    return (
      <div
        key={key}
        style={style}
        className="flex items-center gap-4 px-4 py-3 hover:bg-accent/5 rounded-xl cursor-pointer border-b border-border-default transition-colors"
        onClick={() => onPlay(song)}
      >
        <div className="w-8 h-8 bg-accent/20 text-accent rounded-full flex items-center justify-center shrink-0 text-xs font-bold">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <p className="font-medium text-text-primary truncate">{song.title}</p>
          <p className="text-sm text-text-secondary truncate">
            {song.artist} • {song.album || 'Unknown Album'}
          </p>
        </div>

        <div className="w-32 text-right flex flex-col justify-center">
          <p className="text-sm text-text-primary">{song.format || 'MP3'}</p>
          <p className="text-xs text-text-secondary">{formatDuration(song.duration)}</p>
        </div>

        <div className="text-xs text-text-secondary">{new Date(song.date_added || Date.now()).toLocaleDateString()}</div>

        <button
          type="button"
          aria-label={isFavorite ? `Remove ${song.title} from favorites` : `Add ${song.title} to favorites`}
          className={isFavorite ? 'text-red-400' : 'text-text-secondary hover:text-red-400 transition-colors p-2'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(song);
          }}
        >
          <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <List
        height={ROW_HEIGHT * Math.min(songs.length, 50)}
        width="100%"
        rowCount={songs.length}
        rowHeight={ROW_HEIGHT}
        rowRenderer={rowRenderer}
      />
    </div>
  );
}

/**
 * Virtualized grid view for album artwork.
 */
export function VirtualizedSongGrid({
  songs,
  favorites,
  onPlay,
  onToggleFavorite,
  formatDuration,
}) {
  if (!songs || songs.length === 0) return null;

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {songs.map((song, idx) => (
        <div key={song.id} className="group relative cursor-pointer" onClick={() => onPlay(song)}>
          <div className="aspect-square bg-bg-primary rounded-lg overflow-hidden mb-3 relative">
            {song.artwork_path ? (
              <img src={mediaUrl(song.artwork_path)} alt={song.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-accent/10 flex items-center justify-center">
                <Music className="w-10 h-10 text-text-secondary" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg">
                <Music className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label={favorites.some((favorite) => favorite.id === song.id) ? `Remove ${song.title} from favorites` : `Add ${song.title} to favorites`}
            className={`absolute right-3 top-3 rounded-full bg-bg-primary/90 p-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${favorites.some((favorite) => favorite.id === song.id) ? 'text-red-400' : 'text-text-secondary'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(song);
            }}
          >
            <Heart className="h-4 w-4" fill={favorites.some((favorite) => favorite.id === song.id) ? 'currentColor' : 'none'} />
          </button>
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-accent/20 text-accent rounded-lg flex items-center justify-center shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary truncate line-clamp-1">{song.title}</p>
              <p className="text-sm text-text-secondary truncate line-clamp-1">{song.artist}</p>
              <p className="text-xs text-text-secondary truncate line-clamp-1">{song.album || 'Unknown Album'}</p>
            </div>
            <div className="text-xs text-text-secondary">{formatDuration(song.duration)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
