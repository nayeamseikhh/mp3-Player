import { useLibraryStore } from '@store/store';
import { usePlayerStore } from '@store/store';
import Card from '@components/common/Card';
import { Music, Disc3, User, Clock, ListMusic, Heart } from 'lucide-react';

export default function StatsWidget({ config = {} }) {
  const { songs = [], artists = [], albums = [], playlists = [], favorites = [] } = useLibraryStore();

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const m = hours > 0 ? minutes.toString().padStart(2, '0') : minutes.toString();
    const s = secs.toString().padStart(2, '0');
    return hours > 0 ? `${hours}:${m}:${s}` : `${m}:${s}`;
  };

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  const statCards = [
    { label: 'Songs', value: songs.length, icon: Music, color: 'text-accent', bgColor: 'bg-accent/10' },
    { label: 'Albums', value: albums.length, icon: Disc3, color: 'text-accent-secondary', bgColor: 'bg-accent-secondary/10' },
    { label: 'Artists', value: artists.length, icon: User, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    { label: 'Duration', value: formatDuration(totalDuration), icon: Clock, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    { label: 'Playlists', value: playlists.length, icon: ListMusic, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { label: 'Favorites', value: favorites.length, icon: Heart, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  ];

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-3 rounded-lg bg-bg-tertiary border border-border-default">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-text-secondary">{stat.label}</p>
                <div className={`p-1.5 rounded ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-lg font-semibold text-text-primary">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}