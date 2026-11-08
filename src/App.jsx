import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useSettingsStore } from '@store/store';
import { refreshLibraryData } from '@utils/library';
import { PlayerProvider } from '@context/PlayerContext';
import { IPCProvider } from '@context/IPCContext';
import Sidebar from '@components/sidebar/Sidebar';
import SyncStatus from '@components/sync/SyncStatus';
import Player from '@components/player/Player';
import MiniPlayerOverlay from '@components/player/MiniPlayer';
import './styles/index.css';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('@pages/Dashboard/Dashboard'));
const Library = lazy(() => import('@pages/Library/Library'));
const Songs = lazy(() => import('@pages/Songs/Songs'));
const Albums = lazy(() => import('@pages/Albums/Albums'));
const Artists = lazy(() => import('@pages/Artists/Artists'));
const Genres = lazy(() => import('@pages/Genres/Genres'));
const Playlists = lazy(() => import('@pages/Playlists/Playlists'));
const Favorites = lazy(() => import('@pages/Favorites/Favorites'));
const RecentlyPlayed = lazy(() => import('@pages/RecentlyPlayed/RecentlyPlayed'));
const Equalizer = lazy(() => import('@pages/Equalizer/Equalizer'));
const Lyrics = lazy(() => import('@pages/Lyrics/Lyrics'));
const Settings = lazy(() => import('@pages/Settings/Settings'));
const Import = lazy(() => import('@pages/Import/Import'));
const MiniPlayer = lazy(() => import('@pages/MiniPlayer/MiniPlayer'));
const NowPlayingPage = lazy(() => import('@pages/NowPlaying/NowPlayingPage'));
const EditMetadata = lazy(() => import('@pages/EditMetadata/EditMetadata'));
const ExportImport = lazy(() => import('@pages/ExportImport/ExportImport'));

function toHexColor(channels) {
  return `#${channels.map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`;
}

function getAccentForeground(channels) {
  const luminance = channels.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.058;
  return darkContrast >= whiteContrast ? '17 24 39' : '255 255 255';
}

function App() {
  const { theme, accentColor, defaultMusicFolder, autoScanOnStartup, startupPage, sidebarCollapsed } = useSettingsStore();
  const libraryLoadKey = useRef(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const loadKey = autoScanOnStartup && defaultMusicFolder ? `scan:${defaultMusicFolder}` : 'library';
    if (libraryLoadKey.current === loadKey) return undefined;
    libraryLoadKey.current = loadKey;
    let cancelled = false;
    const loadLibrary = async () => {
      if (autoScanOnStartup && defaultMusicFolder && window.electronAPI?.invoke) {
        await window.electronAPI.invoke('mymusicplayer:music:rescan', defaultMusicFolder);
      }
      if (!cancelled) await refreshLibraryData();
    };
    loadLibrary().catch((error) => console.error('Could not load music library:', error));
    return () => { cancelled = true; };
  }, [autoScanOnStartup, defaultMusicFolder]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const systemTheme = window.matchMedia('(prefers-color-scheme: light)');
    const applyTheme = () => {
      root.setAttribute('data-theme', theme === 'system' ? (systemTheme.matches ? 'light' : 'dark') : theme);
    };
    applyTheme();
    root.style.setProperty('--color-accent', accentColor);
    const normalized = String(accentColor).replace('#', '');
    const hex = normalized.length === 3 ? normalized.split('').map((value) => value + value).join('') : normalized;
    const channels = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
    if (channels.every(Number.isFinite)) {
      root.style.setProperty('--color-accent-rgb', channels.join(' '));
      root.style.setProperty('--color-accent-foreground-rgb', getAccentForeground(channels));
      const hoverChannels = channels.map((value) => Math.round(value + (255 - value) * 0.12));
      root.style.setProperty('--color-accent-hover', toHexColor(hoverChannels));
      root.style.setProperty('--color-accent-hover-rgb', hoverChannels.join(' '));
    }
    if (theme !== 'system') return undefined;
    systemTheme.addEventListener('change', applyTheme);
    return () => systemTheme.removeEventListener('change', applyTheme);
  }, [theme, accentColor]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <IPCProvider>
        <PlayerProvider>
          <div className="app-shell bg-bg-primary text-text-primary">
            <div className="app-layout">
              <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
              {mobileNavOpen && <button type="button" className="app-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
              <div className={`app-main${sidebarCollapsed ? ' app-main-collapsed' : ''}`}>
                <header className="app-mobile-header">
                  <button type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)} className="btn-icon">☰</button>
                  <span className="truncate font-semibold">MyMusicPlayer</span>
                </header>
                <main className="app-page-scroll">
                <Suspense fallback={<div className="p-8 text-center text-text-secondary">Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<Navigate to={`/${startupPage || 'dashboard'}`} replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/import" element={<Import />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/songs" element={<Songs />} />
                    <Route path="/albums" element={<Albums />} />
                    <Route path="/artists" element={<Artists />} />
                    <Route path="/genres" element={<Genres />} />
                    <Route path="/playlists" element={<Playlists />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/recently-played" element={<RecentlyPlayed />} />
                    <Route path="/equalizer" element={<Equalizer />} />
                    <Route path="/lyrics" element={<Lyrics />} />
                    <Route path="/mini-player" element={<MiniPlayer />} />
                    <Route path="/now-playing" element={<NowPlayingPage />} />
                    <Route path="/edit-metadata/:id" element={<EditMetadata />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/export-import" element={<ExportImport />} />
<Route path="/sync" element={<SyncStatus />} />
                  </Routes>
                </Suspense>
                </main>
              </div>
            </div>
            <Player />
            <MiniPlayerOverlay />
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-default)',
              },
            }}
          />
        </PlayerProvider>
      </IPCProvider>
    </BrowserRouter>
  );
}

export default App;
