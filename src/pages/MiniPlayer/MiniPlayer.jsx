import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '@store/store';
import { usePlayer } from '@context/PlayerContext';
import { useIPC } from '@context/IPCContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, Music } from 'lucide-react';
import { mediaUrl } from '@utils/media';

export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    isMuted,
    setMuted,
    playbackPosition,
    playbackDuration,
  } = usePlayerStore();

  const { seekTo, playNext, playPrevious } = usePlayer() || {};
  const { toggle, close, isOpen } = useIPC() || {};

  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const dragValueRef = useRef(0);

  const duration = playbackDuration || currentTrack?.duration || 0;
  const currentPos = isDragging ? dragValue : (playbackPosition || 0);

  useEffect(() => {
    (async () => {
      if (isOpen) {
        const open = await isOpen();
        setIsPlayerOpen(open);
      } else {
        setIsPlayerOpen(true);
      }
    })();
  }, [isOpen]);

  if (!isPlayerOpen) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="p-8 text-text-secondary text-center">
          <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-text-primary">Mini player is not open</p>
          <button
            onClick={toggle}
            className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover transition-colors"
          >
            Open Mini Player
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
    <div className="min-h-screen bg-transparent p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-bg-secondary border border-border-default rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Now Playing</span>
          <button
            onClick={close}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {currentTrack ? (
          <>
            <div className="flex items-center gap-4 mb-4">
              <img
                src={currentTrack.artwork_path ? mediaUrl(currentTrack.artwork_path) : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23262931%22/%3E%3Ctext x=%2250%25%22 y=%2258%25%22 text-anchor=%22middle%22 font-size=%2250%22%3E%E2%99%AB%3C/text%3E%3C/svg%3E'}
                alt={currentTrack.title}
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary truncate">{currentTrack.title}</p>
                <p className="text-sm text-text-secondary truncate">{currentTrack.artist}</p>
                <p className="text-xs text-text-secondary">
                  {formatTime(currentPos)} / {formatTime(duration)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={playPrevious} className="p-2 text-text-secondary hover:text-text-primary">
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 bg-accent hover:bg-accent-hover rounded-full flex items-center justify-center text-accent-foreground transition-all active:scale-95"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <button onClick={playNext} className="p-2 text-text-secondary hover:text-text-primary">
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMuted(!isMuted)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.1"
                value={Math.min(currentPos, duration || 0)}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                onKeyUp={(e) => {
                  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                    if (seekTo) seekTo(parseFloat(e.target.value));
                  }
                }}
                aria-label="Seek through song"
                className="w-full h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-text-secondary">
            <Music className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No track selected</p>
          </div>
        )}
      </div>
    </div>
  );
}
