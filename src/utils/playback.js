import { usePlayerStore } from '@store/store';

export function playTrackList(tracks, track = tracks?.[0]) {
  if (!Array.isArray(tracks) || tracks.length === 0 || !track) return;
  const player = usePlayerStore.getState();
  const index = tracks.findIndex((item) => item.id === track.id);
  player.setQueue(tracks);
  player.setCurrentTrack(track, Math.max(index, 0));
  player.setIsPlaying(true);
}
