import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerStore } from '@store/store';
import { usePlayer } from '@context/PlayerContext';
import { GripHorizontal, Maximize2, Minimize2, Music2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { mediaUrl } from '@utils/media';

const COMPACT_WIDTH = 248;
const EXPANDED_WIDTH = 320;
const EDGE = 8;

function clampPosition(position, expanded) {
  const width = Math.min(expanded ? EXPANDED_WIDTH : COMPACT_WIDTH, window.innerWidth - EDGE * 2);
  const height = expanded ? 190 : 108;
  return {
    x: Math.min(Math.max(EDGE, position.x), Math.max(EDGE, window.innerWidth - width - EDGE)),
    y: Math.min(Math.max(EDGE, position.y), Math.max(EDGE, window.innerHeight - height - EDGE)),
  };
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    volume,
    isMuted,
    setMuted,
    playbackPosition,
    playbackDuration,
    miniPlayerOpen,
    setMiniPlayerOpen,
    miniPlayerPosition,
    setMiniPlayerPosition,
  } = usePlayerStore();
  const { seekTo, playNext, playPrevious, setVolume } = usePlayer();
  const [expanded, setExpanded] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const scrubTimeRef = useRef(0);

  const duration = playbackDuration || currentTrack?.duration || 0;
  const currentPos = isScrubbing ? scrubTime : (playbackPosition || 0);

  const handleScrubStart = (e) => {
    setIsScrubbing(true);
    const val = Number(e.target.value);
    setScrubTime(val);
    scrubTimeRef.current = val;
  };

  const handleScrubChange = (e) => {
    const val = Number(e.target.value);
    setScrubTime(val);
    scrubTimeRef.current = val;
  };

  const handleScrubEnd = () => {
    if (isScrubbing) {
      setIsScrubbing(false);
      if (seekTo) seekTo(scrubTimeRef.current);
    }
  };

  const [position, setPosition] = useState(() => miniPlayerPosition || {
    x: Math.max(EDGE, window.innerWidth - COMPACT_WIDTH - 20),
    y: EDGE + 16,
  });
  const positionRef = useRef(position);
  const dragRef = useRef(null);

  const updatePosition = useCallback((nextPosition) => {
    const clamped = clampPosition(nextPosition, expanded);
    positionRef.current = clamped;
    setPosition(clamped);
    return clamped;
  }, [expanded]);

  useEffect(() => {
    const handleResize = () => updatePosition(position);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, updatePosition]);

  useEffect(() => {
    updatePosition(position);
  }, [expanded]); // Re-clamp after the card changes size.

  if (!miniPlayerOpen) return null;

  const handleDragStart = (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, ...position };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event) => {
    if (!dragRef.current) return;
    updatePosition({
      x: dragRef.current.x + event.clientX - dragRef.current.pointerX,
      y: dragRef.current.y + event.clientY - dragRef.current.pointerY,
    });
  };

  const finishDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setMiniPlayerPosition(positionRef.current);
  };

  return createPortal((
    <aside
      aria-label="Floating mini player"
      className="fixed z-[60] min-h-[20px] rounded-2xl border border-border-default bg-bg-secondary/95 p-3 text-text-primary shadow-2xl shadow-black/40 backdrop-blur-xl"
      style={{
        left: position.x,
        top: position.y,
        width: expanded ? 'min(320px, calc(100vw - 16px))' : 'min(248px, calc(100vw - 16px))',
        minWidth: 'min(100px, calc(100vw - 16px))',
      }}
    >
      <div
        className="-mx-1 -mt-1 mb-2 flex h-10 touch-none cursor-grab select-none items-center justify-between rounded-lg px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary hover:bg-bg-tertiary/70 active:cursor-grabbing"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <span className="flex min-w-0 items-center gap-1 sm:gap-1.5">
          <GripHorizontal size={18} />
          <span className="truncate">Mini Player</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Minimize mini player"
            title="Minimize"
            disabled={!expanded}
            onClick={() => setExpanded(false)}
            className="rounded-md p-1.5 hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-40"
          >
            <Minimize2 size={15} />
          </button>
          <button
            type="button"
            aria-label="Maximize mini player"
            title="Maximize"
            disabled={expanded}
            onClick={() => setExpanded(true)}
            className="rounded-md p-1.5 hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-40"
          >
            <Maximize2 size={15} />
          </button>
          <button
            type="button"
            aria-label="Close mini player"
            onClick={() => setMiniPlayerOpen(false)}
            className="rounded-md p-1.5 hover:bg-bg-tertiary hover:text-text-primary"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {currentTrack ? (
        <>
          <div className="flex min-w-0 items-center gap-2">
            {currentTrack.artwork_path ? (
              <img src={mediaUrl(currentTrack.artwork_path)} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-text-secondary">
                <Music2 size={18} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{currentTrack.title || 'Unknown track'}</p>
              <p className="truncate text-[11px] text-text-secondary">{currentTrack.artist || 'Unknown artist'}</p>
              {expanded && <p className="mt-0.5 text-[10px] text-text-secondary">{formatTime(currentPos)} / {formatTime(duration)}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={playPrevious} aria-label="Previous track" className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary">
                <SkipBack size={15} />
              </button>
              <button type="button" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? 'Pause' : 'Play'} className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground hover:bg-accent-hover">
                {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
              </button>
              <button type="button" onClick={playNext} aria-label="Next track" className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary">
                <SkipForward size={15} />
              </button>
            </div>
          </div>

          {expanded && (
            <div className="mt-3 space-y-2">
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.1"
                value={Math.min(currentPos, duration || 0)}
                onMouseDown={handleScrubStart}
                onTouchStart={handleScrubStart}
                onChange={handleScrubChange}
                onMouseUp={handleScrubEnd}
                onTouchEnd={handleScrubEnd}
                onKeyUp={(e) => {
                  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                    if (seekTo) seekTo(Number(e.target.value));
                  }
                }}
                aria-label="Seek through song"
                className="w-full accent-accent"
              />
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setMuted(!isMuted)} aria-label={isMuted ? 'Unmute' : 'Mute'} className="text-text-secondary hover:text-text-primary">
                  {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  aria-label="Volume"
                  className="flex-1 accent-accent"
                />
                <span className="w-8 text-right text-[10px] text-text-secondary">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="py-2 text-xs text-text-secondary">Choose a song to start playing.</p>
      )}
    </aside>
  ), document.body);
}
