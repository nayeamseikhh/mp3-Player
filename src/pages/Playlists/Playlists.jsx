import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLibraryStore } from '@store/store';
import { useIpc } from '@context/IPCContext';
import Card from '@components/common/Card';
import EmptyState from '@components/common/EmptyState';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import SmartPlaylistForm from '@components/playlists/SmartPlaylistForm';
import { Music, Library, Plus, PlayCircle, Pencil, XCircle, List, Trash2, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { playTrackList } from '@utils/playback';
import { refreshLibraryData } from '@utils/library';
import { mediaUrl } from '@utils/media';

export default function Playlists() {
  const { playlists = [], songs = [], setPlaylists } = useLibraryStore();
  const { invoke } = useIpc();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [smartCreateOpen, setSmartCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [renamePlaylist, setRenamePlaylist] = useState(null);
  const [deletePlaylist, setDeletePlaylist] = useState(null);
  const [addPlaylistId, setAddPlaylistId] = useState(null);
  const [selectedSongIds, setSelectedSongIds] = useState([]);
  const [viewPlaylist, setViewPlaylist] = useState(null);
  const [viewSongs, setViewSongs] = useState([]);
  const [reorderPlaylistId, setReorderPlaylistId] = useState(null);
  const [reorderSongs, setReorderSongs] = useState([]);
  const [busy, setBusy] = useState(false);

  // Smart playlists section
  const [smartPlaylists, setSmartPlaylists] = useState([]);

  const reloadPlaylists = useCallback(async () => {
    const data = await invoke('mymusicplayer:playlist:getAll');
    if (Array.isArray(data)) setPlaylists(data);
  }, [invoke, setPlaylists]);

  useEffect(() => {
    reloadPlaylists().catch((error) => toast.error(`Could not load playlists: ${error.message}`));
  }, [reloadPlaylists]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
      return;
    }
    const playlistId = searchParams.get('playlistId');
    if (!playlistId || playlists.length === 0) return;
    const playlist = playlists.find((item) => String(item.id) === playlistId);
    if (!playlist) return;
    invoke('mymusicplayer:playlist:getSongs', playlist.id)
      .then((tracks) => {
        setViewSongs(Array.isArray(tracks) ? tracks : []);
        setViewPlaylist(playlist);
        setSearchParams({}, { replace: true });
      })
      .catch((error) => toast.error(`Could not load playlist: ${error.message}`));
  }, [searchParams, setSearchParams, playlists, invoke]);

  const runAction = async (action, successMessage) => {
    setBusy(true);
    try {
      await action();
      await reloadPlaylists();
      await refreshLibraryData();
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(error.message || 'The playlist action failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const playlistName = name.trim();
    if (!playlistName) return;
    if (await runAction(() => invoke('mymusicplayer:playlist:create', { name: playlistName }), 'Playlist created')) {
      setName('');
      setCreateOpen(false);
    }
  };

  const createSmartPlaylist = async (type, playlistName) => {
    const typeInfo = { recentlyPlayed: 'Recently Played', recentlyAdded: 'Recently Added', mostPlayed: 'Most Played', favorites: 'Favorites', topArtists: 'Top Artists', allSongs: 'All Songs' };
    const finalName = playlistName.trim() || typeInfo[type] || 'Smart Playlist';
    const ok = await runAction(() => invoke('mymusicplayer:playlist:create', { name: finalName, smartType: type }), 'Smart playlist created');
    if (ok) {
      setSmartPlaylists((prev) => [...prev, { id: null, name: finalName, smartType: type, isSmart: true }]);
    }
  };

  const rename = async () => {
    const playlistName = renamePlaylist?.name.trim();
    if (!playlistName || !renamePlaylist) return;
    if (await runAction(() => invoke('mymusicplayer:playlist:update', renamePlaylist.id, { name: playlistName }), 'Playlist renamed')) {
      setRenamePlaylist(null);
    }
  };

  const removePlaylist = async () => {
    if (!deletePlaylist) return;
    if (await runAction(() => invoke('mymusicplayer:playlist:delete', deletePlaylist.id), 'Playlist deleted')) {
      setDeletePlaylist(null);
    }
  };

  const loadPlaylistSongs = async (playlistId) => {
    const data = await invoke('mymusicplayer:playlist:getSongs', playlistId);
    return Array.isArray(data) ? data : [];
  };

  const playPlaylist = async (playlistId) => {
    try {
      const tracks = await loadPlaylistSongs(playlistId);
      if (!tracks.length) return toast.error('This playlist has no available tracks yet.');
      playTrackList(tracks);
    } catch (error) {
      toast.error(`Could not play playlist: ${error.message}`);
    }
  };

  const openAddSongs = async (playlistId) => {
    try {
      const current = await loadPlaylistSongs(playlistId);
      setSelectedSongIds(current.map((song) => song.id));
      setAddPlaylistId(playlistId);
    } catch (error) {
      toast.error(`Could not load playlist tracks: ${error.message}`);
    }
  };

  const addSongs = async () => {
    if (addPlaylistId == null) return;
    const existing = new Set((await loadPlaylistSongs(addPlaylistId)).map((song) => song.id));
    const idsToAdd = selectedSongIds.filter((id) => !existing.has(id));
    const ok = await runAction(async () => {
      for (const id of idsToAdd) await invoke('mymusicplayer:playlist:addSong', addPlaylistId, id);
    }, 'Playlist updated');
    if (ok) setAddPlaylistId(null);
  };

  const showTracks = async (playlist) => {
    try {
      setViewSongs(await loadPlaylistSongs(playlist.id));
      setViewPlaylist(playlist);
    } catch (error) {
      toast.error(`Could not load playlist tracks: ${error.message}`);
    }
  };

  const removeTrack = async (songId) => {
    const ok = await runAction(
      () => invoke('mymusicplayer:playlist:removeSong', viewPlaylist.id, songId),
      'Track removed from playlist',
    );
    if (ok) setViewSongs((tracks) => tracks.filter((track) => track.id !== songId));
  };

  const openReorder = async (playlistId) => {
    try {
      setReorderSongs(await loadPlaylistSongs(playlistId));
      setReorderPlaylistId(playlistId);
    } catch (error) {
      toast.error(`Could not load playlist order: ${error.message}`);
    }
  };

  const moveSong = (index, offset) => {
    const target = index + offset;
    if (target < 0 || target >= reorderSongs.length) return;
    setReorderSongs((songsInOrder) => {
      const next = [...songsInOrder];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveOrder = async () => {
    if (reorderPlaylistId == null) return;
    const order = reorderSongs.map((song, position) => ({ songId: song.id, position }));
    if (await runAction(() => invoke('mymusicplayer:playlist:reorder', reorderPlaylistId, order), 'Playlist order saved')) {
      setReorderPlaylistId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-text-primary sm:text-3xl">Playlists</h2>
          <p className="text-text-secondary">Create playlists, manage tracks, and play them in order.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setSmartCreateOpen(true)} icon={<Sparkles className="h-4 w-4" />}>Smart Playlist</Button>
          <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>Create Playlist</Button>
        </div>
      </div>

      {playlists.length === 0 ? (
        <EmptyState icon={Library} title="No playlists yet" subtitle="Create your first playlist to organize your music." action={<Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>Create Playlist</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="relative">
              <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-accent/10">
                {playlist.cover_path ? <img src={mediaUrl(playlist.cover_path)} alt="" className="h-full w-full object-cover" /> : <Music className="h-12 w-12 text-accent" />}
              </div>
              <div className="mb-4 min-w-0 flex items-start justify-between">
                <div className="flex items-center gap-1">
                  {playlist.smartType && (
                    <span className="px-2 py-0.5 rounded bg-accent/20 text-accent text-xs font-medium">
                      {playlist.smartType.charAt(0).toUpperCase() + playlist.smartType.slice(1)} Smart
                    </span>
                  )}
                  <p className="truncate font-medium text-text-primary">{playlist.name}</p>
                </div>
                <p className="text-xs text-text-secondary">{playlist.song_count || 0} tracks · {formatDuration(playlist.total_duration)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="small" onClick={() => playPlaylist(playlist.id)} icon={<PlayCircle className="h-4 w-4" />}>Play</Button>
                <Button size="small" variant="secondary" onClick={() => showTracks(playlist)}>Tracks</Button>
                <Button size="small" variant="secondary" onClick={() => openAddSongs(playlist.id)} icon={<Plus className="h-4 w-4" />}>Add</Button>
                <Button size="small" variant="ghost" aria-label={`Rename ${playlist.name}`} onClick={() => setRenamePlaylist({ id: playlist.id, name: playlist.name })}><Pencil className="h-4 w-4" /></Button>
                <Button size="small" variant="ghost" aria-label={`Delete ${playlist.name}`} onClick={() => setDeletePlaylist(playlist)}><XCircle className="h-4 w-4" /></Button>
                <Button size="small" variant="ghost" aria-label={`Reorder ${playlist.name}`} onClick={() => openReorder(playlist.id)}><List className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Playlist">
        <div className="space-y-4"><Input label="Playlist name" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && create()} autoFocus />
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={busy || !name.trim()} onClick={create}>Create</Button></div>
        </div>
      </Modal>

      <SmartPlaylistForm
        isOpen={smartCreateOpen}
        onClose={() => setSmartCreateOpen(false)}
        onCreate={async (type, playlistName) => {
          const ok = await runAction(() => invoke('mymusicplayer:playlist:create', { name: playlistName, smartType: type }), 'Smart playlist created');
          if (ok) setSmartCreateOpen(false);
        }}
      />

      <Modal isOpen={Boolean(renamePlaylist)} onClose={() => setRenamePlaylist(null)} title="Rename Playlist">
        <div className="space-y-4"><Input label="Playlist name" value={renamePlaylist?.name || ''} onChange={(event) => setRenamePlaylist((playlist) => ({ ...playlist, name: event.target.value }))} onKeyDown={(event) => event.key === 'Enter' && rename()} autoFocus />
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRenamePlaylist(null)}>Cancel</Button><Button disabled={busy || !renamePlaylist?.name.trim()} onClick={rename}>Save</Button></div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(deletePlaylist)} onClose={() => setDeletePlaylist(null)} title="Delete Playlist">
        <p className="mb-5 text-text-secondary">Delete “{deletePlaylist?.name}”? This removes the playlist but keeps its music in your library.</p>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeletePlaylist(null)}>Cancel</Button><Button variant="danger" disabled={busy} onClick={removePlaylist} icon={<Trash2 className="h-4 w-4" />}>Delete</Button></div>
      </Modal>

      <Modal isOpen={addPlaylistId != null} onClose={() => setAddPlaylistId(null)} title="Choose Playlist Tracks">
        <div className="mb-4 max-h-96 space-y-2 overflow-y-auto">
          {songs.length ? songs.map((song) => <label key={song.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-bg-secondary"><input type="checkbox" checked={selectedSongIds.includes(song.id)} onChange={(event) => setSelectedSongIds((ids) => event.target.checked ? [...ids, song.id] : ids.filter((id) => id !== song.id))} /><span className="min-w-0 flex-1 truncate text-text-primary">{song.title}</span><span className="max-w-40 truncate text-sm text-text-secondary">{song.artist}</span></label>) : <EmptyState icon={Music} title="Your library is empty" subtitle="Import tracks before adding them to a playlist." />}
        </div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAddPlaylistId(null)}>Cancel</Button><Button disabled={busy || !songs.length} onClick={addSongs}>Save Tracks</Button></div>
      </Modal>

      <Modal isOpen={Boolean(viewPlaylist)} onClose={() => setViewPlaylist(null)} title={viewPlaylist?.name || 'Playlist Tracks'}>
        <div className="space-y-2">
          {viewSongs.length ? viewSongs.map((song, index) => <div key={song.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-bg-secondary"><button className="min-w-0 flex-1 text-left" onClick={() => playTrackList(viewSongs, song)}><span className="block truncate text-text-primary">{index + 1}. {song.title}</span><span className="block truncate text-sm text-text-secondary">{song.artist}</span></button><Button size="tiny" variant="ghost" aria-label={`Remove ${song.title}`} onClick={() => removeTrack(song.id)}><Trash2 className="h-4 w-4" /></Button></div>) : <EmptyState icon={Music} title="No tracks in this playlist" subtitle="Use Add to choose music from your library." />}
        </div>
      </Modal>

      <Modal isOpen={reorderPlaylistId != null} onClose={() => setReorderPlaylistId(null)} title="Reorder Playlist">
        <div className="mb-4 max-h-96 space-y-2 overflow-y-auto">
          {reorderSongs.length ? reorderSongs.map((song, index) => <div key={song.id} className="flex items-center gap-3 rounded-lg p-2"><span className="min-w-0 flex-1 truncate text-text-primary">{index + 1}. {song.title}</span><Button size="tiny" variant="ghost" disabled={index === 0} aria-label="Move up" onClick={() => moveSong(index, -1)}><ArrowUp className="h-4 w-4" /></Button><Button size="tiny" variant="ghost" disabled={index === reorderSongs.length - 1} aria-label="Move down" onClick={() => moveSong(index, 1)}><ArrowDown className="h-4 w-4" /></Button></div>) : <p className="text-text-secondary">Add tracks before reordering this playlist.</p>}
        </div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setReorderPlaylistId(null)}>Cancel</Button><Button disabled={busy || !reorderSongs.length} onClick={saveOrder}>Save Order</Button></div>
      </Modal>
    </div>
  );
}

function formatDuration(seconds = 0) {
  const safeSeconds = Number(seconds) || 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.floor(safeSeconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}
