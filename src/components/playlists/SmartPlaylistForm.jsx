import { useState } from 'react';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import { Music, History, PlusCircle, TrendingUp, Heart, User, Album, Music2 } from 'lucide-react';

const SMART_PLAYLIST_TYPES = [
  { id: 'recentlyPlayed', name: 'Recently Played', description: 'Tracks you played most recently', icon: History },
  { id: 'recentlyAdded', name: 'Recently Added', description: 'Tracks most recently imported', icon: PlusCircle },
  { id: 'mostPlayed', name: 'Most Played', description: 'Your most frequently played tracks', icon: TrendingUp },
  { id: 'favorites', name: 'Favorites', description: 'All your favorite songs', icon: Heart },
  { id: 'topArtists', name: 'Top Artists', description: 'Your most-played artists', icon: User },
  { id: 'allSongs', name: 'All Songs', description: 'Every track in your library', icon: Music2 },
];

export default function SmartPlaylistForm({ isOpen, onClose, onCreate }) {
  const [selectedType, setSelectedType] = useState(null);
  const [playlistName, setPlaylistName] = useState('');

  const handleCreate = () => {
    if (!selectedType) return;
    const typeInfo = SMART_PLAYLIST_TYPES.find(t => t.id === selectedType);
    const name = playlistName.trim() || typeInfo?.name || 'Smart Playlist';
    onCreate(selectedType, name);
    setSelectedType(null);
    setPlaylistName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Smart Playlist">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Smart playlists automatically update based on your listening habits.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {SMART_PLAYLIST_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : 'border-border-default hover:border-accent/50'
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                <div className="text-sm font-medium text-text-primary">{type.name}</div>
                <div className="text-xs text-text-secondary mt-1">{type.description}</div>
              </button>
            );
          })}
        </div>

        {selectedType && (
          <div>
            <label className="block text-sm text-text-secondary mb-1">Playlist Name (optional)</label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder={SMART_PLAYLIST_TYPES.find(t => t.id === selectedType)?.name}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!selectedType} onClick={handleCreate}>Create Smart Playlist</Button>
        </div>
      </div>
    </Modal>
  );
}