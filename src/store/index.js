import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Player state store
export const usePlayerStore = create(
  persist(
    (set, get) => ({
      // Current track
      currentTrack: null,
      currentTrackIndex: -1,

      // Playback state
      isPlaying: false,
      isLoading: false,
      miniPlayerOpen: false,
      miniPlayerPosition: null,
      playbackPosition: 0,
      playbackDuration: 0,
      volume: 0.7,
      isMuted: false,

      // Playback options
      shuffle: false,
      repeat: 'off', // 'off' | 'all' | 'one'
      speed: 1.0,
      crossfadeEnabled: false,
      crossfadeDuration: 5000, // ms

      // Queue
      queue: [],
      queueHistory: [],

      // Audio context for Web Audio API
      audioContext: null,
      audioElement: null,
      gainNode: null,
      analyserNode: null,
      equalizerNodes: [],

      // Equalizer
      equalizerPreset: 'flat',
      equalizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bassBoost: 0,
      trebleBoost: 0,
      balance: 0,

      // Actions
      setCurrentTrack: (track, index = -1) => set({ currentTrack: track, currentTrackIndex: index, isPlaying: false, playbackPosition: 0 }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setMiniPlayerOpen: (miniPlayerOpen) => set({ miniPlayerOpen }),
      setMiniPlayerPosition: (miniPlayerPosition) => set({ miniPlayerPosition }),
      setPlaybackPosition: (position) => set({ playbackPosition: position }),
      setPlaybackDuration: (duration) => set({ playbackDuration: duration }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      setMuted: (isMuted) => set({ isMuted }),
      setShuffle: (shuffle) => set({ shuffle }),
      setRepeat: (repeat) => set({ repeat }),
      setSpeed: (speed) => set({ speed: Math.max(0.5, Math.min(2, speed)) }),

      // Queue actions
      setQueue: (queue) => set({ queue, currentTrackIndex: 0, currentTrack: queue[0] || null }),
      addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
      addNextToQueue: (track) => set((state) => ({
        queue: [...state.queue.slice(0, state.currentTrackIndex + 1), track, ...state.queue.slice(state.currentTrackIndex + 1)]
      })),
      removeFromQueue: (index) => set((state) => {
        const newQueue = state.queue.filter((_, i) => i !== index);
        let newIndex = state.currentTrackIndex;
        if (index < state.currentTrackIndex) newIndex--;
        else if (index === state.currentTrackIndex) newIndex = Math.min(index, newQueue.length - 1);
        return { queue: newQueue, currentTrackIndex: newIndex, currentTrack: newQueue[newIndex] || null };
      }),
      clearQueue: () => set({ queue: [], currentTrackIndex: -1, currentTrack: null }),
      reorderQueue: (queue) => set({ queue }),
      shuffleQueue: () => set((state) => {
        const shuffled = [...state.queue].sort(() => Math.random() - 0.5);
        return { queue: shuffled, currentTrackIndex: 0, currentTrack: shuffled[0] || null };
      }),
      playNext: () => set((state) => {
        if (state.queue.length === 0) return state;
        let nextIndex;
        if (state.shuffle) {
          if (state.currentTrackIndex < 0) {
            nextIndex = Math.floor(Math.random() * state.queue.length);
          } else if (state.queue.length > 1) {
            nextIndex = Math.floor(Math.random() * (state.queue.length - 1));
            if (nextIndex >= state.currentTrackIndex) nextIndex++;
          } else {
            nextIndex = 0;
          }
        } else if (state.repeat === 'one') {
          nextIndex = state.currentTrackIndex;
        } else {
          nextIndex = state.currentTrackIndex + 1;
          if (nextIndex >= state.queue.length) {
            if (state.repeat === 'all') nextIndex = 0;
            else return state;
          }
        }
        return { currentTrackIndex: nextIndex, currentTrack: state.queue[nextIndex], isPlaying: true, playbackPosition: 0 };
      }),
      playPrevious: () => set((state) => {
        if (state.queue.length === 0) return state;
        let prevIndex = state.currentTrackIndex - 1;
        if (prevIndex < 0) {
          if (state.repeat === 'all') prevIndex = state.queue.length - 1;
          else return state;
        }
        return { currentTrackIndex: prevIndex, currentTrack: state.queue[prevIndex], isPlaying: true, playbackPosition: 0 };
      }),

      // Audio setup
      setAudioContext: (context) => set({ audioContext: context }),
      setAudioElement: (element) => set({ audioElement: element }),
      setGainNode: (node) => set({ gainNode: node }),
      setAnalyserNode: (node) => set({ analyserNode: node }),
      setEqualizerNodes: (nodes) => set({ equalizerNodes: nodes }),

      // Equalizer
      setEqualizerPreset: (preset) => set({ equalizerPreset: preset }),
      setEqualizerBands: (bands) => set({ equalizerBands: bands }),
      setBassBoost: (value) => set({ bassBoost: Math.max(-100, Math.min(100, value)) }),
      setTrebleBoost: (value) => set({ trebleBoost: Math.max(-100, Math.min(100, value)) }),
      setBalance: (value) => set({ balance: Math.max(-1, Math.min(1, value)) }),

      // Reset
      resetPlayer: () => set({
        currentTrack: null,
        currentTrackIndex: -1,
        isPlaying: false,
        isLoading: false,
        playbackPosition: 0,
        playbackDuration: 0,
        queue: [],
        queueHistory: [],
      }),
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        miniPlayerPosition: state.miniPlayerPosition,
        shuffle: state.shuffle,
        repeat: state.repeat,
        speed: state.speed,
        equalizerPreset: state.equalizerPreset,
        equalizerBands: state.equalizerBands,
        bassBoost: state.bassBoost,
        trebleBoost: state.trebleBoost,
        balance: state.balance,
      }),
    }
  )
);

// Library state store
export const useLibraryStore = create(
  persist(
    (set, get) => ({
      songs: [],
      artists: [],
      albums: [],
      genres: [],
      playlists: [],
      favorites: [],
      recentlyPlayed: [],
      stats: null,

      // UI state
      currentView: 'all',
      sortBy: 'title',
      sortOrder: 'ASC',
      searchQuery: '',
      filterGenre: '',
      filterArtist: '',
      filterAlbum: '',
      viewMode: 'grid', // 'grid' | 'list'

      // Actions
      setSongs: (songs) => set({ songs }),
      addSongs: (newSongs) => set((state) => ({ songs: [...state.songs, ...newSongs] })),
      updateSong: (id, updates) => set((state) => ({
        songs: state.songs.map(s => s.id === id ? { ...s, ...updates } : s)
      })),
      removeSong: (id) => set((state) => ({ songs: state.songs.filter(s => s.id !== id) })),
      setArtists: (artists) => set({ artists }),
      setAlbums: (albums) => set({ albums }),
      setGenres: (genres) => set({ genres }),
      setPlaylists: (playlists) => set({ playlists }),
      setFavorites: (favorites) => set({ favorites }),
      setRecentlyPlayed: (recentlyPlayed) => set({ recentlyPlayed }),
      setStats: (stats) => set({ stats }),

      // UI actions
      setCurrentView: (view) => set({ currentView: view }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (order) => set({ sortOrder }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterGenre: (genre) => set({ filterGenre: genre }),
      setFilterArtist: (artist) => set({ filterArtist: artist }),
      setFilterAlbum: (album) => set({ filterAlbum: album }),
      setViewMode: (mode) => set({ viewMode: mode }),

      // Toggle favorite
      toggleFavorite: (songId) => set((state) => ({
        songs: state.songs.map(s => s.id === songId ? { ...s, is_favorite: !s.is_favorite } : s),
        favorites: state.favorites.some(f => f.id === songId)
          ? state.favorites.filter(f => f.id !== songId)
          : [...state.favorites, state.songs.find(s => s.id === songId)].filter(Boolean)
      })),
    }),
    {
      name: 'library-storage',
      partialize: (state) => ({
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        viewMode: state.viewMode,
      }),
    }
  )
);

// Dashboard state store
export const useDashboardStore = create(
  persist(
    (set, get) => ({
      layouts: [],
      currentLayoutId: null,
      widgets: [],

      // Available widget types
      availableWidgets: [
        { id: 'stats', name: 'Music Statistics', defaultConfig: {}, resizable: false },
        { id: 'recentlyPlayed', name: 'Recently Played', defaultConfig: { limit: 5 }, resizable: true },
        { id: 'recentlyAdded', name: 'Recently Added', defaultConfig: { limit: 5 }, resizable: true },
        { id: 'favorites', name: 'Favorites', defaultConfig: { limit: 5 }, resizable: true },
        { id: 'quickPlaylists', name: 'Quick Playlists', defaultConfig: { limit: 5 }, resizable: true },
        { id: 'mostPlayed', name: 'Most Played', defaultConfig: { limit: 5 }, resizable: true },
        { id: 'topArtists', name: 'Top Artists', defaultConfig: { limit: 5 }, resizable: true },
        { id: 'collectionOverview', name: 'Collection Overview', defaultConfig: {}, resizable: false },
      ],

      setLayouts: (layouts) => set({ layouts }),
      setCurrentLayout: (id) => set({ currentLayoutId: id }),
      setWidgets: (widgets) => set({ widgets }),
      addWidget: (widget) => set((state) => ({ widgets: [...state.widgets, widget] })),
      removeWidget: (widgetId) => set((state) => ({ widgets: state.widgets.filter(w => w.widgetId !== widgetId) })),
      updateWidget: (widgetId, updates) => set((state) => ({
        widgets: state.widgets.map(w => w.widgetId === widgetId ? { ...w, ...updates } : w)
      })),
      reorderWidgets: (widgets) => set({ widgets }),
      resetToDefault: () => set((state) => {
        const defaultLayout = state.layouts.find(l => l.is_default);
        if (defaultLayout) {
          return { currentLayoutId: defaultLayout.id, widgets: defaultLayout.widgets || [] };
        }
        return state;
      }),
      addLayout: (layout) => set((state) => ({ layouts: [...state.layouts, layout] })),
      deleteLayout: (layoutId) => set((state) => ({ layouts: state.layouts.filter(l => l.id !== layoutId) })),
      renameLayout: (layoutId, name) => set((state) => ({ layouts: state.layouts.map(l => l.id === layoutId ? { ...l, name } : l) })),
      loadLayout: (layoutId) => set((state) => {
        const layout = state.layouts.find(l => l.id === layoutId);
        if (layout) {
          return { currentLayoutId: layoutId, widgets: layout.widgets || [] };
        }
        return state;
      }),
      saveCurrentLayout: (name) => set((state) => {
        const newLayout = {
          id: `layout-${Date.now()}`,
          name: name,
          is_default: false,
          widgets: [...state.widgets],
        };
        return { layouts: [...state.layouts, newLayout] };
      }),
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        currentLayoutId: state.currentLayoutId,
      }),
    }
  )
);

// Settings state store
export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // General
      theme: 'dark', // 'dark' | 'light' | 'system'
      accentColor: '#FF8A32',
      language: 'en',
      startupPage: 'dashboard',
      confirmDelete: true,
      showAlbumArtwork: true,

      // Audio
      defaultVolume: 0.7,
      playbackSpeed: 1.0,
      crossfadeEnabled: false,
      crossfadeDuration: 5,
      sleepTimerMinutes: 0,

      // Library
      defaultMusicFolder: '',
      autoScanOnStartup: false,
      duplicateHandling: 'skip', // 'skip' | 'replace' | 'keepBoth'

      // Appearance
      sidebarCollapsed: false,
      compactLayout: false,

      // Sync
      syncEnabled: true,
      syncIntervalMinutes: 30,
      autoResolveConflicts: false,
      conflictResolutionStrategy: 'local_wins', // 'local_wins' | 'remote_wins' | 'merge'
      syncHistory: [], // { id, timestamp, status, pendingChanges, resolvedConflicts, error }

      // Actions
      setTheme: (theme) => set({ theme }),
      setAccentColor: (color) => set({ accentColor: color }),
      setLanguage: (lang) => set({ language: lang }),
      setStartupPage: (page) => set({ startupPage: page }),
      setConfirmDelete: (value) => set({ confirmDelete: value }),
      setShowAlbumArtwork: (value) => set({ showAlbumArtwork: value }),

      setDefaultVolume: (volume) => set({ defaultVolume: volume }),
      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
      setCrossfadeEnabled: (enabled) => set({ crossfadeEnabled: enabled }),
      setCrossfadeDuration: (duration) => set({ crossfadeDuration: duration }),
      setSleepTimerMinutes: (minutes) => set({ sleepTimerMinutes: minutes }),

      setDefaultMusicFolder: (folder) => set({ defaultMusicFolder: folder }),
      setAutoScanOnStartup: (enabled) => set({ autoScanOnStartup: enabled }),
      setDuplicateHandling: (mode) => set({ duplicateHandling: mode }),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCompactLayout: (compact) => set({ compactLayout: compact }),

      // Sync actions
      setSyncEnabled: (enabled) => set({ syncEnabled: enabled }),
      setSyncIntervalMinutes: (minutes) => set({ syncIntervalMinutes: Math.max(1, Math.min(1440, minutes)) }),
      setAutoResolveConflicts: (enabled) => set({ autoResolveConflicts: enabled }),
      setConflictResolutionStrategy: (strategy) => set({ conflictResolutionStrategy: strategy }),
      addSyncHistoryEntry: (entry) => set((state) => ({
        syncHistory: [entry, ...state.syncHistory].slice(0, 50) // keep last 50 entries
      })),
      clearSyncHistory: () => set({ syncHistory: [] }),

      // Reset
      resetSettings: () => set({
        theme: 'dark',
        accentColor: '#FF8A32',
        language: 'en',
        startupPage: 'dashboard',
        confirmDelete: true,
        showAlbumArtwork: true,
        defaultVolume: 0.7,
        playbackSpeed: 1.0,
        crossfadeEnabled: false,
        crossfadeDuration: 5,
        sleepTimerMinutes: 0,
        defaultMusicFolder: '',
        autoScanOnStartup: false,
        duplicateHandling: 'skip',
        sidebarCollapsed: false,
        compactLayout: false,
        syncEnabled: true,
        syncIntervalMinutes: 30,
        autoResolveConflicts: false,
        conflictResolutionStrategy: 'local_wins',
        syncHistory: [],
      }),
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        theme: state.theme,
        accentColor: state.accentColor,
        language: state.language,
        startupPage: state.startupPage,
        confirmDelete: state.confirmDelete,
        showAlbumArtwork: state.showAlbumArtwork,
        defaultVolume: state.defaultVolume,
        playbackSpeed: state.playbackSpeed,
        crossfadeEnabled: state.crossfadeEnabled,
        crossfadeDuration: state.crossfadeDuration,
        sleepTimerMinutes: state.sleepTimerMinutes,
        defaultMusicFolder: state.defaultMusicFolder,
        autoScanOnStartup: state.autoScanOnStartup,
        duplicateHandling: state.duplicateHandling,
        sidebarCollapsed: state.sidebarCollapsed,
        compactLayout: state.compactLayout,
        syncEnabled: state.syncEnabled,
        syncIntervalMinutes: state.syncIntervalMinutes,
        autoResolveConflicts: state.autoResolveConflicts,
        conflictResolutionStrategy: state.conflictResolutionStrategy,
      }),
    }
  )
);

// Export all stores
export const useStore = {
  player: usePlayerStore,
  library: useLibraryStore,
  dashboard: useDashboardStore,
  settings: useSettingsStore,
};
