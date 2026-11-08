import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore, usePlayerStore } from '@store/store';
import Card from '@components/common/Card';
import Badge from '@components/common/Badge';
import EmptyState from '@components/common/EmptyState';
import Input from '@components/common/Input';
import { Music, Search, List, Grid, Heart } from 'lucide-react';
import { refreshLibraryData } from '@utils/library';
import toast from 'react-hot-toast';
import { mediaUrl } from '@utils/media';
import { VirtualizedSongList, VirtualizedSongGrid } from '@components/library/VirtualizedSongList';

export default function Songs() {
  const navigate = useNavigate();
  const { songs, favorites = [], sortBy, sortOrder, viewMode, setSortBy, setSortOrder, setViewMode, setSearchQuery, searchQuery } = useLibraryStore();
  const [activeView, setActiveView] = useState(viewMode || 'grid');

  const playSong = (song) => {
    const player = usePlayerStore.getState();
    const index = sortedSongs.findIndex((item) => item.id === song.id);
    player.setQueue(sortedSongs);
    player.setCurrentTrack(song, index);
    player.setIsPlaying(true);
  };

  useEffect(() => {
    setActiveView(viewMode || 'grid');
  }, [viewMode]);

  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      if (typeof aVal === 'string') {
        return sortOrder === 'ASC' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'ASC' ? aVal - bVal : bVal - aVal;
    }).filter((song) => {
      const query = searchQuery.trim().toLocaleLowerCase();
      return !query || [song.title, song.artist, song.album, song.genre].some((value) => String(value || '').toLocaleLowerCase().includes(query));
    });
  }, [songs, sortBy, sortOrder, searchQuery]);

  const toggleFavorite = async (song) => {
    try {
      await window.electronAPI.invoke('mymusicplayer:favorite:toggle', song.id);
      await refreshLibraryData();
    } catch (error) {
      toast.error(`Could not update favorite: ${error.message}`);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Use virtualized list for large libraries (>100 songs)
  const useVirtualization = sortedSongs.length > 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2 sm:text-3xl">All Songs</h2>
          <p className="text-text-secondary">{songs.length} tracks in your library {useVirtualization && <span className="text-accent">(virtualized)</span>}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-1 gap-2">
          <Search className="w-4 h-4 ml-2 text-text-secondary self-center" />
          <Input
            placeholder="Search songs, artists, albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <ButtonSort sortBy={sortBy} sortOrder={sortOrder} onSortBy={setSortBy} onOrderChange={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')} />
          <ViewToggle active={activeView} onToggle={(view) => {
            setActiveView(view);
            setViewMode(view);
          }} />
        </div>
      </div>

      {/* Songs List */}
      {sortedSongs.length === 0 ? (
        <EmptyState
          icon={Music}
          title="No songs found"
          subtitle="Import music files to get started"
          action={
            <button onClick={() => navigate('/import')} className="btn btn-primary">
              Import Music
            </button>
          }
        />
      ) : activeView === 'grid' ? (
        <VirtualizedSongGrid
          songs={sortedSongs}
          favorites={favorites}
          onPlay={playSong}
          onToggleFavorite={toggleFavorite}
          formatDuration={formatDuration}
        />
      ) : (
        <div className="h-[calc(100vh-300px)] min-h-[400px]">
          <VirtualizedSongList
            songs={sortedSongs}
            favorites={favorites}
            onPlay={playSong}
            onToggleFavorite={toggleFavorite}
            formatDuration={formatDuration}
          />
        </div>
      )}
    </div>
  );
}

function ButtonSort({ sortBy, sortOrder, onSortBy, onOrderChange }) {
  const options = [
    { label: 'Title', value: 'title' },
    { label: 'Artist', value: 'artist' },
    { label: 'Album', value: 'album' },
    { label: 'Duration', value: 'duration' },
    { label: 'Date Added', value: 'date_added' },
  ];

  return (
    <div className="flex items-center gap-2">
      <select aria-label="Sort songs by" className="btn btn-secondary px-3 py-1.5 text-xs" value={sortBy} onChange={(event) => onSortBy(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button className="btn btn-secondary px-3 py-1.5 text-xs" onClick={onOrderChange} aria-label={`Sort ${sortOrder === 'ASC' ? 'descending' : 'ascending'}`}>
        {sortOrder === 'ASC' ? 'Ascending' : 'Descending'}
      </button>
    </div>
  );
}

function ViewToggle({ active, onToggle }) {
  return (
    <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1 border border-border-default">
      <button
        onClick={() => onToggle('grid')}
        className={`w-10 h-8 rounded-md flex items-center justify-center ${active === 'grid' ? 'bg-accent text-accent-foreground' : 'text-text-secondary hover:text-text-primary'}`}
        aria-label="Grid view"
      >
        <Grid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onToggle('list')}
        className={`w-10 h-8 rounded-md flex items-center justify-center ${active === 'list' ? 'bg-accent text-accent-foreground' : 'text-text-secondary hover:text-text-primary'}`}
        aria-label="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
