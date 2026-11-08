import { useLibraryStore } from '@store/store';
import Card from '@components/common/Card';
import EmptyState from '@components/common/EmptyState';
import { Disc3 } from 'lucide-react';
import { playTrackList } from '@utils/playback';
import { mediaUrl } from '@utils/media';

export default function Albums() {
  const { albums = [], songs = [] } = useLibraryStore();

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-text-primary mb-6 sm:mb-8 sm:text-3xl">Albums</h2>

      {albums.length === 0 ? (
        <EmptyState
          icon={Disc3}
          title="No albums found"
          subtitle="Import music to see your album collection"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {albums.map((album, idx) => (
            <Card key={`${album.album}-${album.artist}`} className="cursor-pointer" onClick={() => playTrackList(songs.filter((song) => song.album === album.album && (song.artist || '') === (album.artist || '')))}>
              <div className="aspect-square bg-bg-primary rounded-lg overflow-hidden mb-4">
                {songs.find((song) => song.album === album.album && song.artist === album.artist)?.artwork_path
                  ? <img src={mediaUrl(songs.find((song) => song.album === album.album && song.artist === album.artist).artwork_path)} alt={album.album} className="h-full w-full object-cover" />
                  : <Disc3 className="w-full h-full text-text-secondary p-4 sm:p-6 lg:p-8" />}
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium text-text-primary truncate">{album.album}</p>
                <p className="text-sm text-text-secondary truncate">{album.artist}</p>
                <p className="text-xs text-text-secondary">{album.count || 0} songs</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
