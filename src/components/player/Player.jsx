import { useContext, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Slider, Tooltip, Badge, Button } from '@components/common';
import { PlayerContext } from '@context/PlayerContext';
import { usePlayerStore } from '@store/store';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { mediaUrl } from '@utils/media';

const Player = () => {
  const navigate = useNavigate();
  const { loadTrack, seekTo, playNext, playPrevious, stopTrack, playTrack, pauseTrack } = useContext(PlayerContext) || {};
  const {
    currentTrack,
    miniPlayerOpen,
    setMiniPlayerOpen,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    playbackPosition,
    playbackDuration,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    speed,
    setSpeed,
    equalizerBands,
    setEqualizerBands,
    bassBoost,
    setBassBoost,
    trebleBoost,
    setTrebleBoost,
    balance,
    setBalance,
    queue,
    setQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    setPlaybackPosition,
  } = usePlayerStore();

  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const dragValueRef = useRef(0);

  const duration = playbackDuration || currentTrack?.duration || 0;
  const currentPosition = isDragging ? dragValue : (playbackPosition || 0);
  const progressPercent = duration > 0 ? Math.min((currentPosition / duration) * 100, 100) : 0;

  const isMuted = volume === 0;

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (value) => {
    setVolume(value);
  };

  const handleSeekStart = (e) => {
    setIsDragging(true);
    const val = parseFloat(e.target.value);
    setDragValue(val);
    dragValueRef.current = val;
  };

  const handleSeekChange = (e) => {
    const val = parseFloat(e.target.value);
    setDragValue(val);
    dragValueRef.current = val;
  };

  const handleSeekEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      if (seekTo) seekTo(dragValueRef.current);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border-default py-2 sm:py-3 z-50">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 sm:gap-x-3 sm:px-4 lg:grid-cols-[minmax(160px,1fr)_minmax(120px,1.3fr)_auto_auto] lg:gap-y-2">

        {/* Album Artwork */}
        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:gap-3">
          {currentTrack && (
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-bg-tertiary rounded-lg flex items-center justify-center flex-shrink-0">
              {currentTrack.artwork_path ? (
                <img
                  src={mediaUrl(currentTrack.artwork_path)}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-8 h-8 text-text-secondary flex items-center justify-center">🎵</div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => currentTrack && navigate('/now-playing')}
            disabled={!currentTrack}
            aria-label={currentTrack ? `Open now playing: ${currentTrack.title}` : 'Nothing is playing'}
            className="flex-1 min-w-0 text-left disabled:cursor-default"
          >
            <div className="flex flex-col text-xs sm:text-sm text-text-secondary mb-1 min-w-0">
              <span className="truncate">{currentTrack?.title || ''}</span>
              <span className="truncate">{currentTrack?.artist || ''}</span>
            </div>
            <div className="flex min-w-0 justify-between gap-2 text-xs text-text-secondary">
              <span className="truncate">{currentTrack?.album || ''}</span>
              <span className="shrink-0">{currentTrack?.format || ''}</span>
            </div>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="col-span-2 col-start-1 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mx-3">
          {currentTrack && !loading && (
            <>
              <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                <span>{formatTime(currentPosition)}</span>
                <span className="text-[11px] text-text-secondary opacity-75">
                  {duration > 0 ? `-${formatTime(Math.max(0, duration - currentPosition))}` : ''}
                </span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 1}
                step={0.1}
                value={Math.min(currentPosition, duration || 1)}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                onKeyUp={(e) => {
                  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                    const val = parseFloat(e.target.value);
                    if (seekTo) seekTo(val);
                  }
                }}
                aria-label="Seek track position"
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-accent"
                style={{
                  background: `linear-gradient(to right, #FF8A32 ${progressPercent}%, #262931 ${progressPercent}%)`,
                }}
              />
            </>
          )}
        </div>

        {/* Controls */}
        <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-0.5 sm:gap-1 lg:col-start-3 lg:gap-2">
          <Button
            variant={isPlaying ? 'ghost' : 'primary'}
            size="small"
            onClick={handlePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-text-primary" />
            ) : (
              <Play className="w-5 h-5 text-text-primary" />
            )}
          </Button>

          <Button variant="ghost" size="small" onClick={playPrevious} aria-label="Previous track">
            <SkipBack className="w-5 h-5 text-text-secondary" />
          </Button>

          <Button variant="ghost" size="small" onClick={playNext} aria-label="Next track">
            <SkipForward className="w-5 h-5 text-text-secondary" />
          </Button>

          <Button
            variant={miniPlayerOpen ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setMiniPlayerOpen(!miniPlayerOpen)}
            title={miniPlayerOpen ? 'Hide Mini Player' : 'Show Mini Player'}
            aria-label={miniPlayerOpen ? 'Hide Mini Player' : 'Show Mini Player'}
            aria-pressed={miniPlayerOpen}
          >
            ⛶
          </Button>

          <div className="hidden sm:flex items-center gap-1 text-xs text-text-secondary">
            <span>{formatTime(currentPosition)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Volume */}
          <div className="relative hidden sm:block w-20 lg:w-24">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(volume * 100)}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value) / 100)}
              className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
            />
            <Button
              variant="ghost"
              size="small"
              className="absolute right-0 top-1/2 -translate-y-1/2"
              onClick={() => setVolume(isMuted ? 0.7 : 0)}
              aria-label="Mute"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-text-secondary" />
              ) : (
                <Volume2 className="w-5 h-5 text-text-secondary" />
              )}
            </Button>
          </div>
        </div>

        {/* Equalizer shortcut */}
        <div className="hidden items-center gap-2 text-xs text-text-secondary lg:col-start-4 lg:row-start-1 lg:flex">
          {equalizerBands && equalizerBands.length === 10 && (
            <Button variant="ghost" size="tiny" onClick={() => window.electronAPI?.invoke?.('mymusicplayer:dashboard:saveWidget', { widgetId: 'equalizer', config: { bands: equalizerBands } })} title="EQ">
              📊
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Player;
