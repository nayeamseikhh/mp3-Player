import { useLibraryStore, usePlayerStore } from '@store/store';
import { usePlayer } from '@context/PlayerContext';
import Card from '@components/common/Card';
import { Music, PlusCircle, Heart, TrendingUp } from 'lucide-react';

export default function RecentlyAddedWidget({ config = {} }) {
  const { songs = [], favorites = [], recentlyPlayed = [] } = useLibraryStore();
  const { currentTrack, isPlaying, setIsPlaying } = usePlayerStore();
  const { playTrack } = usePlayer() || {};
  const limit = config?.limit || 5;

  const quickPlay = (song) => {
    if (!song) return;
    const player = usePlayerStore.getState();
    if (currentTrack?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      const index = player.queue.findIndex((t) => t.id === song.id);
      if (index >= 0) {
        player.setCurrentTrack(song, index);
      } else {
        player.setQueue([song]);
        player.setCurrentTrack(song, 0);
      }
      player.setIsPlaying(true);
    }
  };

  // Get recently imported - songs sorted by what would be newest
  const songsList = songs.reverse().slice(0, limit);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-accent" />
          Recently Added
        </h3>
      </div>
      {songsList.length > 0 ? (
        <div className="space-y-2">
          {songsList.map((song) => (
            <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/5 cursor-pointer" onClick={() => quickPlay(song)}>
              <div className="w-10 h-10 bg-bg-tertiary rounded-lg overflow-hidden flex-shrink-0">
                {song.artwork_path ? (
                  <img src={mediaUrl(song.artwork_path)} alt={song.title} className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-5 h-5 text-text-secondary m-auto" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{song.title}</p>
                <p className="text-xs text-text-secondary truncate">{song.artist}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary text-sm">No recently added tracks yet</p>
      )}
    </Card>
  );
}