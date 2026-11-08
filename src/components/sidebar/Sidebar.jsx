import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStore, useLibraryStore } from '@store/store';
import { Tooltip } from '@components/common/Tooltip';
import {
  Home, Music, FileAudio, Album, User, Palette, Library, Heart, History, SlidersHorizontal, Settings, ChevronLeft, ChevronRight, PlusCircle, FolderOpen, X, FileJson, Cloud, Wifi, WifiOff
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: Home, path: '/dashboard' },
  { id: 'library', label: 'Music Library', icon: Music, path: '/library' },
  { id: 'songs', label: 'All Songs', icon: FileAudio, path: '/songs' },
  { id: 'albums', label: 'Albums', icon: Album, path: '/albums' },
  { id: 'artists', label: 'Artists', icon: User, path: '/artists' },
  { id: 'genres', label: 'Genres', icon: Palette, path: '/genres' },
  { id: 'playlists', label: 'Playlists', icon: Library, path: '/playlists', badge: null },
  { id: 'favorites', label: 'Favorites', icon: Heart, path: '/favorites' },
  { id: 'recently-played', label: 'Recently Played', icon: History, path: '/recently-played' },
  { id: 'import', label: 'Import Music', icon: FolderOpen, path: '/import' },
  { id: 'export-import', label: 'Export/Import', icon: FileJson, path: '/export-import' },
  { id: 'sync', label: 'Sync Status', icon: Cloud, path: '/sync' },
  { id: 'equalizer', label: 'Equalizer', icon: SlidersHorizontal, path: '/equalizer' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore();
  const { playlists = [] } = useLibraryStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleToggle = () => {
    setIsTransitioning(true);
    setSidebarCollapsed(!sidebarCollapsed);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const activeItem = NAV_ITEMS.find(item => location.pathname === item.path) || NAV_ITEMS[0];

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-64 bg-bg-secondary border-r border-border-default transition-all duration-300 ease-in-out z-40 flex flex-col overflow-hidden md:translate-x-0 ${
        sidebarCollapsed ? 'md:w-16' : 'md:w-64'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isTransitioning ? 'pointer-events-none' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo / Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border-default flex-shrink-0">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-secondary rounded-xl flex items-center justify-center shadow-lg">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-text-primary text-base">MyMusicPlayer</h1>
              <p className="text-xs text-text-secondary">Offline Music</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="flex justify-center w-full">
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-secondary rounded-xl flex items-center justify-center shadow-lg">
              <Music className="w-6 h-6 text-white" />
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (window.matchMedia('(max-width: 767px)').matches) onClose();
            else handleToggle();
          }}
          className={`p-1.5 rounded-lg bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary hover:bg-accent/10 transition-all duration-200 flex-shrink-0 ${
            sidebarCollapsed ? 'rotate-180' : ''
          }`}
          aria-label={window.matchMedia('(max-width: 767px)').matches ? 'Close navigation' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {window.matchMedia('(max-width: 767px)').matches ? <X className="w-5 h-5" /> : sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2" role="navigation" aria-label="Main navigation">
        <ul className="space-y-1" role="menubar">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const badgeValue = item.id === 'playlists' ? playlists?.length || 0 : null;

            return (
              <li key={item.id} role="none">
                <Tooltip text={item.label} position="right" disabled={!sidebarCollapsed}>
                  <button
                    onClick={() => { navigate(item.path); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-secondary focus:ring-offset-2 focus:ring-offset-bg-secondary ${
                      isActive
                        ? 'bg-accent/10 text-accent border-l-3 border-l-accent pl-[calc(0.75rem-3px)]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {badgeValue && badgeValue > 0 && (
                          <span className="ml-auto px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full font-medium">
                            {badgeValue}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </Tooltip>
              </li>
            );
          })}
        </ul>

        {/* Playlist section divider */}
        {!sidebarCollapsed && (
          <div className="mt-6 mb-2 px-3 border-t border-border-default">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <span>YOUR PLAYLISTS</span>
              <button className="text-accent hover:text-accent-hover transition-colors" onClick={() => { navigate('/playlists?new=true'); onClose(); }}>
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic playlists */}
        {!sidebarCollapsed && playlists?.length > 0 && (
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {playlists.slice(0, 10).map((playlist) => (
              <li key={playlist.id}>
                <button
                  onClick={() => { navigate(`/playlists?playlistId=${playlist.id}`); onClose(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                    location.pathname === '/playlists' && new URLSearchParams(location.search).get('playlistId') === String(playlist.id)
                      ? 'bg-accent/10 text-accent border-l-3 border-l-accent pl-[calc(0.75rem-3px)]'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                  aria-label={playlist.name}
                >
                  <Library className="w-5 h-5 flex-shrink-0 text-text-secondary" />
                  <span className="truncate">{playlist.name}</span>
                  <span className="ml-auto text-xs text-text-secondary">{playlist.song_count || 0}</span>
                </button>
              </li>
            ))}
            {playlists.length > 10 && (
              <li>
                <button
                  onClick={() => navigate('/playlists')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  <span>+ {playlists.length - 10} more</span>
                </button>
              </li>
            )}
          </ul>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border-default flex-shrink-0">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-bg-tertiary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">Offline Mode</p>
              <p className="text-xs text-text-secondary">No internet required</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-bg-tertiary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-text-secondary" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
