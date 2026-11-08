import { useState, useEffect } from 'react';
import { useLibraryStore, useDashboardStore, useSettingsStore } from '@store/store';
import { refreshLibraryData } from '@utils/library';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import { Music, Download, Upload, Save, Database, FileJson, Trash2, Loader, Info } from 'lucide-react';

export default function ExportImportPage() {
  const { setSongs, setPlaylists, setFavorites, setRecentlyPlayed } = useLibraryStore();
  const { setWidgets, setCurrentLayout } = useDashboardStore();
  const { dashboard } = useLibraryStore ? {} : {};

  const [exportJson, setExportJson] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importContent, setImportContent] = useState(null);
  const [previewStats, setPreviewStats] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('info'); // info, success, error
  const [showPreview, setShowPreview] = useState(false);

  const PREVIEW_SECTIONS = {
    songs: 'Songs',
    playlists: 'Playlists',
    favorites: 'Favorites',
    playHistory: 'Play History',
    settings: 'Settings',
    dashboardLayouts: 'Dashboard Layouts',
    dashboardWidgets: 'Dashboard Widgets',
  };

  // Export library data
  const handleExportLibrary = async () => {
    setIsExporting(true);
    setStatusMessage(null);

    try {
      const jsonString = await window.electronAPI.invoke('mymusicplayer:library:export');
      if (jsonString) {
        const data = JSON.parse(jsonString);
        const stats = {
          songs: data.songs?.length || 0,
          playlists: data.playlists?.length || 0,
          favorites: data.favorites?.length || 0,
          playHistory: data.playHistory?.length || 0,
          settings: data.settings?.length || 0,
          dashboardLayouts: data.dashboardLayouts?.length || 0,
          dashboardWidgets: data.dashboardWidgets?.length || 0,
        };
        setPreviewStats(stats);
        setExportJson(jsonString);
        setShowPreview(true);
        setStatusMessage(`Library exported: ${stats.songs} songs, ${stats.playlists} playlists, ${stats.favorites} favorites`);
        setStatusType('success');
      }
    } catch (error) {
      console.error('Export failed:', error);
      setStatusMessage(`Export failed: ${error.message}`);
      setStatusType('error');
    } finally {
      setIsExporting(false);
    }
  };

  // Download exported JSON as file
  const handleDownloadExport = () => {
    if (!exportJson) return;
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `mymusicplayer-library-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('Library data exported to file');
    setStatusType('success');
  };

  // Handle import file selection
  const handleImportFileSelect = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target.result);
        setImportContent(content);
        setImportFile(file);
        setPreviewStats({
          songs: content.songs?.length || 0,
          playlists: content.playlists?.length || 0,
          favorites: content.favorites?.length || 0,
          playHistory: content.playHistory?.length || 0,
          settings: content.settings?.length || 0,
          dashboardLayouts: content.dashboardLayouts?.length || 0,
          dashboardWidgets: content.dashboardWidgets?.length || 0,
        });
        setShowPreview(true);
        setStatusMessage(`Import preview: ${content.songs?.length || 0} songs found`);
        setStatusType('info');
      } catch (error) {
        setStatusMessage('Invalid JSON file');
        setStatusType('error');
      }
    };
    reader.readAsText(file);
  };

  // Import library data
  const handleImportLibrary = async () => {
    if (!importContent) return;

    setIsImporting(true);
    setStatusMessage(null);

    try {
      const result = await window.electronAPI.invoke('mymusicplayer:library:import', importContent);
      if (result.success) {
        await refreshLibraryData();
        setStatusMessage(`Library imported successfully: ${previewStats?.songs || 0} songs, ${previewStats?.playlists || 0} playlists`);
        setStatusType('success');
        setImportContent(null);
        setImportFile(null);
      } else {
        setStatusMessage(`Import failed: ${result.error}`);
        setStatusType('error');
      }
    } catch (error) {
      console.error('Import failed:', error);
      setStatusMessage(`Import failed: ${error.message}`);
      setStatusType('error');
    } finally {
      setIsImporting(false);
    }
  };

  // Clear import preview
  const handleClearImport = () => {
    setImportFile(null);
    setImportContent(null);
    setPreviewStats(null);
    setShowPreview(false);
    setStatusMessage(null);
  };

  // Get human-readable format for number
  const formatCount = (count) => {
    if (!count) return '0';
    return count.toLocaleString();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2 sm:text-3xl">Export / Import Library</h2>
          <p className="text-text-secondary">
            Backup your library data or restore from a previous export
          </p>
        </div>
        <Button variant="ghost" icon={<Music className="w-4 h-4" />}>
          Return to Library
        </Button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <Card className={`p-4 mb-6 ${statusType === 'success' ? 'bg-green-900/20 border-green-500/30' : statusType === 'error' ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
          <div className="flex items-center gap-3">
            {statusType === 'success' && <Info className="w-5 h-5 text-green-400 flex-shrink-0" />}
            {statusType === 'error' && <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0" />}
            {statusType === 'info' && <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />}
            <span className={`text-text-primary ${statusType === 'success' ? 'text-green-400' : statusType === 'error' ? 'text-red-400' : 'text-blue-400'}`}>{statusMessage}</span>
          </div>
        </Card>
      )}

      {/* Export Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text-primary">Export Library</h3>
                <p className="text-sm text-text-secondary">Backup all your music library data</p>
              </div>
            </div>
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              disabled={isExporting}
              onClick={handleExportLibrary}
            >
              {isExporting ? 'Exporting...' : 'Export Library'}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-bg-tertiary rounded-lg border border-border-default">
              <p className="text-xs text-text-secondary mb-2">What gets exported:</p>
              <ul className="text-sm text-text-primary space-y-1">
                <li>• All songs and metadata</li>
                <li>• Playlists and playlist order</li>
                <li>• Favorite songs</li>
                <li>• Play history</li>
                <li>• App settings</li>
                <li>• Dashboard layouts and widgets</li>
              </ul>
            </div>

            {previewStats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-bg-secondary border border-border-default">
                  <div className="text-lg font-bold text-text-primary">{formatCount(previewStats.songs)}</div>
                  <div className="text-xs text-text-secondary">Songs</div>
                </div>
                <div className="p-3 rounded-lg bg-bg-secondary border border-border-default">
                  <div className="text-lg font-bold text-text-primary">{formatCount(previewStats.playlists)}</div>
                  <div className="text-xs text-text-secondary">Playlists</div>
                </div>
                <div className="p-3 rounded-lg bg-bg-secondary border border-border-default">
                  <div className="text-lg font-bold text-text-primary">{formatCount(previewStats.favorites)}</div>
                  <div className="text-xs text-text-secondary">Favorites</div>
                </div>
                <div className="p-3 rounded-lg bg-bg-secondary border border-border-default">
                  <div className="text-lg font-bold text-text-primary">{formatCount(previewStats.dashboardLayouts)}</div>
                  <div className="text-xs text-text-secondary">Layouts</div>
                </div>
              </div>
            )}

            {exportJson && (
              <div className="mt-4 flex gap-3">
                <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={handleDownloadExport}>
                  Download JSON
                </Button>
                <Button variant="secondary" icon={<Info className="w-4 h-4" />} onClick={() => setShowPreview(!showPreview)}>
                  Preview
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Import Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text-primary">Import Library</h3>
                <p className="text-sm text-text-secondary">Restore library data from a previous export</p>
              </div>
            </div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImportFileSelect(e.target.files[0])}
            />
            <label
              className="block w-full p-4 border-2 border-dashed rounded-lg border-border-default hover:border-accent hover:bg-accent/5 cursor-pointer transition-colors"
              onClick={() => document.querySelector('input[type="file"]').click()}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="w-8 h-8 text-accent" />
                <p className="text-sm font-medium text-text-primary">Choose JSON file to import</p>
                <p className="text-xs text-text-secondary">Select a .json file exported from MyMusicPlayer</p>
              </div>
            </label>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-bg-tertiary rounded-lg border border-border-default">
              <p className="text-xs text-text-secondary mb-2">What gets imported:</p>
              <ul className="text-sm text-text-primary space-y-1">
                <li>• All songs and metadata</li>
                <li>• Playlists and playlist order</li>
                <li>• Favorite songs</li>
                <li>• Play history</li>
                <li>• App settings</li>
                <li>• Dashboard layouts and widgets</li>
              </ul>
              <p className="text-xs text-text-secondary mt-3">
                ⚠️ Importing will replace all existing library data. This action cannot be undone.
              </p>
            </div>

            {previewStats && importFile && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-bg-secondary border border-border-default">
                    <div className="text-lg font-bold text-text-primary">{formatCount(previewStats.songs)}</div>
                    <div className="text-xs text-text-secondary">Songs</div>
                  </div>
                  <div className="p-3 rounded-lg bg-bg-secondary border border-border-default">
                    <div className="text-lg font-bold text-text-primary">{formatCount(previewStats.playlists)}</div>
                    <div className="text-xs text-text-secondary">Playlists</div>
                  </div>
                  <div className="p-3 rounded-lg bg-bg-secondary border border-border-default">
                    <div className="text-lg font-bold text-text-primary">{formatCount(previewStats.favorites)}</div>
                    <div className="text-xs text-text-secondary">Favorites</div>
                  </div>
                  <div className="p-3 rounded-lg bg-bg-secondary border border-border-default">
                    <div className="text-lg font-bold text-text-primary">{formatCount(previewStats.dashboardLayouts)}</div>
                    <div className="text-xs text-text-secondary">Layouts</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <Button
                    variant="secondary"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={handleClearImport}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    icon={<Upload className="w-4 h-4" />}
                    disabled={isImporting}
                    onClick={handleImportLibrary}
                  >
                    {isImporting ? 'Importing...' : 'Import Library Data'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* JSON Preview Modal */}
      {showPreview && exportJson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-tertiary border border-border-default rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-border-default flex items-center justify-between">
              <h3 className="text-xl font-semibold text-text-primary">Export Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-text-secondary hover:text-text-primary"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-bg-secondary">
              <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-all">{JSON.stringify(JSON.parse(exportJson), null, 2)}</pre>
            </div>
            <div className="p-4 border-t border-border-default flex justify-end">
              <Button variant="outline" onClick={handleDownloadExport} icon={<Download className="w-4 h-4" />}>
                Download
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Preview Modal for Import */}
      {showPreview && importContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-tertiary border border-border-default rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-border-default flex items-center justify-between">
              <h3 className="text-xl font-semibold text-text-primary">Import Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-text-secondary hover:text-text-primary"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-bg-secondary">
              <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-all">{JSON.stringify(importContent, null, 2)}</pre>
            </div>
            <div className="p-4 border-t border-border-default flex justify-end gap-3">
              <Button variant="outline" onClick={handleClearImport} icon={<Trash2 className="w-4 h-4" />}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<Upload className="w-4 h-4" />}
                disabled={isImporting}
                onClick={handleImportLibrary}
              >
                {isImporting ? 'Importing...' : 'Import Library Data'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
