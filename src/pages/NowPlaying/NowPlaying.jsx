
import React, { useEffect, useRef, useState } from "react";
import {
    ChevronDown,
    MoreHorizontal,
    Heart,
    Shuffle,
    Repeat,
    SkipBack,
    SkipForward,
    Play,
    Pause,
    Volume2,
    ListMusic,
    Music2,
    Disc3,
    Mic2,
    AudioLines,
} from "lucide-react";

/* ----------------------------------
   Time Formatter
---------------------------------- */
const formatTime = (seconds = 0) => {
    if (!Number.isFinite(seconds)) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${String(secs).padStart(2, "0")}`;
};

/* ----------------------------------
   Real-Time Audio Visualizer
---------------------------------- */
function AudioVisualizer({ analyser, isPlaying }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationId;
        let width = 0;
        let height = 0;

        const barCount = 64;
        const data = analyser
            ? new Uint8Array(analyser.frequencyBinCount)
            : null;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);

            width = rect.width;
            height = rect.height;

            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resizeCanvas();

        const resizeObserver =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(resizeCanvas)
                : null;

        resizeObserver?.observe(canvas);

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            const centerY = height / 2;
            const gap = 3;
            const barWidth = Math.max(
                1,
                (width - gap * (barCount - 1)) / barCount
            );

            if (analyser && data && isPlaying) {
                analyser.getByteFrequencyData(data);
            }

            for (let i = 0; i < barCount; i++) {
                let amplitude = 0;

                if (analyser && data && isPlaying) {
                    // Logarithmic-style frequency distribution
                    const start = Math.floor(
                        Math.pow(i / barCount, 2) * data.length * 0.8
                    );

                    const end = Math.max(
                        start + 1,
                        Math.floor(
                            Math.pow((i + 1) / barCount, 2) *
                            data.length *
                            0.8
                        )
                    );

                    let total = 0;

                    for (let j = start; j < end; j++) {
                        total += data[j] || 0;
                    }

                    amplitude = total / (end - start);
                }

                const normalized = amplitude / 255;

                const barHeight = Math.max(
                    2,
                    normalized * height * 0.88
                );

                const x = i * (barWidth + gap);
                const y = centerY - barHeight / 2;

                const gradient = ctx.createLinearGradient(
                    0,
                    y,
                    0,
                    y + barHeight
                );

                gradient.addColorStop(0, "rgba(255,255,255,0.35)");
                gradient.addColorStop(0.5, "rgba(255,255,255,0.95)");
                gradient.addColorStop(1, "rgba(255,255,255,0.35)");

                ctx.fillStyle = gradient;

                const radius = Math.min(barWidth / 2, 4);

                if (typeof ctx.roundRect === "function") {
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth, barHeight, radius);
                    ctx.fill();
                } else {
                    ctx.fillRect(x, y, barWidth, barHeight);
                }
            }

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            resizeObserver?.disconnect();
        };
    }, [analyser, isPlaying]);

    return (
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {/* Glass reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent pointer-events-none" />

            <div className="relative px-4 pt-4 pb-3">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <AudioLines size={15} className="text-white/80" />
                        <span className="text-[10px] font-semibold tracking-[0.22em] text-white/75 uppercase">
                            Audio Spectrum
                        </span>
                    </div>

                    <span className="text-[9px] tracking-wider text-white/35 uppercase">
                        {analyser ? (isPlaying ? "Live Signal" : "Paused") : "Not Connected"}
                    </span>
                </div>

                <canvas
                    ref={canvasRef}
                    className="w-full h-[76px] block"
                    aria-label="Real-time audio frequency visualizer"
                    role="img"
                />

                {!analyser && (
                    <p className="text-[10px] text-white/35 text-center mt-1">
                        Connect your audio analyser to display live frequencies.
                    </p>
                )}

                <div className="flex justify-between mt-2 text-[9px] tracking-widest text-white/25 uppercase">
                    <span>Low</span>
                    <span>Frequency</span>
                    <span>High</span>
                </div>
            </div>
        </div>
    );
}

/* ----------------------------------
   Now Playing Page
---------------------------------- */
export default function NowPlaying({
    song,
    isPlaying = false,
    currentTime = 0,
    duration = 0,
    volume = 0.8,
    isFavorite = false,
    isShuffle = false,
    repeatMode = "off",
    queue = [],

    // Real AnalyserNode from existing audio engine
    audioAnalyser = null,

    onClose,
    onPlayPause,
    onPrevious,
    onNext,
    onSeek,
    onVolumeChange,
    onToggleFavorite,
    onToggleShuffle,
    onToggleRepeat,
    onPlayQueueItem,
    onOpenQueue,
    onOpenLyrics,
}) {
    const [activeTab, setActiveTab] = useState("upnext");
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubTime, setScrubTime] = useState(0);
    const scrubTimeRef = useRef(0);

    const activeCurrentTime = isScrubbing ? scrubTime : currentTime;

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
            onSeek?.(scrubTimeRef.current);
        }
    };

    if (!song) {
        return (
            <main className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center gap-4">
                <Music2 size={56} className="text-text-secondary" />

                <h2 className="text-xl font-semibold">
                    Nothing Playing
                </h2>

                <p className="text-sm text-text-secondary">
                    Choose a song from your music library.
                </p>

                <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary/70 transition font-semibold"
                >
                    Back to Library
                </button>
            </main>
        );
    }

    const progress =
        duration > 0
            ? Math.min((activeCurrentTime / duration) * 100, 100)
            : 0;

    return (
        <main className="min-h-screen bg-bg-primary text-text-primary overflow-y-auto">
            <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-6">

                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <button
                        onClick={onClose}
                        aria-label="Close now playing"
                        className="p-3 rounded-full bg-bg-tertiary hover:bg-white/10 transition"
                    >
                        <ChevronDown size={22} />
                    </button>

                    <div className="text-center">
                        <p className="text-xs tracking-[0.25em] font-semibold">
                            NOW PLAYING
                        </p>

                        <p className="text-xs text-text-secondary mt-1">
                            Playing from your library
                        </p>
                    </div>

                    <button
                        aria-label="More options"
                        className="p-3 rounded-full bg-bg-tertiary hover:bg-white/10 transition"
                    >
                        <MoreHorizontal size={22} />
                    </button>
                </header>

                {/* Main Layout */}
                <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-center">

                    {/* Left: Artwork and Visualizer */}
                    <div className="w-full max-w-[480px] mx-auto flex flex-col gap-5">

                        {/* Album Artwork */}
                        <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-bg-tertiary border border-white/[0.08] shadow-2xl shadow-black/30">

                            {song.artwork ? (
                                <img
                                    src={song.artwork}
                                    alt={`${song.title || "Track"} album artwork`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Disc3
                                        size={120}
                                        className="text-text-secondary opacity-50"
                                    />
                                </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/[0.04] pointer-events-none" />
                        </div>

                        {/* Album Info */}
                        <div className="flex items-center justify-center gap-2 text-xs text-text-secondary">
                            <Disc3 size={15} />
                            <span>{song.album || "Unknown Album"}</span>
                        </div>

                        {/* Audio Visualizer */}
                        <AudioVisualizer
                            analyser={audioAnalyser}
                            isPlaying={isPlaying}
                        />
                    </div>

                    {/* Right: Player Controls */}
                    <div className="w-full max-w-[540px] mx-auto">

                        {/* Song Information */}
                        <div className="flex justify-between items-start gap-4 mb-8">
                            <div className="min-w-0">
                                <h1 className="text-3xl md:text-2xl font-bold tracking-tight truncate">
                                    {song.title || "Unknown Track"}
                                </h1>

                                <p className="text-text-secondary text-lg mt-2 truncate">
                                    {song.artist || "Unknown Artist"}
                                </p>
                            </div>

                            <button
                                onClick={onToggleFavorite}
                                aria-label="Toggle favorite"
                                className="p-3 rounded-full hover:bg-bg-tertiary transition"
                            >
                                <Heart
                                    size={25}
                                    className={
                                        isFavorite
                                            ? "fill-white text-white"
                                            : "text-text-secondary"
                                    }
                                />
                            </button>
                        </div>

                        {/* Progress */}
                        <div className="mb-7">
                            <input
                                type="range"
                                min="0"
                                max={duration || 1}
                                step="0.1"
                                value={Math.min(activeCurrentTime, duration || 0)}
                                onMouseDown={handleScrubStart}
                                onTouchStart={handleScrubStart}
                                onChange={handleScrubChange}
                                onMouseUp={handleScrubEnd}
                                onTouchEnd={handleScrubEnd}
                                onKeyUp={(e) => {
                                    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                                        onSeek?.(Number(e.target.value));
                                    }
                                }}
                                aria-label="Seek through song"
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-white"
                                style={{
                                    background: `linear-gradient(to right, rgba(255,255,255,0.95) ${progress}%, rgba(255,255,255,0.12) ${progress}%)`,
                                }}
                            />

                            <div className="flex justify-between text-xs text-text-secondary mt-2">
                                <span>{formatTime(activeCurrentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Playback Controls */}
                        <div className="flex items-center justify-between mb-8">
                            <button
                                onClick={onToggleShuffle}
                                aria-label="Toggle shuffle"
                                className={`p-2 transition ${isShuffle
                                    ? "text-text-primary"
                                    : "text-text-secondary hover:text-text-primary"
                                    }`}
                            >
                                <Shuffle size={21} />
                            </button>

                            <button
                                onClick={onPrevious}
                                aria-label="Previous track"
                                className="text-text-secondary hover:text-text-primary transition"
                            >
                                <SkipBack size={29} />
                            </button>

                            <button
                                onClick={onPlayPause}
                                aria-label={isPlaying ? "Pause" : "Play"}
                                className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg shadow-white/10"
                            >
                                {isPlaying ? (
                                    <Pause size={30} fill="currentColor" />
                                ) : (
                                    <Play
                                        size={30}
                                        fill="currentColor"
                                        className="ml-1"
                                    />
                                )}
                            </button>

                            <button
                                onClick={onNext}
                                aria-label="Next track"
                                className="text-text-secondary hover:text-text-primary transition"
                            >
                                <SkipForward size={29} />
                            </button>

                            <button
                                onClick={onToggleRepeat}
                                aria-label="Change repeat mode"
                                className={`p-2 transition relative ${repeatMode !== "off"
                                    ? "text-text-primary"
                                    : "text-text-secondary hover:text-text-primary"
                                    }`}
                            >
                                <Repeat size={21} />

                                {repeatMode === "one" && (
                                    <span className="absolute -top-1 -right-1 text-[9px] font-bold">
                                        1
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Volume */}
                        <div className="flex items-center gap-4 mb-9">
                            <Volume2
                                size={20}
                                className="text-text-secondary shrink-0"
                            />

                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) =>
                                    onVolumeChange?.(Number(e.target.value))
                                }
                                aria-label="Volume"
                                className="w-full accent-white cursor-pointer"
                            />

                            <span className="text-xs text-text-secondary w-9 text-right">
                                {Math.round(volume * 100)}%
                            </span>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-border-default flex gap-6 mb-5">
                            <button
                                onClick={() => setActiveTab("upnext")}
                                className={`pb-3 text-sm font-medium transition ${activeTab === "upnext"
                                    ? "text-text-primary border-b-2 border-white"
                                    : "text-text-secondary hover:text-text-primary"
                                    }`}
                            >
                                Up Next
                            </button>

                            <button
                                onClick={() => setActiveTab("lyrics")}
                                className={`pb-3 text-sm font-medium transition ${activeTab === "lyrics"
                                    ? "text-text-primary border-b-2 border-white"
                                    : "text-text-secondary hover:text-text-primary"
                                    }`}
                            >
                                Lyrics
                            </button>
                        </div>

                        {/* Queue */}
                        {activeTab === "upnext" && (
                            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
                                {queue.length === 0 ? (
                                    <p className="text-sm text-text-secondary py-5">
                                        No upcoming tracks in the queue.
                                    </p>
                                ) : (
                                    queue.map((item, index) => (
                                        <button
                                            key={item.id ?? item._id ?? index}
                                            onClick={() =>
                                                onPlayQueueItem?.(item, index)
                                            }
                                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-bg-tertiary text-left transition"
                                        >
                                            {item.artwork ? (
                                                <img
                                                    src={item.artwork}
                                                    alt=""
                                                    className="w-11 h-11 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="w-11 h-11 rounded-lg bg-bg-tertiary flex items-center justify-center">
                                                    <Music2
                                                        size={18}
                                                        className="text-text-secondary"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {item.title || "Unknown Track"}
                                                </p>

                                                <p className="text-xs text-text-secondary truncate">
                                                    {item.artist || "Unknown Artist"}
                                                </p>
                                            </div>

                                            <span className="text-xs text-text-secondary">
                                                {formatTime(item.duration)}
                                            </span>
                                        </button>
                                    ))
                                )}

                                <button
                                    onClick={onOpenQueue}
                                    className="text-xs text-text-secondary hover:text-text-primary pt-2"
                                >
                                    Manage playback queue →
                                </button>
                            </div>
                        )}

                        {/* Lyrics */}
                        {activeTab === "lyrics" && (
                            <div className="min-h-[150px] flex flex-col items-center justify-center gap-3 text-center">
                                <Mic2
                                    size={30}
                                    className="text-text-secondary"
                                />

                                <p className="text-sm text-text-secondary">
                                    View lyrics for this track
                                </p>

                                <button
                                    onClick={onOpenLyrics}
                                    className="text-sm text-text-primary hover:opacity-70"
                                >
                                    Open Lyrics →
                                </button>
                            </div>
                        )}

                        {/* Bottom Actions */}
                        <div className="flex justify-between items-center mt-7 pt-5 border-t border-border-default">
                            <button
                                onClick={onOpenQueue}
                                className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary"
                            >
                                <ListMusic size={17} />
                                Queue
                            </button>

                            <span className="text-xs text-text-secondary">
                                {song.format?.toUpperCase() || "LOCAL AUDIO"}
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
