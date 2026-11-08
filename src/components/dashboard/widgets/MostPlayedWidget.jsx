import { useLibraryStore, usePlayerStore } from '@store/store';
import { usePlayer } from '@context/PlayerContext';
import Card from '@components/common/Card';
import { Music, TrendingUp, Heart, PlayCircle } from 'lucide-react';
import { mediaUrl } from '@utils/media';

export default function MostPlayedWidget({ config = {} }) {
  const { songs = [] } = useLibraryStore();
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

  const mostPlayed = [...songs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, limit);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Most Played
        </h3>
      </div>
      {mostPlayed.length > 0 ? (
        <div className="space-y-2">
          {mostPlayed.map((song) => (
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
              <Badge variant="accent">{song.play_count || 0}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary text-sm">No playback data yet</p>
      )}
    </Card>
  );
}