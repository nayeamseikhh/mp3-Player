import { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '@store/store';
import { usePlayer } from '@context/PlayerContext';
import Card from '@components/common/Card';
import { Music, Mic, Volume2, VolumeX, Eye, EyeOff, FileText, Pen } from 'lucide-react';
import { mediaUrl } from '@utils/media';
import { parseLrc } from '@components/music/LyricsDisplay';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function LyricsPage() {
  const { currentTrack } = usePlayerStore();
  const { audioElementRef } = usePlayer() || {};
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const lyricsText = currentTrack?.lyrics || null;
  const parsedLyrics = lyricsText ? parseLrc(lyricsText) : [];
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [manualLyrics, setManualLyrics] = useState(lyricsText || '');
  const [isLoadingLrc, setIsLoadingLrc] = useState(false);
  const [fileSelected, setFileSelected] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!audioElementRef || !audioElementRef.current) return;

    const element = audioElementRef.current;
    const updateLyrics = () => {
      if (!parsedLyrics || parsedLyrics.length === 0) return;

      const currentTime = element.currentTime;

      let newIndex = -1;
      for (let i = 0; i < parsedLyrics.length; i++) {
        if (currentTime >= parsedLyrics[i].time) {
          newIndex = i;
        } else {
          break;
        }
      }

      if (newIndex !== currentLineIndex) {
        setCurrentLineIndex(newIndex);
      }
    };

    element.addEventListener('timeupdate', updateLyrics);
    return () => element.removeEventListener('timeupdate', updateLyrics);
  }, [parsedLyrics, audioElementRef]);

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Load lyrics from .lrc file
  const loadLyricsFromFile = async (file) => {
    setIsLoadingLrc(true);
    try {
      const content = await readLrcFile(file);
      if (content) {
        setManualLyrics(content);
        setHasUnsavedChanges(true);
        toast.success('LRC file loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load LRC file:', error);
      toast.error('Failed to load LRC file');
    } finally {
      setIsLoadingLrc(false);
    }
  };

  // Parse LRC from string
  const parseLrcFromString = (lrcContent) => {
    return lyricsText ? parseLrc(lrcContent) : [];
  };

  // Copy lyrics to clipboard
  const copyLyrics = () => {
    if (lyricsText) {
      navigator.clipboard.writeText(lyricsText);
      toast.success('Lyrics copied to clipboard');
    }
  };

  if (!currentTrack) {
    return (
      <div className="p-8 max-w-2xl mx-auto animate-fade-in text-center">
        <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
          <Music className="w-10 h-10 text-text-secondary" />
        </div>
        <h2 className="text-3xl font-bold text-text-primary mb-4">Lyrics</h2>
        <p className="text-text-secondary mb-8">No track selected</p>
        <p className="text-xs text-text-secondary">
          Select a song to view its synchronized lyrics
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="mb-2 truncate text-2xl font-bold text-text-primary sm:text-3xl">{currentTrack.title}</h2>
          <p className="text-text-secondary">{currentTrack.artist}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-text-secondary hover:text-text-primary"
            title="Expand lyrics"
          >
            {isExpanded ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>

          {/* Manual Edit Button */}
          <button
            onClick={() => setShowEditModal(!showEditModal)}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded-full bg-bg-tertiary hover:bg-accent/10 transition-colors"
            title="Edit lyrics manually"
          >
            <Pen className="w-4 h-4" />
          </button>

          {/* Copy Lyrics Button */}
          <button
            onClick={copyLyrics}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded-full bg-bg-tertiary hover:bg-accent/10 transition-colors"
            title="Copy lyrics to clipboard"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Track Info Card */}
      <Card className="mb-6 p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-bg-tertiary rounded-lg overflow-hidden flex-shrink-0">
            {currentTrack.artwork_path ? (
              <img src={mediaUrl(currentTrack.artwork_path)} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : (
              <Music className="w-8 h-8 text-text-secondary m-auto" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary">{currentTrack.title}</h3>
            <p className="text-text-secondary text-sm">{currentTrack.artist}</p>
            <p className="text-xs text-text-secondary">
              {currentTrack.album || 'Unknown Album'} • {currentTrack.genre || 'Unknown Genre'} • {formatTime(currentTrack.duration || 0)}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => {
              // Copy lyrics to clipboard
              navigator.clipboard.writeText(lyricsText || '');
              toast.success('Lyrics copied to clipboard');
            }}
            className="flex items-center gap-2 p-2.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            title="Copy lyrics"
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-sm text-text-secondary">Copy Lyrics</span>
          </button>
        </div>
      </Card>

      {/* Lyrics Display */}
      <Card className={`p-6 ${isExpanded ? 'h-[60vh]' : 'h-64'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-text-primary">Lyrics</h3>
          <span className="text-xs text-text-secondary">{parsedLyrics.length ? `${parsedLyrics.length} lines` : 'No lyrics available'}</span>
        </div>

        <div
          className={`flex-1 overflow-y-auto p-4 space-y-1 ${isExpanded ? 'text-lg' : ''}`}
        >
          {parsedLyrics.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center pt-12">
              <Mic className="w-12 h-12 text-text-secondary mb-3" />
              <p className="text-text-secondary">
                No lyrics available for this track
              </p>
              <div className="text-sm mt-3 text-text-center">
                <p className="text-text-primary">Add lyrics from:</p>
                <ul className="text-xs text-text-secondary space-y-1 max-w-xs">
                  <li>• Embedded metadata</li>
                  <li>• External .lrc file</li>
                  <li>• Manual editing</li>
                </ul>
              </div>
            </div>
          ) : (
            parsedLyrics.map((line, index) => (
              <div
                key={index}
                className={`transition-all duration-300 text-center cursor-pointer py-1.5 rounded ${
                  currentLineIndex === index
                    ? 'text-accent font-medium text-xl bg-accent/10 shadow-lg scale-105'
                    : 'text-text-secondary text-base hover:bg-accent/5 hover:text-text-primary'
                }`}
                style={{
                  transform: currentLineIndex === index ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {line.text}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="mt-6 p-4 bg-bg-tertiary border border-border-default rounded-lg">
        <div className="flex gap-3">
          {/* Load .lrc File */}
          <button
            onClick={() => setFileSelected(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary rounded-lg bg-bg-tertiary hover:bg-accent/10 transition-colors"
            title="Load LRC file"
          >
            <FileText className="w-4 h-4" />
            <span>Load .lrc File</span>
          </button>

          {/* Manual Edit */}
          <button
            onClick={() => setShowEditModal(!showEditModal)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary rounded-lg bg-bg-tertiary hover:bg-accent/10 transition-colors"
            title="Manual edit"
          >
            <Pen className="w-4 h-4" />
            <span>Manual Edit</span>
          </button>

          {/* Copy to Clipboard */}
          <button
            onClick={copyLyrics}
            className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary rounded-lg bg-bg-tertiary hover:bg-accent/10 transition-colors"
            title="Copy lyrics"
          >
            <Volume2 className="w-4 h-4" />
            <span>Copy</span>
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary rounded-lg p-6 max-w-md w-full shadow-xl transform scale-95 opacity-0 transition-all duration-300 ${
            showEditModal ? 'scale-100 opacity-1' : 'scale-95 opacity-0'
          }" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-3 right-3 text-text-secondary hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-text-primary mb-4">
              Manual Lyric Editing
            </h3>

            {/* Original lyrics preview */}
            {lyricsText && (
              <div className="mb-4 p-4 bg-text-tertiary rounded-lg mb-4">
                <h4 className="text-sm font-medium text-text-secondary mb-2">Original:</h4>
                <p className="text-sm text-text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto">{lyricsText}</p>
              </div>
            )}

            {/* Manual editing area */}
            <div>
              <textarea
                rows={8}
                className="w-full bg-text-tertiary border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-accent resize-y"
                value={manualLyrics}
                onChange={(e) => setManualLyrics(e.target.value)}
                placeholder="Enter lyrics here..."
                disabled={isLoadingLrc}
              ></textarea>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex gap-3 justify-end">
              {/* Cancel */}
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                Cancel
              </button>

              {/* Save */}
              <button
                onClick={() => {
                  // Save manually edited lyrics
                  const updatedMetadata = {
                    ...(currentTrack?.metadata || {}),
                    lyrics: manualLyrics || undefined,
                  };

                  if (window.electronAPI?.invoke) {
                    window.electronAPI.invoke('mymusicplayer:metadata:write', currentTrack.id, {
                      lyrics: manualLyrics || '',
                    }).then((result) => {
                      if (result?.success) {
                        toast.success('Lyrics saved successfully');
                        setShowEditModal(false);
                        setHasUnsavedChanges(false);
                        // Refresh the track
                        navigate('/');
                      } else {
                        toast.error(result?.error || 'Failed to save lyrics');
                      }
                    });
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-accent hover:bg-accent-hover transition-colors"
                disabled={isLoadingLrc}
              >
                {isLoadingLrc ? 'Saving...' : 'Save Lyrics'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File picker for .lrc files */}
      {fileSelected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary rounded-lg p-6 max-w-md w-full shadow-xl transform scale-95 opacity-0 transition-all duration-300 ${
            fileSelected ? 'scale-100 opacity-1' : 'scale-95 opacity-0'
          }" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setFileSelected(false)}
              className="absolute top-3 right-3 text-text-secondary hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-text-primary mb-4">Load LRC File</h3>

            <p className="text-text-secondary mb-6">
              Select an .lrc file to synchronize lyrics with the current track.
            </p>

            <input
              type="file"
              accept=".lrc"
              className="hidden"
              ref={(ref) => {
                if (ref) {
                  ref.onchange = async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await loadLyricsFromFile(file);
                      setFileSelected(false);
                    }
                  };
                  const event = new Event('change');
                  if (ref.files && ref.files[0]) {
                    ref.files[0].name;
                  }
                }
              }}
            />

            <button
              onClick={() => setFileSelected(false)}
              className="mt-4 px-4 py-2 text-sm text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
