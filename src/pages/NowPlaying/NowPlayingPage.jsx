import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePlayer } from '@context/PlayerContext';
import { useLibraryStore, usePlayerStore } from '@store/store';
import { refreshLibraryData } from '@utils/library';
import { mediaUrl } from '@utils/media';
import NowPlaying from './NowPlaying';

const presentTrack = (track) => track ? {
  ...track,
  artwork: mediaUrl(track.artwork_path),
} : null;

export default function NowPlayingPage() {
  const navigate = useNavigate();
  const { audioAnalyser, playNext, playPrevious, seekTo, setVolume } = usePlayer();
  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    volume,
    playbackPosition,
    playbackDuration,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    queue,
    setCurrentTrack,
  } = usePlayerStore();
  const favorites = useLibraryStore((state) => state.favorites);

  const song = useMemo(() => presentTrack(currentTrack), [currentTrack]);
  const visibleQueue = useMemo(() => queue.map(presentTrack), [queue]);
  const isFavorite = Boolean(currentTrack && favorites.some((item) => item?.id === currentTrack.id));

  const toggleFavorite = async () => {
    if (!currentTrack?.id) return;
    try {
      await window.electronAPI.invoke('mymusicplayer:favorite:toggle', currentTrack.id);
      await refreshLibraryData();
    } catch (error) {
      toast.error(`Could not update favorite: ${error.message}`);
    }
  };

  return (
    <NowPlaying
      song={song}
      isPlaying={isPlaying}
      currentTime={playbackPosition}
      duration={playbackDuration || currentTrack?.duration || 0}
      volume={volume}
      audioAnalyser={audioAnalyser}
      isFavorite={isFavorite}
      isShuffle={shuffle}
      repeatMode={repeat}
      queue={visibleQueue}
      onClose={() => navigate(-1)}
      onPlayPause={() => setIsPlaying(!isPlaying)}
      onPrevious={playPrevious}
      onNext={playNext}
      onSeek={seekTo}
      onVolumeChange={setVolume}
      onToggleFavorite={toggleFavorite}
      onToggleShuffle={() => setShuffle(!shuffle)}
      onToggleRepeat={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
      onPlayQueueItem={(track, index) => {
        setCurrentTrack(track, index);
        setIsPlaying(true);
      }}
      onOpenLyrics={() => navigate('/lyrics')}
    />
  );
}
