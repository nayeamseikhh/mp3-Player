import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@store/store';
import Card from '@components/common/Card';
import Badge from '@components/common/Badge';
import EmptyState from '@components/common/EmptyState';
import { Music, Disc3, User, Palette, Library as LibraryIcon, ListMusic } from 'lucide-react';
import { playTrackList } from '@utils/playback';

export default function Library() {
  const navigate = useNavigate();
  const { songs = [], stats, artists = [], albums = [], genres = [], playlists = [] } = useLibraryStore();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2 sm:text-3xl">Music Library</h2>
          <p className="text-text-secondary">Browse your organized music collection</p>
        </div>
      </div>

      {stats?.totalSongs === 0 ? (
        <EmptyState
          icon={Music}
          title="Your library is empty"
          subtitle="Import music files to start building your library"
          action={
            <button
              onClick={() => navigate('/import')}
              className="btn btn-primary"
            >
              Import Music
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Artists */}
          <section>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-accent" />
              Top Artists
            </h3>
            {artists?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {artists.slice(0, 6).map((artist, idx) => (
                  <Card key={artist.artist} className="p-4 hover:bg-accent/5 hover:border-accent/50 transition-all cursor-pointer" onClick={() => playTrackList(songs.filter((song) => song.artist === artist.artist))}>
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-24 h-24 bg-gradient-to-br from-accent/30 to-accent-secondary/30 rounded-full flex items-center justify-center">
                        <User className="w-12 h-12 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary truncate">{artist.artist}</p>
                        <p className="text-sm text-text-secondary">{artist.count} songs</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary">No artists found</p>
            )}
          </section>

          {/* Albums */}
          <section>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-accent-secondary" />
              Recent Albums
            </h3>
            {albums?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {albums.slice(0, 6).map((album, idx) => (
                  <Card key={`${album.album}-${album.artist}`} className="p-4 hover:bg-accent/5 hover:border-accent/50 transition-all cursor-pointer" onClick={() => playTrackList(songs.filter((song) => song.album === album.album && (song.artist || '') === (album.artist || '')))}>
                    <div className="space-y-3">
                      <div className="w-full aspect-square bg-bg-primary rounded-lg overflow-hidden">
                        <Disc3 className="w-full h-full text-text-secondary p-4" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary truncate">{album.album}</p>
                        <p className="text-sm text-text-secondary truncate">{album.artist}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary">No albums found</p>
            )}
          </section>

          {/* Genres */}
          <section>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-400" />
              Genres
            </h3>
            <div className="flex flex-wrap gap-2">
              {genres?.length > 0 ? (
                genres.slice(0, 12).map((genre) => (
                  <button
                    key={genre.genre}
                    onClick={() => playTrackList(songs.filter((song) => String(song.genre || '').split(/[;,/]/).map((value) => value.trim()).includes(genre.genre)))}
                    className="btn btn-secondary rounded-full"
                  >
                    {genre.genre}
                    <span className="text-xs text-text-secondary">({genre.count})</span>
                  </button>
                ))
              ) : (
                <p className="text-text-secondary">No genres found</p>
              )}
            </div>
          </section>

          {/* Playlists quick view */}
          <section>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <LibraryIcon className="w-5 h-5 text-blue-400" />
              Playlists
            </h3>
            {playlists?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.slice(0, 6).map((playlist) => (
                  <Card key={playlist.id} className="p-4 hover:bg-accent/5 hover:border-accent/50 transition-all cursor-pointer" onClick={() => navigate('/playlists')}>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent-secondary rounded-lg flex items-center justify-center">
                        <ListMusic className="w-7 h-7 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate">{playlist.name}</p>
                        <p className="text-sm text-text-secondary">{playlist.song_count || 0} songs</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary">No playlists yet</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
