import { useLibraryStore } from '@store/store';
import Card from '@components/common/Card';
import EmptyState from '@components/common/EmptyState';
import { Palette } from 'lucide-react';
import { playTrackList } from '@utils/playback';

export default function Genres() {
  const { genres = [], songs = [] } = useLibraryStore();

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-text-primary mb-6 sm:mb-8 sm:text-3xl">Genres</h2>

      {genres.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="No genres found"
          subtitle="Import music to see genre distribution"
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          {genres.map((genre) => (
            <Card key={genre.genre} className="cursor-pointer" onClick={() => playTrackList(songs.filter((song) => String(song.genre || '').split(/[;,/]/).map((value) => value.trim()).includes(genre.genre)))}>
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Palette className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-text-primary">{genre.genre}</p>
                  <p className="text-xs text-text-secondary">{genre.count || 0} songs</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
