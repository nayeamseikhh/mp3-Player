import { useState, useEffect, useCallback, useRef } from 'react';
import { useIpc } from '@context/IPCContext';
import { useSettingsStore } from '@store/store';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Badge from '@components/common/Badge';
import {
  Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Loader, Database, Cloud, CloudOff,
  Clock, Menu, List, ChevronDown, Settings, Plus, Minus, X, AlertTriangle, Activity,
  Upload, Download, Lock, Shield, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { syncService } from '@services/SyncService';
import { indexedDBSyncService } from '@services/IndexedDBSyncService';
import { ConflictList } from '@components/conflict';
import ConflictResolution from '@components/conflict/ConflictResolution';

const SyncStatus = () => {
  const { invoke } = useIpc();
  const {
    theme,
    syncEnabled,
    syncIntervalMinutes,
    autoResolveConflicts,
    conflictResolutionStrategy,
    syncHistory,
    setSyncEnabled,
    setSyncIntervalMinutes,
    setAutoResolveConflicts,
    setConflictResolutionStrategy,
    addSyncHistoryEntry,
  } = useSettingsStore();

  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState({
    status: 'idle',
    lastSync: null,
    pendingChanges: 0,
    error: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({
    pendingChanges: 0,
    lastSyncTime: null,
    syncVersion: '1.0.0',
    changeCounter: 0,
  });
  const [showConflictList, setShowConflictList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState(null);
  const [cloudProvider, setCloudProvider] = useState('local');
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const progressTimerRef = useRef(null);

  const updateStats = async () => {
    try {
      const [syncStats, indexedDBStats] = await Promise.all([
        syncService.getSyncStats(),
        indexedDBSyncService.getSyncStats(),
      ]);
      setSyncStats({
        pendingChanges: syncStats.pendingChanges + indexedDBStats.pendingChanges,
        lastSyncTime: syncStats.lastSyncTime || indexedDBStats.lastSyncTime,
        syncVersion: syncStats.syncVersion || indexedDBStats.syncVersion,
        changeCounter: syncStats.changeCounter + indexedDBStats.changeCounter,
      });
      // Update progress display if syncing
      const progress = syncService.getProgress();
      if (progress) {
        setSyncProgress(progress);
      }
    } catch (error) {
      console.error('Failed to update sync stats:', error);
    }
  };

  const loadConflictCount = async () => {
    try {
      const result = await invoke('mymusicplayer:database:detectConflicts');
      setConflictCount((result.conflicts || []).filter((c) => !c.resolved).length);
    } catch (error) {
      console.error('Failed to load conflict count:', error);
    }
  };

  useEffect(() => {
    // Initialize sync services
    const initServices = async () => {
      try {
        await syncService.init();
        await indexedDBSyncService.init();

        // Subscribe to sync service events
        const unsubscribeSync = syncService.on('sync:started', () => setSyncStatus((prev) => ({ ...prev, status: 'syncing' })));
        const unsubscribeSynced = syncService.on('sync:synced', () => {
          setSyncStatus((prev) => ({ ...prev, status: 'synced' }));
          setSyncProgress(null);
        });
        const unsubscribeError = syncService.on('sync:error', (e) => {
          setSyncStatus((prev) => ({ ...prev, status: 'error', error: e.error }));
          setSyncProgress(null);
        });
        const unsubscribeProgress = syncService.on('sync:progress', (progress) => {
          setSyncProgress(progress);
          progressTimerRef.current = Date.now();
        });
        const unsubscribeQueue = syncService.on('queue:cleared', () => setSyncStatus((prev) => ({ ...prev, pendingChanges: 0 })));
        const unsubscribeChange = syncService.on('change:tracked', () => updateStats());

        // Also subscribe to IndexedDB sync service
        const unsubscribeIndexedDB = indexedDBSyncService.onChange(updateStats);

        // Load initial stats
        await updateStats();
        await loadConflictCount();

        // Start background sync if enabled
        if (syncEnabled) {
          await syncService.start();
        }

        // Cleanup on unmount
        return () => {
          unsubscribeSync?.();
          unsubscribeSynced?.();
          unsubscribeError?.();
          unsubscribeProgress?.();
          unsubscribeQueue?.();
          unsubscribeChange?.();
          unsubscribeIndexedDB?.();
          syncService.stop();
        };
      } catch (error) {
        console.error('Failed to initialize sync services:', error);
      }
    };

    initServices();

    // Check network status
    if (navigator.onLine) {
      setIsOnline(true);
    } else {
      setIsOnline(false);
      setSyncStatus((prev) => ({
        ...prev,
        status: 'error',
        error: 'You are offline. Changes will be queued for sync when you reconnect.',
      }));
    }

    // Listen for online/offline events
    window.addEventListener('online', () => {
      setIsOnline(true);
      setSyncStatus((prev) => ({ ...prev, error: null }));
      if (syncEnabled) syncService.attemptSync();
    });
    window.addEventListener('offline', () => {
      setIsOnline(false);
      setSyncStatus((prev) => ({
        ...prev,
        status: 'error',
        error: 'You are offline. Changes will be queued for sync when you reconnect.',
      }));
    });

    // Progress update interval for display (auto-advance if stuck)
    const progressTimer = setInterval(() => {
      if (syncProgress && syncProgress.step !== 'finalizing') {
        // Check if progress is stale
        const now = Date.now();
        if (progressTimerRef.current && now - progressTimerRef.current > 30000) {
          setSyncProgress(null);
          progressTimerRef.current = null;
        }
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', () => {
        setIsOnline(true);
        setSyncStatus((prev) => ({ ...prev, error: null }));
        if (syncEnabled) syncService.attemptSync();
      });
      window.removeEventListener('offline', () => {
        setIsOnline(false);
        setSyncStatus((prev) => ({
          ...prev,
          status: 'error',
          error: 'You are offline. Changes will be queued for sync when you reconnect.',
        }));
      });
      clearInterval(progressTimer);
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      syncService.stop();
    };
  }, [syncEnabled, invoke]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const startTime = Date.now();
    setSyncStatus((prev) => ({ ...prev, status: 'syncing' }));
    try {
      await syncService.attemptSync();
      await updateStats();
      await loadConflictCount();

      const stats = await syncService.getSyncStats();

      // Add sync history entry
      const historyEntry = {
        id: `sync-${Date.now()}`,
        timestamp: startTime,
        status: stats.pendingChanges === 0 ? 'success' : 'partial',
        pendingChanges: stats.pendingChanges,
        resolvedConflicts: 0,
        error: stats.pendingChanges > 0 ? `${stats.pendingChanges} changes still pending` : null,
      };
      addSyncHistoryEntry(historyEntry);

      if (stats.pendingChanges === 0) {
        setSyncStatus((prev) => ({
          ...prev,
          status: 'synced',
          lastSync: new Date(),
          pendingChanges: 0,
          error: null,
        }));
        toast.success('Sync completed successfully');
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          status: 'error',
          error: `${stats.pendingChanges} changes still pending`,
        }));
      }
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        status: 'error',
        error: error.message,
      }));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEncryptToggle = (enabled) => {
    setEncryptionEnabled(enabled);
    if (!enabled) {
      setIsEncrypting(true);
      // Simulate encryption toggle with delay
      setTimeout(() => {
        setIsEncrypting(false);
      }, 800);
    }
  };

  const handleCloudProviderChange = (provider) => {
    setCloudProvider(provider);
  };

  const handleResolveConflicts = async () => {
    // Auto-resolve conflicts using the preferred strategy
    setIsSyncing(true);
    try {
      const result = await invoke('mymusicplayer:database:detectConflicts');
      const conflicts = result.conflicts || [];
      let resolved = 0;

      for (const conflict of conflicts) {
        if (!conflict.resolved) {
          await invoke('mymusicplayer:database:resolveConflict', conflict.id, conflictResolutionStrategy, null);
          resolved++;
        }
      }

      await loadConflictCount();
      await updateStats();

      if (resolved > 0) {
        addSyncHistoryEntry({
          id: `conflict-${Date.now()}`,
          timestamp: Date.now(),
          status: 'success',
          pendingChanges: 0,
          resolvedConflicts: resolved,
          error: null,
        });
        toast.success(`Resolved ${resolved} conflict${resolved !== 1 ? 's' : ''}`);
      } else {
        toast.info('No pending conflicts to resolve');
      }
    } catch (error) {
      toast.error(`Failed to resolve conflicts: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSettings = () => setShowSettings((prev) => !prev);
  const toggleConflictList = () => setShowConflictList((prev) => !prev);

  const getStatusIcon = () => {
    if (!isOnline) return <CloudOff className="w-4 h-4 text-red-400" />;
    if (isSyncing) return <Loader className="w-4 h-4 text-yellow-400 animate-spin" />;
    if (syncStatus.status === 'synced') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (syncStatus.status === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />;
    return <Cloud className="w-4 h-4 text-text-secondary" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline - changes will sync when connected';
    if (isSyncing) return 'Syncing...';
    if (syncStatus.status === 'synced') return 'All data synced';
    if (syncStatus.status === 'error') return 'Sync error - check connection';
    return 'Online';
  };

  const getStepName = () => {
    if (!syncProgress) return 'Waiting...';
    const names = {
      preparing: 'Preparing sync...',
      detecting_changes: 'Detecting changes...',
      resolving_conflicts: 'Resolving conflicts...',
      uploading: 'Uploading changes...',
      downloading: 'Downloading changes...',
      finalizing: 'Finalizing...',
      error: 'Sync error',
    };
    return names[syncProgress.step] || syncProgress.step;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Main sync status card */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-medium text-text-primary">{getStatusText()}</p>
              <div className="flex items-center gap-4 text-xs text-text-secondary mt-1">
                {syncStatus.lastSync && (
                  <span>Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}</span>
                )}
                {syncStats.pendingChanges > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full">
                    <Database className="w-3 h-3" />
                    {syncStats.pendingChanges} pending
                  </span>
                )}
                {conflictCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
                  </span>
                )}
                {syncStatus.lastSync || syncStats.lastSyncTime ? (
                  <span>Total changes: {syncStats.changeCounter}</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant="outline"
              onClick={toggleConflictList}
              disabled={isSyncing}
              className={`text-xs ${conflictCount > 0 ? 'text-red-400 border-red-400/50 hover:bg-red-400/10' : ''}`}
            >
              <List className="w-3 h-3 mr-1" />
              Conflicts
            </Button>
            <Button
              size="small"
              variant="outline"
              onClick={toggleSettings}
              className="text-xs"
            >
              <Settings className="w-3 h-3 mr-1" />
            </Button>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="p-2 rounded-lg bg-bg-tertiary hover:bg-accent/10 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Sync now"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {syncStatus.error && (
          <p className="text-xs text-red-400 mt-2">{syncStatus.error}</p>
        )}
      </Card>

      {/* Sync progress indicator */}
      {isSyncing || syncProgress && syncProgress.step !== 'idle' && (
        <div className="p-4 bg-gradient-to-b from-blue-500/10 to-indigo-500/10 rounded-lg border border-blue-500/20 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-blue-600">Sync Progress</p>
              <p className="text-xs text-blue-400 step-name">{getStepName()}</p>
            </div>
            <span className={`text-xs font-medium ${syncProgress?.step === 'finalizing' ? 'text-green-600' : ''}`}>Step {syncProgress?.currentStepIndex + 1}/{syncProgress?.steps?.length || 6}</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${syncProgress?.currentStepIndex > 0 ? Math.min(15, syncProgress.currentStepIndex * 3 + 20) : 0}%` }}></div>
          </div>
        </div>
      )}

      {/* Auto-resolve conflicts button */}
      {conflictCount > 0 && autoResolveConflicts && (
        <Card className="p-3 bg-red-500/5 border-red-500/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-text-primary">
              {conflictCount} conflict{conflictCount !== 1 ? 's' : ''} detected. Auto-resolve with '{conflictResolutionStrategy}' strategy.
            </span>
            <Button size="small" onClick={handleResolveConflicts} disabled={isSyncing} className="ml-auto">
              Resolve All
            </Button>
          </div>
        </Card>
      )}

      {/* Conflict list panel */}
      {showConflictList && (
        <div className="flex flex-col space-y-3">
          <ConflictList onAllResolved={() => {
            setShowConflictList(false);
            loadConflictCount();
            toast.success('All conflicts resolved');
          }} />
        </div>
      )}

      {/* Sync settings panel */}
      {showSettings && (
        <div className="flex flex-col space-y-3 p-3 bg-bg-secondary rounded-lg border border-border-default">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">Sync Settings</h3>
            <Button size="small" variant="ghost" onClick={toggleSettings}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-text-secondary">Auto-sync enabled</span>
              <button
                onClick={() => setSyncEnabled(!syncEnabled)}
                className={`relative inline-block w-10 h-6 rounded-full transition-colors ${syncEnabled ? 'bg-accent' : 'bg-bg-tertiary'}`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transform transition-transform ${syncEnabled ? 'translate-x-4' : 'translate-x-1'}`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-text-secondary">Auto-resolve conflicts</span>
              <button
                onClick={() => setAutoResolveConflicts(!autoResolveConflicts)}
                className={`relative inline-block w-10 h-6 rounded-full transition-colors ${autoResolveConflicts ? 'bg-accent' : 'bg-bg-tertiary'}`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transform transition-transform ${autoResolveConflicts ? 'translate-x-4' : 'translate-x-1'}`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-text-secondary">Conflict strategy</span>
              <button
                onClick={() => {
                  const strategies = ['local_wins', 'remote_wins', 'merge'];
                  const currentIdx = strategies.indexOf(conflictResolutionStrategy);
                  setConflictResolutionStrategy(strategies[(currentIdx + 1) % strategies.length]);
                }}
                className="bg-bg-tertiary rounded px-2 py-1 text-text-primary border border-border-default"
              >
                {conflictResolutionStrategy.replace('_', ' ')}
              </button>
            </label>
            <div>
              <span className="block text-text-secondary mb-1">Sync interval</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSyncIntervalMinutes(syncIntervalMinutes - 5)}
                  className="p-1.5 hover:bg-accent/10 rounded"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center text-text-primary">{syncIntervalMinutes} min</span>
                <button
                  onClick={() => setSyncIntervalMinutes(syncIntervalMinutes + 5)}
                  className="p-1.5 hover:bg-accent/10 rounded"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div>
              <span className="block text-text-secondary mb-1">Cloud provider</span>
              <div className="flex items-center gap-2">
                {['local', 'dropbox', 'google_drive', 'icloud'].map((provider) => (
                  <button
                    key={provider}
                    onClick={() => handleCloudProviderChange(provider)}
                    className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                      cloudProvider === provider
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-bg-tertiary text-text-secondary border-border-default hover:border-accent/50'
                    }`}
                  >
                    {provider.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-1 text-text-secondary">
                <Shield className="w-3 h-3" />
                Encrypt sync data
              </span>
              <button
                onClick={() => handleEncryptToggle(!encryptionEnabled)}
                disabled={isEncrypting}
                className={`relative inline-block w-10 h-6 rounded-full transition-colors ${encryptionEnabled ? 'bg-accent' : 'bg-bg-tertiary'}`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transform transition-transform ${encryptionEnabled ? 'translate-x-4' : 'translate-x-1'}`}
                />
              </button>
            </label>
          </div>
          <div className="mt-2">
            <span className="block text-[10px] text-text-secondary mb-1">Sync History</span>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {syncHistory.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-1 bg-bg-tertiary rounded text-[10px]">
                  <span className="text-text-secondary">
                    {new Date(entry.timestamp).toLocaleTimeString()} - {entry.status}
                  </span>
                  <Badge variant={entry.status === 'success' ? 'success' : 'danger'}>
                    {entry.resolvedConflicts > 0 ? `${entry.resolvedConflicts} conflict${entry.resolvedConflicts !== 1 ? 's' : ''}` : entry.pendingChanges > 0 ? `${entry.pendingChanges} pending` : 'OK'}
                  </Badge>
                </div>
              ))}
              {syncHistory.length === 0 && (
                <div className="text-[10px] text-text-secondary text-center py-2">No sync history yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatus;
