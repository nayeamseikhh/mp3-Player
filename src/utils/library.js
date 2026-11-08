import { useLibraryStore } from '@store/store';

export async function refreshLibraryData() {
  const invoke = window.electronAPI?.invoke;
  if (!invoke) return [];

  const requests = await Promise.allSettled([
    invoke('mymusicplayer:music:getAll', { limit: 100000 }),
    invoke('mymusicplayer:favorite:getAll'),
    invoke('mymusicplayer:playlist:getAll'),
    invoke('mymusicplayer:recentlyPlayed:getAll'),
    invoke('mymusicplayer:music:getStats'),
  ]);
  const [songsResult, favoritesResult, playlistsResult, recentResult, statsResult] = requests;
  const songs = songsResult.status === 'fulfilled' && Array.isArray(songsResult.value) ? songsResult.value : [];
  const store = useLibraryStore.getState();

  if (songsResult.status === 'fulfilled') {
    store.setSongs(songs);
    const artists = new Map();
    const albums = new Map();
    const genres = new Map();
    for (const song of songs) {
      if (song.artist) artists.set(song.artist, (artists.get(song.artist) || 0) + 1);
      if (song.album) {
        const key = `${song.album}\u0000${song.artist || ''}`;
        const album = albums.get(key) || { album: song.album, artist: song.artist || '', count: 0, year: song.year };
        album.count++;
        albums.set(key, album);
      }
      for (const genre of String(song.genre || '').split(/[;,/]/).map((value) => value.trim()).filter(Boolean)) {
        genres.set(genre, (genres.get(genre) || 0) + 1);
      }
    }
    store.setArtists([...artists].map(([artist, count]) => ({ artist, count })).sort((a, b) => b.count - a.count));
    store.setAlbums([...albums.values()].sort((a, b) => a.album.localeCompare(b.album)));
    store.setGenres([...genres].map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count));
  }
  if (favoritesResult.status === 'fulfilled' && Array.isArray(favoritesResult.value)) store.setFavorites(favoritesResult.value);
  if (playlistsResult.status === 'fulfilled' && Array.isArray(playlistsResult.value)) store.setPlaylists(playlistsResult.value);
  if (recentResult.status === 'fulfilled' && Array.isArray(recentResult.value)) store.setRecentlyPlayed(recentResult.value);
  if (statsResult.status === 'fulfilled') store.setStats(statsResult.value);
  return songs;
}
