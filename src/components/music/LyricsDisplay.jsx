import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '@context/PlayerContext';

// Parse LRC lyrics format: [mm:ss.xx] lyric text
const parseLrc = (lrcContent) => {
  if (!lrcContent || typeof lrcContent !== 'string') {
    return [];
  }

  const lines = lrcContent.split('\n');
  const parsedLines = [];
  const lrcRegex = /^\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;

  for (const line of lines) {
    const match = line.match(lrcRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const text = match[4].trim();
      const time = minutes * 60 + seconds + milliseconds / 1000;

      if (text) {
        parsedLines.push({ time, text });
      }
    }
  }

  // Sort by time ascending
  parsedLines.sort((a, b) => a.time - b.time);
  return parsedLines;
};

export { parseLrc };

const LyricsDisplay = ({ lrcContent }) => {
  const { audioElementRef, currentTrack } = usePlayer();
  const [lyrics, setLyrics] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const intervalRef = useRef(null);
  const animationRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (lrcContent) {
      const parsed = parseLrc(lrcContent);
      setLyrics(parsed);
      setCurrentLineIndex(-1);
    } else {
      setLyrics([]);
      setCurrentLineIndex(-1);
    }
  }, [lrcContent]);

  useEffect(() => {
    if (!audioElementRef.current) return;

    const element = audioElementRef.current;

    const updateLyrics = () => {
      if (!lyrics || lyrics.length === 0) return;

      const currentTime = element.currentTime;

      // Find current line
      let newIndex = -1;
      for (let i = 0; i < lyrics.length; i++) {
        if (currentTime >= lyrics[i].time) {
          newIndex = i;
        } else {
          break;
        }
      }

      if (newIndex !== currentLineIndex) {
        setCurrentLineIndex(newIndex);

        // Scroll to current line
        if (scrollContainerRef.current && newIndex >= 0) {
          const items = scrollContainerRef.current.querySelectorAll('[data-lyric-line]');
          const item = items[newIndex];
          if (item) {
            const containerRect = scrollContainerRef.current.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();
            const offsetTop = item.offsetTop;
            const centerOffset = containerRect.height / 2 - item.offsetHeight / 2;
            scrollContainerRef.current.scrollTo({
              top: offsetTop - centerOffset,
              behavior: 'smooth',
            });
          }
        }
      }
    };

    element.addEventListener('timeupdate', updateLyrics);
    return () => {
      element.removeEventListener('timeupdate', updateLyrics);
    };
  }, [lyrics, audioElementRef, currentTrack]);

  return (
    <div className="h-64 overflow-hidden rounded-lg bg-bg-secondary border border-border-default flex flex-col">
      <div className="p-4 border-b border-border-default flex items-center justify-between">
        <h3 className="font-medium text-text-primary">Lyrics</h3>
        <span className="text-xs text-text-secondary">{lyrics.length ? `${lyrics.length} lines` : 'No lyrics'}</span>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {lyrics.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-text-secondary">No lyrics available for this track</p>
          </div>
        ) : (
          lyrics.map((line, index) => (
            <div
              key={index}
              data-lyric-line
              className={`transition-all duration-200 text-center cursor-pointer ${currentLineIndex === index ? 'text-accent font-medium text-lg scale-110' : 'text-text-secondary text-sm'}`}
              style={{
                transform: currentLineIndex === index ? 'scale(1.1)' : 'scale(1)',
                marginBottom: currentLineIndex === index ? '0.5rem' : '0',
              }}
            >
              {line.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LyricsDisplay;