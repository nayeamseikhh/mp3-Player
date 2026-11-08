import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLibraryStore, usePlayerStore } from '@store/store';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import { Music, Save, X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { mediaUrl } from '@utils/media';
import { usePlayer } from '@context/PlayerContext';

export default function EditMetadata() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { songs } = useLibraryStore();
  const { currentTrack } = usePlayerStore();
  const { seekTo } = usePlayer() || {};

  const song = songs.find((s) => s.id === parseInt(id)) || currentTrack;

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [trackNumber, setTrackNumber] = useState('');
  const [discNumber, setDiscNumber] = useState('');
  const [composer, setComposer] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [comment, setComment] = useState('');
  const [bpm, setBpm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      if (!song) {
        setIsLoading(false);
        return;
      }

      setTitle(song.title || '');
      setArtist(song.artist || '');
      setAlbum(song.album || '');
      setGenre(song.genre || '');
      setYear(song.year ? String(song.year) : '');
      setTrackNumber(song.track_number ? String(song.track_number) : '');
      setDiscNumber(song.disc_number ? String(song.disc_number) : '');
      setComposer(song.composer || '');
      setLyrics(song.lyrics || '');
      setComment(song.comment || '');
      setBpm(String(song.bpm || ''));
      setIsLoading(false);
    };

    loadMetadata();
  }, [song, id]);

  const handleSave = async () => {
    if (!song) return;

    const metadata = {
      title: title.trim(),
      artist: artist.trim(),
      album: album.trim(),
      genre: genre.trim(),
      year: parseInt(year) || null,
      trackNumber: parseInt(trackNumber) || null,
      discNumber: parseInt(discNumber) || null,
      composer: composer.trim() || null,
      lyrics: lyrics.trim() || null,
      comment: comment.trim() || null,
      bpm: bpm ? parseFloat(bpm) : null,
    };

    setIsSaving(true);
    try {
      // Write directly to the audio file's ID3v2 tag (persists in the file itself)
      const filePath = song._path || song.path || song.file_path;
      if (!filePath) {
        toast.error('File path not available');
        return;
      }
      const result = await window.electronAPI.invoke('mymusicplayer:id3:write', filePath, metadata);
      if (result?.success) {
        toast.success('ID3 tags written successfully');
        navigate(-1);
      } else {
        toast.error(result?.error || 'Failed to write ID3 tags');
      }
    } catch (error) {
      console.error('Failed to write ID3 tags:', error);
      toast.error(`Failed to write ID3 tags: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadId3 = async () => {
    if (!song) return;
    try {
      const filePath = song._path || song.path || song.file_path;
      if (!filePath) return;
      const id3Data = await window.electronAPI.invoke('mymusicplayer:id3:read', filePath);
      if (id3Data?.title) setTitle(String(id3Data.title));
      if (id3Data?.artist) setArtist(String(id3Data.artist));
      if (id3Data?.album) setAlbum(String(id3Data.album));
      if (id3Data?.genre) setGenre(String(id3Data.genre));
      if (id3Data?.year) setYear(String(id3Data.year));
      if (id3Data?.composer) setComposer(String(id3Data.composer));
      if (id3Data?.comment) setComment(String(id3Data.comment));
      if (id3Data?.bpm != null && !id3Data.bpm) setBpm(''); // non-numeric: blank out
    } catch (error) {
      console.error('Failed to load ID3 tags:', error);
      toast.error('Failed to read ID3 tags');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Music className="w-6 h-6 text-accent" />
          <h2 className="text-3xl font-bold text-text-primary">Edit Metadata</h2>
        </div>
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="p-8 max-w-2xl mx-auto animate-fade-in">
        <h2 className="text-3xl font-bold text-text-primary mb-8">Edit Metadata</h2>
        <div className="p-8 text-center text-text-secondary">
          <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Track not found</p>
          <button onClick={() => navigate('/library')} className="btn btn-primary mt-4">
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Tag className="w-6 h-6 text-accent" />
          <div>
            <h2 className="mb-2 text-2xl font-bold text-text-primary sm:text-3xl">Edit Metadata</h2>
            <p className="truncate text-text-secondary">{song.title} — {song.artist}</p>
          </div>
        </div>
        <Button variant="ghost" size="small" onClick={() => navigate(-1)} aria-label="Close">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <Card className="mb-6 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-bg-tertiary rounded-lg overflow-hidden flex-shrink-0">
            {song.artwork_path ? (
              <img src={mediaUrl(song.artwork_path)} alt={song.title} className="w-full h-full object-cover" />
            ) : (
              <Music className="w-8 h-8 text-text-secondary m-auto" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary">{song.title}</h3>
            <p className="text-text-secondary text-sm">{song.artist}</p>
            <p className="text-xs text-text-secondary">{song.album || 'Unknown Album'} • {song.genre || 'Unknown Genre'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" />

          <Input label="Artist" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name" />

          <Input label="Album" value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Album name" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Genre" />

            <Input label="Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Track Number"
              type="number"
              value={trackNumber}
              onChange={(e) => setTrackNumber(e.target.value)}
              placeholder="Track #"
            />

            <Input
              label="Disc Number"
              type="number"
              value={discNumber}
              onChange={(e) => setDiscNumber(e.target.value)}
              placeholder="Disc #"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Composer"
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder="Composer"
            />

            <Input
              label="BPM"
              type="number"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              placeholder="Tempo"
            />
          </div>

          <Input label="Lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Lyrics" />

          <Input label="Comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Free-form comment" />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Button variant="ghost" size="small" onClick={handleSaveId3} disabled={isSaving} aria-label="Write ID3 tags">
            <Tag className="w-4 h-4" />
            {isSaving ? 'Writing...' : 'Write ID3'}
          </Button>
          <Button variant="ghost" size="small" onClick={handleLoadId3}>
            Read from File
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </Card>

      <div className="p-4 bg-bg-tertiary border border-border-default rounded-lg">
        <div className="flex items-start gap-3">
          <Music className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-text-primary">About ID3 Tag Editing</p>
            <p className="text-xs text-text-secondary">
              ID3 tags are written directly into the audio file so metadata updates persist
              even if the database is later rebuilt from a fresh scan. Edited fields are
              tracked for sync via the offline sync system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
