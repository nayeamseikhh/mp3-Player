import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@store/store';
import { refreshLibraryData } from '@utils/library';
import Card from '@components/common/Card';
import EmptyState from '@components/common/EmptyState';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import Modal from '@components/common/Modal';
import { Music, FolderOpen, File, X, CheckCircle, AlertCircle, Upload, Loader } from 'lucide-react';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file
const SUPPORTED_FORMATS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.aiff', '.alac', '.opus', '.wma'];

export default function ImportPage() {
  const navigate = useNavigate();
  const { defaultMusicFolder } = useSettingsStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, message: '' });
  const [importResults, setImportResults] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [scanOptions, setScanOptions] = useState({
    duplicateHandling: 'skip',
    includeSubfolders: true,
  });
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isImporting || !window.electronAPI?.on) return undefined;
    return window.electronAPI.on('mymusicplayer:music:importProgress', ({ current, total, filePath }) => {
      setImportProgress({
        current,
        total,
        message: filePath ? `Importing ${filePath.split(/[\\/]/).pop()}` : 'Importing music…',
      });
    });
  }, [isImporting]);

  const handleFileSelect = useCallback(async () => {
    try {
      const paths = await window.electronAPI.invoke('mymusicplayer:fs:selectFiles');
      const files = await Promise.all(paths.map(async (filePath) => ({
        path: filePath,
        name: filePath.split(/[\\/]/).pop(),
        size: await window.electronAPI.invoke('mymusicplayer:fs:getFileSize', filePath),
      })));
      setSelectedFiles((prev) => [...prev, ...files]);
      setError(null);
    } catch (err) {
      setError('Failed to select files: ' + err.message);
    }
  }, []);

  const handleFolderSelect = useCallback(async () => {
    try {
      const folderPath = await window.electronAPI.invoke('mymusicplayer:fs:selectFolder');
      if (folderPath) {
        setSelectedFolder(folderPath);
        setError(null);
      }
    } catch (err) {
      setError('Failed to select folder: ' + err.message);
    }
  }, []);

  const validateFile = (file) => {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!SUPPORTED_FORMATS.includes(extension)) {
      throw new Error(`Unsupported file format: ${extension}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${file.name}. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    return true;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeSelectedFolder = () => {
    setSelectedFolder(null);
  };

  const scanFiles = async () => {
    if (!selectedFiles.length && !selectedFolder) {
      setError('Please select at least one file or folder');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: 1, message: 'Preparing import...' });
    setImportResults(null);
    setError(null);

    try {
      if (!selectedFolder && selectedFiles.length === 0) {
        setError('No audio files found to import');
        setIsImporting(false);
        return;
      }

      // Perform import
      const result = selectedFolder
        ? await window.electronAPI.invoke('mymusicplayer:music:importFolder', selectedFolder, scanOptions)
        : await window.electronAPI.invoke('mymusicplayer:music:import', {
            filePaths: selectedFiles.map((file) => file.path),
            duplicateHandling: scanOptions.duplicateHandling,
            includeSubfolders: scanOptions.includeSubfolders,
          });

      setImportResults(result);
      setSelectedFiles([]);
      setSelectedFolder(null);
      if (!result.success && result.error) setError(result.error);

      // Refresh library stats
      if (result.success) {
        await refreshLibraryData();
      }

    } catch (err) {
      setError('Import failed: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    const validFiles = files.filter(file => {
      try {
        validateFile(file);
        return true;
      } catch {
        return false;
      }
    });

    if (validFiles.length !== files.length) {
      setError(`Some files were skipped. Only ${SUPPORTED_FORMATS.join(', ')} formats are supported, max ${MAX_FILE_SIZE / (1024 * 1024)}MB each`);
    }

    const selected = validFiles.map((file) => {
      const path = window.electronAPI.getPathForFile(file);
      return { path, name: file.name, size: file.size };
    }).filter((file) => file.path);
    setSelectedFiles((prev) => [...prev, ...selected]);
  }, []);

  const getTotalFileSize = () => {
    return selectedFiles.reduce((total, file) => total + file.size, 0);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-text-primary sm:text-3xl">Import Music</h2>
          <p className="text-text-secondary">Add music files to your library from your computer</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate('/library')}
        >
          Cancel
        </Button>
      </div>

      {error && (
        <Card className="p-4 mb-6 bg-red-900/20 border-red-500/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="break-words text-red-400">{error}</p>
          </div>
        </Card>
      )}

      {/* Import Progress */}
      {isImporting && (
        <Card className="p-6 mb-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-text-primary">Importing Files</h3>
            <span className="text-sm text-text-secondary">
              {importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}% complete
            </span>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-3 mb-3">
            <div
              className="bg-accent h-3 rounded-full transition-all duration-300"
              style={{ width: importProgress.total > 0 ? `${Math.round((importProgress.current / importProgress.total) * 100)}%` : '0%' }}
            />
          </div>
          <p className="text-sm text-text-secondary text-center">{importProgress.message}</p>
        </Card>
      )}

      {/* Import Results */}
      {importResults && !isImporting && (
        <Card className={`mb-6 p-6 ${importResults.success ? 'border-green-500/30 bg-green-900/20' : 'border-red-500/30 bg-red-900/20'}`}>
          <h3 className="font-semibold text-text-primary mb-4">
            {importResults.success ? 'Import Complete' : 'Import Failed'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="min-w-0 text-center">
              <div className="text-2xl font-bold text-green-400">{importResults.imported || 0}</div>
              <div className="text-xs text-text-secondary">Imported</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{importResults.duplicates || 0}</div>
              <div className="text-xs text-text-secondary">Duplicates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{importResults.errors || 0}</div>
              <div className="text-xs text-text-secondary">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">{importResults.skipped || 0}</div>
              <div className="text-xs text-text-secondary">Skipped</div>
            </div>
          </div>
          {importResults.folder && (
            <p className="text-sm text-text-secondary mt-4 text-center">
              Imported from: {importResults.folder}
            </p>
          )}
        </Card>
      )}

      {/* Main Import Interface */}
      {!importResults && !isImporting && (
        <div className="space-y-6">
          {/* Drop Zone */}
          <Card
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 transition-all hover:border-accent/50 hover:bg-accent/5 sm:p-12 ${
              isDragOver
                ? 'border-accent bg-accent/10'
                : 'border-border-default'
            }`}
            onClick={handleFileSelect}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                isDragOver ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-secondary'
              }`}>
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
              </h3>
              <p className="text-text-secondary mb-4">
                or <span className="text-accent font-medium">click to browse</span>
              </p>
              <p className="text-sm text-text-secondary">
                Supported formats: {SUPPORTED_FORMATS.join(', ')} • Max size: {MAX_FILE_SIZE / (1024 * 1024)}MB
              </p>
            </div>
          </Card>

          {/* Selected Files and Folder */}
          {(selectedFiles.length > 0 || selectedFolder) && (
            <div className="space-y-4">
              {selectedFiles.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-semibold text-text-primary mb-4">
                    Selected Files ({selectedFiles.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5 text-text-secondary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                            <p className="text-xs text-text-secondary">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeSelectedFile(index)}
                          className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border-default">
                      <p className="text-sm text-text-secondary">
                        Total size: {formatFileSize(getTotalFileSize())}
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {selectedFolder && (
                <Card className="p-5">
                  <h3 className="font-semibold text-text-primary mb-4">
                    Selected Folder
                  </h3>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-5 h-5 text-text-secondary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{selectedFolder}</p>
                        <p className="text-xs text-text-secondary">Full folder scan</p>
                      </div>
                    </div>
                    <button
                      onClick={removeSelectedFolder}
                      className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {(selectedFiles.length > 0 || selectedFolder) && !isImporting && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedFiles([]);
                  setSelectedFolder(null);
                  setError(null);
                }}
              >
                Clear
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowOptionsModal(true)}
                >
                  Options
                </Button>
                <Button
                  variant="primary"
                  onClick={scanFiles}
                  icon={<Music className="w-4 h-4" />}
                >
                  Import
                </Button>
              </div>
            </div>
          )}

          {/* Quick Import from Default Folder */}
          {defaultMusicFolder && (
            <Card className="p-5 bg-accent/5 border-accent/30">
              <h3 className="font-semibold text-text-primary mb-2">Quick Import</h3>
              <p className="text-sm text-text-secondary mb-4">
                Default music folder: <span className="text-accent">{defaultMusicFolder}</span>
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedFolder(defaultMusicFolder);
                  setShowOptionsModal(true);
                }}
                icon={<FolderOpen className="w-4 h-4" />}
              >
                Import from Default Folder
              </Button>
            </Card>
          )}

          {!selectedFiles.length && !selectedFolder && !defaultMusicFolder && (
            <EmptyState
              icon={Music}
              title="No files selected"
              subtitle="Drag and drop music files or folders, or click to browse"
            />
          )}
        </div>
      )}

      {/* Options Modal */}
      <Modal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        title="Import Options"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Duplicate Handling
            </label>
            <select
              value={scanOptions.duplicateHandling}
              onChange={(e) => setScanOptions((prev) => ({ ...prev, duplicateHandling: e.target.value }))}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="skip">Skip (default)</option>
              <option value="replace">Replace existing</option>
            </select>
          </div>
          <label className="flex items-center gap-3 text-sm text-text-primary">
            <input type="checkbox" checked={scanOptions.includeSubfolders} onChange={(event) => setScanOptions((previous) => ({ ...previous, includeSubfolders: event.target.checked }))} />
            Include subfolders when importing a folder
          </label>
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => setShowOptionsModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowOptionsModal(false)}
            >
              Apply
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
