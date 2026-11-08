import { useLibraryStore } from '@store/store';
import Card from '@components/common/Card';
import EmptyState from '@components/common/EmptyState';
import { Music, Heart, HeartOff } from 'lucide-react';
import { playTrackList } from '@utils/playback';
import { refreshLibraryData } from '@utils/library';
import { mediaUrl } from '@utils/media';

export default function Favorites() {
  const { favorites = [] } = useLibraryStore();

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-text-primary mb-6 sm:mb-8 sm:text-3xl">Favorites</h2>

      {favorites?.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          subtitle="Add songs to your favorites by clicking the heart icon"
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites.map((song, idx) => (
            <Card key={song.id} className="group relative cursor-pointer" onClick={() => playTrackList(favorites, song)}>
              <div className="aspect-square bg-bg-primary rounded-lg overflow-hidden mb-3">
                {song.artwork_path ? (
                  <img src={mediaUrl(song.artwork_path)} alt={song.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-accent/10 flex items-center justify-center">
                    <Music className="w-8 h-8 text-text-secondary" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${song.title} from favorites`}
                  title="Remove from favorites"
                  className="absolute right-3 top-3 rounded-full bg-bg-primary/90 p-2 text-red-400 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  onClick={async (event) => {
                    event.stopPropagation();
                    await window.electronAPI?.invoke?.('mymusicplayer:favorite:remove', song.id);
                    await refreshLibraryData();
                  }}
                >
                  <HeartOff className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium text-text-primary truncate">{song.title}</p>
                <p className="text-sm text-text-secondary truncate">{song.artist}</p>
                <p className="text-xs text-text-secondary">{song.album || 'Unknown Album'}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
