import { useSettingsStore } from '@store/store';
import { useState, useRef } from 'react';
import Card from '@components/common/Card';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { Home, Palette, Music, Shield, CheckCircle2, FolderOpen, Download, Upload, Trash2, RotateCcw, Database, FileText, AlertTriangle, Globe, Languages, Lock, Bell, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { refreshLibraryData } from '@utils/library';
import i18n from '@utils/i18n';
import { useEffect } from 'react';

export default function Settings() {
  const {
    theme, setTheme,
    accentColor, setAccentColor,
    language, setLanguage,
    startupPage, setStartupPage,
    confirmDelete, setConfirmDelete,
    showAlbumArtwork, setShowAlbumArtwork,
    defaultVolume, setDefaultVolume,
    playbackSpeed, setPlaybackSpeed,
    crossfadeEnabled, setCrossfadeEnabled,
    crossfadeDuration, setCrossfadeDuration,
    sleepTimerMinutes, setSleepTimerMinutes,
    defaultMusicFolder, setDefaultMusicFolder,
    autoScanOnStartup, setAutoScanOnStartup,
    duplicateHandling, setDuplicateHandling,
    sidebarCollapsed, setSidebarCollapsed,
    compactLayout, setCompactLayout,
    resetSettings,
  } = useSettingsStore();

  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [isRestoreInProgress, setIsRestoreInProgress] = useState(false);
  const [isVacuumInProgress, setIsVacuumInProgress] = useState(false);
  const [databaseInfo, setDatabaseInfo] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    i18n.init(language);
  }, [language]);

  const t = (key, params = {}) => i18n.t(key, params);

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    i18n.setLanguage(newLanguage);
    toast.success(t('languageChanged', { language: newLanguage }));
  };

  const handleBackup = async () => {
    setIsBackupInProgress(true);
    try {
      const backupPath = await window.electronAPI?.invoke('mymusicplayer:database:backup');
      if (backupPath) {
        toast.success('Database backed up successfully');
      } else {
        toast.error('Backup failed');
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Backup failed');
    } finally {
      setIsBackupInProgress(false);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsRestoreInProgress(true);
    try {
      const result = await window.electronAPI?.invoke('mymusicplayer:database:restore', file.path);
      if (result?.success) {
        toast.success('Database restored successfully');
        await refreshLibraryData();
      } else {
        toast.error(result?.error || 'Restore failed');
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Restore failed');
    } finally {
      setIsRestoreInProgress(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVacuum = async () => {
    setIsVacuumInProgress(true);
    try {
      const result = await window.electronAPI?.invoke('mymusicplayer:database:vacuum');
      if (result?.success) {
        toast.success('Database vacuumed successfully');
      } else {
        toast.error('Vacuum failed');
      }
    } catch (error) {
      console.error('Vacuum error:', error);
      toast.error('Vacuum failed');
    } finally {
      setIsVacuumInProgress(false);
    }
  };

  const getDatabaseInfo = async () => {
    try {
      const info = await window.electronAPI?.invoke('mymusicplayer:database:getInfo');
      setDatabaseInfo(info);
    } catch (error) {
      console.error('Get database info error:', error);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-text-primary mb-6 sm:mb-8 sm:text-3xl">Settings</h2>

      {/* General */}
      <Card className="mb-8 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Home className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-text-primary">General</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">Theme</p>
              <p className="text-xs text-text-secondary">Dark, light, or system theme</p>
            </div>
            <div className="flex gap-2">
              {['dark', 'light', 'system'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    theme === t
                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary'
                      : 'bg-transparent hover:bg-accent/10'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full ${t === 'dark' ? 'bg-bg-secondary border border-border-default' : t === 'light' ? 'bg-bg-tertiary border border-border-default' : 'bg-gradient-to-br from-accent to-accent-secondary'}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">Language</p>
              <p className="text-xs text-text-secondary">App interface language</p>
            </div>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {i18n.getSupportedLanguages().map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          <label className="block text-sm font-medium text-text-secondary">Startup Page
            <select className="mt-1 w-full rounded-lg border border-border-input bg-bg-tertiary px-3 py-2 text-text-primary" value={startupPage} onChange={(event) => setStartupPage(event.target.value)}>
              {['dashboard', 'library', 'songs', 'albums', 'artists', 'genres', 'playlists', 'favorites', 'recently-played', 'equalizer', 'lyrics'].map((page) => <option key={page} value={page}>{page.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}
            </select>
          </label>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="mb-8 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-accent-secondary" />
          <h3 className="font-semibold text-text-primary">Appearance</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">Accent Color</p>
              <p className="text-xs text-text-secondary">Primary accent color throughout the app</p>
            </div>
            <div className="flex gap-1">
              {['#FF8A32', '#8B7CFF', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'].map((color) => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    accentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-secondary' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">Show Album Artwork</p>
              <p className="text-xs text-text-secondary">Display album artwork in the player</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showAlbumArtwork}
                onChange={(e) => setShowAlbumArtwork(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </label>

          <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">Sidebar Collapsed</p>
              <p className="text-xs text-text-secondary">Start with sidebar collapsed</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sidebarCollapsed}
                onChange={(e) => setSidebarCollapsed(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </label>

          <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">Compact Layout</p>
              <p className="text-xs text-text-secondary">Use more compact spacing</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={compactLayout}
                onChange={(e) => setCompactLayout(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </label>
        </div>
      </Card>

      {/* Audio */}
      <Card className="mb-8 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Music className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-text-primary">Audio</h3>
        </div>
        <div className="space-y-4">
          <Input
            label={t('defaultVolume')}
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={defaultVolume}
            onChange={(e) => setDefaultVolume(parseFloat(e.target.value))}
            className="w-full"
          />

          <Input
            label={t('playbackSpeed')}
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="w-full"
          />

          <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">{t('crossfadeEnabled')}</p>
              <p className="text-xs text-text-secondary">Smoothly fade between tracks</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={crossfadeEnabled}
                onChange={(e) => setCrossfadeEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </label>

          <Input
            label={t('crossfadeDuration')}
            type="range"
            min="100"
            max="5000"
            step="100"
            value={crossfadeDuration}
            onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}
            className="w-full"
            suffix="ms"
            disabled={!crossfadeEnabled}
          />

          <Input
            label={t('sleepTimer')}
            type="range"
            min="0"
            max="60"
            step="5"
            value={sleepTimerMinutes}
            onChange={(e) => setSleepTimerMinutes(parseInt(e.target.value))}
            className="w-full"
            suffix="minutes"
          />
        </div>
      </Card>

      {/* Library */}
      <Card className="mb-8 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FolderOpen className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-text-primary">Library</h3>
        </div>
        <div className="space-y-4">
          <Input
            label={t('defaultMusicFolder')}
            value={defaultMusicFolder}
            onChange={(e) => setDefaultMusicFolder(e.target.value)}
            placeholder="/path/to/music"
          />

          <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">{t('autoScanOnStartup')}</p>
              <p className="text-xs text-text-secondary">Automatically scan music folder on startup</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoScanOnStartup}
                onChange={(e) => setAutoScanOnStartup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </label>

          <label className="block text-sm font-medium text-text-secondary">Duplicate Handling
            <select className="mt-1 w-full rounded-lg border border-border-input bg-bg-tertiary px-3 py-2 text-text-primary" value={duplicateHandling} onChange={(event) => setDuplicateHandling(event.target.value)}>
              {['skip', 'replace', 'keepBoth'].map((mode) => <option key={mode} value={mode}>{t(mode)}</option>)}
            </select>
          </label>
        </div>
      </Card>

      {/* Database Management */}
      <Card className="mb-8 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-text-primary">Database Management</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">Backup Database</p>
              <p className="text-xs text-text-secondary">Create a backup of your music library</p>
            </div>
            <Button
              onClick={handleBackup}
              disabled={isBackupInProgress}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isBackupInProgress ? 'Backing up...' : 'Backup'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">Restore Database</p>
              <p className="text-xs text-text-secondary">Restore from a backup file</p>
            </div>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".db,.sqlite,.sqlite3"
                onChange={handleRestore}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button disabled={isRestoreInProgress} className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {isRestoreInProgress ? 'Restoring...' : 'Restore'}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">Vacuum Database</p>
              <p className="text-xs text-text-secondary">Optimize database file size</p>
            </div>
            <Button
              onClick={handleVacuum}
              disabled={isVacuumInProgress}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isVacuumInProgress ? 'Vacuuming...' : 'Vacuum'}
            </Button>
          </div>

          {databaseInfo && (
            <div className="p-4 bg-bg-tertiary rounded-lg border border-border-default">
              <h4 className="text-sm font-medium text-text-primary mb-3">Database Information</h4>
              <div className="grid grid-cols-2 gap-4 text-xs text-text-secondary">
                <div>
                  <span className="font-medium">Total Songs:</span> {databaseInfo.totalSongs}
                </div>
                <div>
                  <span className="font-medium">Total Artists:</span> {databaseInfo.totalArtists}
                </div>
                <div>
                  <span className="font-medium">Total Albums:</span> {databaseInfo.totalAlbums}
                </div>
                <div>
                  <span className="font-medium">Total Playlists:</span> {databaseInfo.totalPlaylists}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Database Size:</span> {(databaseInfo.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Security & Privacy */}
      <Card className="mb-8 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-text-primary">Security & Privacy</h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default">
            <div>
              <p className="text-sm font-medium text-text-primary">{t('confirmDeleteEnabled')}</p>
              <p className="text-xs text-text-secondary">Require confirmation before deleting tracks</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </label>

          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-sm font-medium text-green-400">Security Features Enabled</p>
            </div>
            <ul className="text-xs text-text-secondary space-y-1">
              <li>• Context isolation enabled</li>
              <li>• Node integration disabled</li>
              <li>• Sandboxing active</li>
              <li>• No cloud services or data collection</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Reset */}
      <Card className="mb-8 p-6">
        <div className="flex items-center gap-3 mb-6">
          <RotateCcw className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-text-primary">Reset</h3>
        </div>
        <div className="space-y-4">
          <Button
            onClick={() => {
              if (window.confirm('This will reset all settings to defaults. Continue?')) {
                resetSettings();
                toast.success('Settings reset to defaults');
              }
            }}
            variant="secondary"
            className="w-full"
          >
            Reset All Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
