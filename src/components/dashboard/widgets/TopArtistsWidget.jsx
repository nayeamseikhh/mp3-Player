import { useLibraryStore } from '@store/store';
import Card from '@components/common/Card';
import { User, Music } from 'lucide-react';

export default function TopArtistsWidget({ config = {} }) {
  const { artists = [] } = useLibraryStore();
  const limit = config?.limit || 6;

  const topArtists = artists.slice(0, limit);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-purple-400" />
          Top Artists
        </h3>
      </div>
      {topArtists.length > 0 ? (
        <div className="space-y-2">
          {topArtists.map((artist, index) => (
            <div key={artist} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/5 cursor-pointer">
              <div className="w-10 h-10 bg-bg-tertiary rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{artist}</p>
                <p className="text-xs text-text-secondary truncate">Artist</p>
              </div>
              <div className="text-xs text-text-secondary">#{index + 1}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary text-sm">No artists yet</p>
      )}
    </Card>
  );
}