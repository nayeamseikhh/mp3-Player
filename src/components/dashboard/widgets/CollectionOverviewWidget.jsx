import { useLibraryStore } from '@store/store';
import Card from '@components/common/Card';
import { Music, Disc3, User, Clock, ListMusic, Heart, TrendingUp, BarChart3 } from 'lucide-react';

export default function CollectionOverviewWidget({ config = {} }) {
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

  const stats = [
    { label: 'Total Songs', value: songs.length, icon: Music, color: 'text-text-primary' },
    { label: 'Total Albums', value: albums.length, icon: Disc3, color: 'text-text-primary' },
    { label: 'Total Artists', value: artists.length, icon: User, color: 'text-text-primary' },
    { label: 'Total Duration', value: formatDuration(totalDuration), icon: Clock, color: 'text-text-primary' },
    { label: 'Total Playlists', value: playlists.length, icon: ListMusic, color: 'text-text-primary' },
    { label: 'Total Favorites', value: favorites.length, icon: Heart, color: 'text-text-primary' },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          Collection Overview
        </h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-4 rounded-lg bg-bg-tertiary border border-border-default">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-sm text-text-secondary">{stat.label}</p>
              </div>
              <p className="text-xl font-semibold text-text-primary ml-12">{stat.value}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 bg-bg-secondary rounded-lg border border-border-default">
        <h4 className="text-sm font-medium text-text-primary mb-3">Library Health</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary">Songs Available</span>
            <span className="text-text-primary">{songs.filter(s => s.is_available).length} of {songs.length}</span>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all"
              style={{ width: `${songs.length > 0 ? (songs.filter(s => s.is_available).length / songs.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>
    </Card>
  );
}