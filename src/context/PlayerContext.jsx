import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { usePlayerStore, useSettingsStore, useLibraryStore } from '@store/store';

export const PlayerContext = createContext(null);

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [audioAnalyser, setAudioAnalyser] = useState(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const pannerRef = useRef(null);
  const analyserRef = useRef(null);
  const audioElementRef = useRef(null);
  const eqFiltersRef = useRef([]);
  const positionIntervalRef = useRef(null);
  const isSeekingRef = useRef(false);
  const sleepTimerRef = useRef(null);

  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    setIsLoading,
    setPlaybackPosition,
    setPlaybackDuration,
    volume,
    setVolume,
    setMuted,
    isMuted,
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
    playNext,
    playPrevious,
    queue,
    currentTrackIndex,
    setCurrentTrack,
  } = usePlayerStore();
  const crossfadeEnabled = usePlayerStore((state) => state.crossfadeEnabled ?? false);
  const crossfadeDuration = usePlayerStore((state) => state.crossfadeDuration ?? 5000);
  const sleepTimerMinutes = useSettingsStore((state) => state.sleepTimerMinutes);

  // Initialize Web Audio API context with EQ chain
  const initAudioContext = useCallback(async () => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const element = audioElementRef.current;
      if (!element) return null;

      const source = ctx.createMediaElementSource(element);
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      const panner = ctx.createStereoPanner();

      // EQ filter chain: source -> filter[0] -> ... -> filter[9] -> gain -> analyser -> destination
      const filters = [];
      const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      for (let i = 0; i < 10; i++) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(frequencies[i], ctx.currentTime);
        filter.Q.setValueAtTime(1, ctx.currentTime);
        filter.gain.setValueAtTime(0, ctx.currentTime);
        filters.push(filter);
      }

      source.connect(filters[0]);
      for (let i = 0; i < 9; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[9].connect(gain);
      gain.connect(panner);
      panner.connect(analyser);
      analyser.connect(ctx.destination);

      sourceRef.current = source;
      gainRef.current = gain;
      pannerRef.current = panner;
      analyserRef.current = analyser;
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      setAudioAnalyser(analyser);
      eqFiltersRef.current = filters;
      // Web Audio owns output gain once the element is connected; avoid applying
      // the volume twice through both HTMLMediaElement and GainNode.
      element.volume = 1;

      // Apply initial EQ settings
      applyEQSettings();

      return ctx;
    } catch (error) {
      console.error('Failed to initialize Web Audio API:', error);
      return null;
    }
  }, []);

  const applyEQSettings = useCallback(() => {
    if (!audioContextRef.current) return;

    // Apply bass/treble boost as pre/post gain
    const bassTrebleGain = 1 + (bassBoost + trebleBoost) / 200;
    if (gainRef.current) {
      gainRef.current.gain.setValueAtTime(bassTrebleGain * volume, audioContextRef.current.currentTime);
    }
    if (pannerRef.current) {
      pannerRef.current.pan.setValueAtTime(balance, audioContextRef.current.currentTime);
    }

    // Apply individual EQ bands
    eqFiltersRef.current.forEach((filter, i) => {
      filter.gain.setValueAtTime(equalizerBands[i], audioContextRef.current.currentTime);
    });
  }, [volume, bassBoost, trebleBoost, equalizerBands, balance]);

  const applyCrossfade = useCallback((nextTrack, currentElement, nextElement) => {
    if (!crossfadeEnabled || !audioContextRef.current) return 0;

    try {
      // Create gain nodes for crossfade
      const fromGain = audioContextRef.current.createGain();
      const toGain = audioContextRef.current.createGain();

      // Set fade duration
      const fadeTime = crossfadeDuration / 1000; // convert ms to seconds

      // Start current track fading out
      if (currentElement && currentElement !== nextElement) {
        currentElement.transitionEnded = false;
        fromGain.gain.setValueAtTime(1, audioContextRef.current.currentTime);
        fromGain.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + fadeTime);
        currentElement.volume = 1; // Reset to max for fade
      }

      // Start next track fading in (if different track)
      if (nextElement && nextElement !== currentElement) {
        // Connect next element to analyser through crossfade chain
        nextElement.volume = 0; // Start at 0
        toGain.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        toGain.gain.linearRampToValueAtTime(1, audioContextRef.current.currentTime + fadeTime);
      }

      return fadeTime;
    } catch (error) {
      console.error('Crossfade error:', error);
      return 0;
    }
  }, [crossfadeEnabled, crossfadeDuration]);

  // Start playback position tracking
  const startPositionTracking = useCallback(() => {
    if (positionIntervalRef.current) return;
    positionIntervalRef.current = setInterval(() => {
      if (!isSeekingRef.current && audioElementRef.current && !audioElementRef.current.paused) {
        setPlaybackPosition(audioElementRef.current.currentTime);
      }
    }, 250);
  }, [setPlaybackPosition]);

  const stopPositionTracking = useCallback(() => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }
  }, []);

  // Load and play a track
  const loadTrack = useCallback((track) => {
    if (!track || !track.file_path) {
      console.warn('No valid track to load');
      return;
    }

    stopPositionTracking();
    setPlaybackPosition(0);

    const element = audioElementRef.current;
    if (element) {
      element.src = window.electronAPI?.pathToMediaURL
        ? window.electronAPI.pathToMediaURL(track.file_path)
        : track.file_path;
      element.load();
    }
  }, [setPlaybackPosition, stopPositionTracking]);

  const stopTrack = useCallback(() => {
    const element = audioElementRef.current;
    if (element) {
      element.pause();
      element.currentTime = 0;
    }
    setIsPlaying(false);
    setPlaybackPosition(0);
    stopPositionTracking();
  }, [setPlaybackPosition, stopPositionTracking]);

  // Sleep timer callbacks must be initialized before playTrack and pauseTrack.
  const stopSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  }, []);

  const startSleepTimer = useCallback(() => {
    stopSleepTimer();
    if (!sleepTimerMinutes || sleepTimerMinutes <= 0) return;
    const minutes = sleepTimerMinutes;
    const endTime = Date.now() + minutes * 60 * 1000;
    sleepTimerRef.current = setTimeout(() => {
      stopTrack();
      stopSleepTimer();
    }, minutes * 60 * 1000);
    return endTime;
  }, [sleepTimerMinutes, stopTrack, stopSleepTimer]);

  const playTrack = useCallback(async () => {
    if (!currentTrack) return;

    const ctx = await initAudioContext();
    if (!ctx) {
      if (audioElementRef.current) {
        audioElementRef.current.play().catch(console.error);
        setIsPlaying(true);
        startPositionTracking();
        startSleepTimer();
      }
      return;
    }

    if (ctx.state === 'suspended') await ctx.resume();
    applyEQSettings();

    const element = audioElementRef.current;
    if (element) {
      element.playbackRate = speed;
      element.play().catch(console.error);
      setIsPlaying(true);
      startPositionTracking();
    }
    startSleepTimer();
  }, [currentTrack, initAudioContext, applyEQSettings, speed, setIsPlaying, startPositionTracking, startSleepTimer]);

  const pauseTrack = useCallback(() => {
    const element = audioElementRef.current;
    if (element) element.pause();
    setIsPlaying(false);
    stopPositionTracking();
    stopSleepTimer();
  }, [setIsPlaying, stopPositionTracking, stopSleepTimer]);

  const seekTo = useCallback((position) => {
    const element = audioElementRef.current;
    if (!element || !Number.isFinite(position)) return;

    isSeekingRef.current = true;
    const dur = Number.isFinite(element.duration) && element.duration > 0
      ? element.duration
      : (usePlayerStore.getState().currentTrack?.duration || 0);

    const target = Math.max(0, dur > 0 ? Math.min(position, dur) : position);

    try {
      element.currentTime = target;
    } catch (err) {
      console.warn('Error setting element.currentTime:', err);
    }
    setPlaybackPosition(target);

    // Release seeking flag after seek completes or timeout fallback
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 250);
  }, [setPlaybackPosition]);

  const setVolumeLevel = useCallback((vol) => {
    setVolume(vol);
    const element = audioElementRef.current;
    if (element) {
      element.volume = gainRef.current && audioContextRef.current ? 1 : vol;
    }
    if (gainRef.current && audioContextRef.current) {
      gainRef.current.gain.setValueAtTime(vol, audioContextRef.current.currentTime);
    }
  }, [setVolume]);

  const setMutedState = useCallback((muted) => {
    setMuted(muted);
    const element = audioElementRef.current;
    if (element) {
      element.muted = muted;
    }
  }, [setMuted]);

  const setPlaybackSpeed = useCallback((spd) => {
    setSpeed(spd);
    const element = audioElementRef.current;
    if (element) {
      element.playbackRate = spd;
    }
  }, [setSpeed]);

  const handlePlayNext = useCallback(() => {
    stopPositionTracking();
    const before = usePlayerStore.getState();
    playNext();
    const after = usePlayerStore.getState();

    if (after.currentTrack && (after.currentTrackIndex !== before.currentTrackIndex || after.currentTrack?.id !== before.currentTrack?.id)) {
      // Apply crossfade if enabled
      const fadeDuration = applyCrossfade(after.currentTrack, audioElementRef.current, audioElementRef.current);
      if (fadeDuration > 0) {
        // Wait for fade to complete before switching tracks
        setTimeout(() => {
          loadTrack(after.currentTrack);
          playTrack();
        }, fadeDuration * 1000);
      } else {
        loadTrack(after.currentTrack);
        playTrack();
      }
    } else {
      setIsPlaying(false);
      stopSleepTimer();
    }
  }, [playNext, loadTrack, playTrack, setIsPlaying, stopPositionTracking, stopSleepTimer, applyCrossfade]);

  const handlePlayPrevious = useCallback(() => {
    stopPositionTracking();
    const before = usePlayerStore.getState();
    playPrevious();
    const after = usePlayerStore.getState();
    if (after.currentTrack && (after.currentTrackIndex !== before.currentTrackIndex || after.currentTrack?.id !== before.currentTrack?.id)) {
      loadTrack(after.currentTrack);
      playTrack();
    } else if (after.currentTrack) {
      seekTo(0);
    }
  }, [playPrevious, loadTrack, playTrack, seekTo, stopPositionTracking]);

  // When currentTrack changes, load it
  useEffect(() => {
    if (currentTrack) {
      loadTrack(currentTrack);
      // Auto-play if we were playing before
      if (isPlaying) {
        playTrack();
      }
    } else {
      stopTrack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // When isPlaying changes, play or pause
  useEffect(() => {
    if (!currentTrack) return;
    if (isPlaying) {
      playTrack();
    } else {
      pauseTrack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // When volume/muted/speed changes, apply
  useEffect(() => {
    const element = audioElementRef.current;
    if (element) {
      element.volume = gainRef.current && audioContextRef.current ? 1 : volume;
      element.muted = isMuted;
      element.playbackRate = speed;
    }
    applyEQSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, isMuted, speed, applyEQSettings]);

  // When EQ settings change, apply
  useEffect(() => {
    applyEQSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equalizerBands, bassBoost, trebleBoost, balance, applyEQSettings]);

  // Handle track ended
  useEffect(() => {
    const element = audioElementRef.current;
    const handleEnded = () => {
      if (repeat === 'one') {
        element.currentTime = 0;
        element.play().catch(console.error);
      } else {
        handlePlayNext();
      }
    };
    element.addEventListener('ended', handleEnded);
    return () => element.removeEventListener('ended', handleEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlePlayNext, repeat]);

  // Handle media events: timeupdate, seeking, seeked, durationchange, loadedmetadata
  useEffect(() => {
    const element = audioElementRef.current;
    if (!element) return;

    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setPlaybackPosition(element.currentTime);
      }
    };

    const handleSeeking = () => {
      isSeekingRef.current = true;
    };

    const handleSeeked = () => {
      isSeekingRef.current = false;
      setPlaybackPosition(element.currentTime);
    };

    const handleDurationChange = () => {
      if (Number.isFinite(element.duration) && element.duration > 0) {
        setPlaybackDuration(element.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(element.duration) && element.duration > 0) {
        setPlaybackDuration(element.duration);
      }
    };

    element.addEventListener('timeupdate', handleTimeUpdate);
    element.addEventListener('seeking', handleSeeking);
    element.addEventListener('seeked', handleSeeked);
    element.addEventListener('durationchange', handleDurationChange);
    element.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      element.removeEventListener('timeupdate', handleTimeUpdate);
      element.removeEventListener('seeking', handleSeeking);
      element.removeEventListener('seeked', handleSeeked);
      element.removeEventListener('durationchange', handleDurationChange);
      element.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [setPlaybackPosition, setPlaybackDuration]);

  // Persist real playback starts and keep the in-memory history in sync.
  useEffect(() => {
    const element = audioElementRef.current;
    const handlePlay = async () => {
      if (!currentTrack?.id || !window.electronAPI?.invoke) return;
      try {
        await window.electronAPI.invoke('mymusicplayer:recentlyPlayed:add', currentTrack.id);
        const history = await window.electronAPI.invoke('mymusicplayer:recentlyPlayed:getAll');
        if (Array.isArray(history)) {
          useLibraryStore.getState().setRecentlyPlayed(history);
        }
      } catch (error) {
        console.error('Could not save playback history:', error);
      }
    };
    element.addEventListener('play', handlePlay);
    return () => element.removeEventListener('play', handlePlay);
  }, [currentTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPositionTracking();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      sourceRef.current = null;
      gainRef.current = null;
      pannerRef.current = null;
      analyserRef.current = null;
      eqFiltersRef.current = [];
    };
  }, [stopPositionTracking]);

  const getCurrentTime = useCallback(() => {
    if (audioElementRef.current) {
      return audioElementRef.current.currentTime;
    }
    return 0;
  }, []);

  const getDuration = useCallback(() => {
    if (audioElementRef.current) {
      return audioElementRef.current.duration;
    }
    return currentTrack?.duration || 0;
  }, [currentTrack]);

  const cleanup = useCallback(() => {
    stopTrack();
    stopPositionTracking();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioAnalyser(null);
    sourceRef.current = null;
    gainRef.current = null;
    pannerRef.current = null;
    analyserRef.current = null;
    eqFiltersRef.current = [];
  }, [stopTrack, stopPositionTracking]);

  const value = {
    audioContextRef,
    sourceRef,
    gainRef,
    analyserRef,
    audioElementRef,
    audioAnalyser,
    currentTrack,
    isPlaying,
    setIsPlaying,
    setIsLoading,
    setPlaybackPosition,
    setPlaybackDuration,
    volume,
    setVolume: setVolumeLevel,
    setMuted: setMutedState,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    speed,
    setSpeed: setPlaybackSpeed,
    equalizerBands,
    setEqualizerBands,
    bassBoost,
    setBassBoost,
    trebleBoost,
    setTrebleBoost,
    balance,
    setBalance,
    loadTrack,
    playTrack,
    pauseTrack,
    stopTrack,
    seekTo,
    getCurrentTime,
    getDuration,
    cleanup,
    playNext: handlePlayNext,
    playPrevious: handlePlayPrevious,
    startSleepTimer,
    stopSleepTimer,
    sleepTimerRef,
  };

  return (
    <PlayerContext.Provider value={value}>
      <audio ref={audioElementRef} preload="metadata" className="hidden" />
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerContext;
