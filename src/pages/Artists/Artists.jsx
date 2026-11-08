import { useLibraryStore } from '@store/store';
import Card from '@components/common/Card';
import EmptyState from '@components/common/EmptyState';
import { User } from 'lucide-react';
import { playTrackList } from '@utils/playback';

export default function Artists() {
  const { artists = [], songs = [] } = useLibraryStore();

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-text-primary mb-6 sm:mb-8 sm:text-3xl">Artists</h2>

      {artists.length === 0 ? (
        <EmptyState
          icon={User}
          title="No artists found"
          subtitle="Import music to see your artist collection"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artists.map((artist, idx) => (
            <Card key={artist.artist} className="cursor-pointer" onClick={() => playTrackList(songs.filter((song) => song.artist === artist.artist))}>
              <div className="flex flex-col items-center text-center gap-3 p-6">
                <div className="w-24 h-24 bg-gradient-to-br from-accent/30 to-accent-secondary/30 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-text-primary truncate">{artist.artist}</p>
                  <p className="text-sm text-text-secondary">{artist.count || 0} songs</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
