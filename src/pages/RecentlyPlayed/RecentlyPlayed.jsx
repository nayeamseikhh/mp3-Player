import { useEffect } from 'react';
import { useLibraryStore, usePlayerStore } from '@store/store';
import Card from '@components/common/Card';
import EmptyState from '@components/common/EmptyState';
import { Music, Clock } from 'lucide-react';
import { mediaUrl } from '@utils/media';
import Button from '@components/common/Button';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RecentlyPlayed() {
  const { recentlyPlayed = [] } = useLibraryStore();

  useEffect(() => {
    window.electronAPI?.invoke?.('mymusicplayer:recentlyPlayed:getAll')
      .then((tracks) => {
        if (Array.isArray(tracks)) useLibraryStore.getState().setRecentlyPlayed(tracks);
      })
      .catch((error) => console.error('Could not load playback history:', error));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">Recently Played</h2>
        {recentlyPlayed.length > 0 && <Button variant="ghost" onClick={async () => {
          try {
            await window.electronAPI.invoke('mymusicplayer:recentlyPlayed:clear');
            useLibraryStore.getState().setRecentlyPlayed([]);
            toast.success('Playback history cleared');
          } catch (error) { toast.error(`Could not clear history: ${error.message}`); }
        }} icon={<Trash2 className="h-4 w-4" />}>Clear History</Button>}
      </div>

      {recentlyPlayed?.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No playback history"
          subtitle="Play some music to see your recently played tracks"
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recentlyPlayed.map((song) => (
              <Card
                key={song.id}
                className="cursor-pointer"
                onClick={() => {
                  const player = usePlayerStore.getState();
                  const index = recentlyPlayed.findIndex((track) => track.id === song.id);
                  player.setQueue(recentlyPlayed);
                  player.setCurrentTrack(song, index);
                  player.setIsPlaying(true);
                }}
              >
              <div className="aspect-square bg-bg-primary rounded-lg overflow-hidden mb-3">
                {song.artwork_path ? (
                  <img src={mediaUrl(song.artwork_path)} alt={song.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-accent/10 flex items-center justify-center">
                    <Music className="w-8 h-8 text-text-secondary" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium text-text-primary truncate">{song.title}</p>
                <p className="text-sm text-text-secondary truncate">{song.artist}</p>
                <p className="text-xs text-text-secondary">{song.played_at ? new Date(song.played_at).toLocaleDateString() : ''}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
