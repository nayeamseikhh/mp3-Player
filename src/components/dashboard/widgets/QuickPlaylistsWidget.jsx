import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@store/store';
import Card from '@components/common/Card';
import { ListMusic, Music, PlusCircle, ExternalLink } from 'lucide-react';
import { mediaUrl } from '@utils/media';

export default function QuickPlaylistsWidget({ config = {} }) {
  const { playlists = [] } = useLibraryStore();
  const limit = config?.limit || 5;

  const songs = playlists.slice(0, limit);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-accent-secondary" />
          Quick Playlists
        </h3>
      </div>
      {songs.length > 0 ? (
        <div className="space-y-2">
          {songs.map((playlist) => (
            <div key={playlist.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/5 cursor-pointer" onClick={() => navigate(`/playlists?playlistId=${playlist.id}`)}>
              <div className="w-10 h-10 bg-bg-tertiary rounded-lg flex items-center justify-center">
                {playlist.cover_path ? (
                  <img src={mediaUrl(playlist.cover_path)} alt={playlist.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <ListMusic className="w-5 h-5 text-text-secondary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{playlist.name}</p>
                <p className="text-xs text-text-secondary truncate">{playlist.song_count || 0} songs</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); navigate('/playlists'); }} className="p-1.5 text-text-secondary hover:text-accent" title="Open playlist">
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary text-sm">No playlists yet</p>
      )}
    </Card>
  );
}