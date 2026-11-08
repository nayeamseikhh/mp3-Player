// Background Sync Service for Phase 21
// Manages offline-first data synchronization with IndexedDB change queue

const SYNC_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 5000,
  batchSize: 50,
  syncIntervalMs: 30000,
  // Progress tracking
  progressSteps: ['preparing', 'detecting_changes', 'resolving_conflicts', 'uploading', 'downloading', 'finalizing'],
};

const STORAGE_KEYS = {
  CHANGE_QUEUE: 'mymusicplayer:sync:changeQueue',
  SYNC_METADATA: 'mymusicplayer:sync:metadata',
  LAST_SYNC: 'mymusicplayer:sync:lastSync',
};

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingChanges = [];
    this.isSyncing = false;
    this.syncInProgress = false;
    this.listeners = [];
    this.lastSyncTime = null;
    this.syncVersion = '1.0.0';
    this.changeCounter = 0;
    this.currentProgress = null;
  }

  // Event listeners
  on(event, callback) {
    if (!this.listeners.includes(callback)) {
      this.listeners.push(callback);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  emit(event) {
    this.listeners.forEach((callback) => callback(event));
  }

  // Initialize sync state from IndexedDB or localStorage
  async init() {
    try {
      const metadata = await this.loadFromStorage(SYNC_METADATA);
      if (metadata) {
        this.pendingChanges = metadata.changes || [];
        this.lastSyncTime = metadata.lastSync || null;
        this.syncVersion = metadata.syncVersion || '1.0.0';
        this.changeCounter = metadata.changeCounter || 0;
      }
      return true;
    } catch (error) {
      console.error('Failed to init sync service:', error);
      return false;
    }
  }

  async loadFromStorage(key) {
    return new Promise((resolve, reject) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) {
          resolve(null);
          return;
        }
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  }

  async saveToStorage(key, value) {
    return new Promise((resolve, reject) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Track a change event (called from stores when data changes)
  async trackChange(type, data) {
    this.changeCounter += 1;
    const change = {
      id: this.changeCounter,
      type, // 'song:add' | 'song:update' | 'playlist:add' etc
      timestamp: Date.now(),
      data,
      status: 'pending',
    };

    this.pendingChanges.push(change);
    await this.saveToStorage(SYNC_METADATA, {
      changes: this.pendingChanges,
      lastSync: this.lastSyncTime,
      syncVersion: this.syncVersion,
      changeCounter: this.changeCounter,
    });

    this.emit('change:tracked');
    return change;
  }

  // Get current pending changes
  getPendingChanges() {
    return [...this.pendingChanges];
  }

  // Get pending change count
  getPendingChangeCount() {
    return this.pendingChanges.length;
  }

  // Clear change queue after successful sync
  async clearChangeQueue() {
    this.pendingChanges = [];
    await this.saveToStorage(SYNC_METADATA, {
      changes: [],
      lastSync: this.lastSyncTime,
      syncVersion: this.syncVersion,
      changeCounter: this.changeCounter,
    });
    this.emit('queue:cleared');
  }

  // Start background sync process
  async start() {
    this.isOnline = navigator.onLine;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('status:online');
      // Attempt sync when back online
      this.attemptSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('status:offline');
      // Save pending changes to localStorage for persistence
      this.persistPendingChanges();
      this.emit('status:offline');
    });

    // Check for pending changes periodically
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.attemptSync();
      }
    }, SYNC_CONFIG.syncIntervalMs);

    this.emit('sync:started');
    return true;
  }

  async stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
  }

  // Persist pending changes to localStorage (offline-first)
  async persistPendingChanges() {
    try {
      await this.saveToStorage(SYNC_METADATA, {
        changes: this.pendingChanges,
        lastSync: this.lastSyncTime,
        syncVersion: this.syncVersion,
        changeCounter: this.changeCounter,
      });
    } catch (error) {
      console.error('Failed to persist sync changes:', error);
    }
  }

  // Attempt to sync pending changes
  async attemptSync() {
    if (this.syncInProgress) return false;
    if (!this.isOnline) {
      this.emit('status:offline');
      return false;
    }

    this.syncInProgress = true;
    this.currentProgress = {
      step: 'preparing',
      currentStepIndex: 0,
      steps: [...SYNC_CONFIG.progressSteps],
      totalChanges: 0,
      processedChanges: 0,
      conflicts: 0,
    };
    this.emit('sync:started');

    try {
      // Step 1: Preparing
      this.updateProgress('preparing', { processedChanges: 0 });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 2: Detecting changes
      this.currentProgress.currentStepIndex = 1;
      this.currentProgress.step = 'detecting_changes';
      this.emit('sync:progress', { ...this.currentProgress });
      const changes = this.getPendingChanges();
      this.currentProgress.totalChanges = changes.length;
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (changes.length === 0) {
        this.currentProgress.currentStepIndex = 5;
        this.currentProgress.step = 'finalizing';
        this.emit('sync:progress', { ...this.currentProgress });
        this.lastSyncTime = Date.now();
        await this.saveToStorage(SYNC_METADATA, {
          changes: [],
          lastSync: this.lastSyncTime,
          syncVersion: this.syncVersion,
          changeCounter: this.changeCounter,
        });
        this.emit('sync:synced');
        this.clearProgress();
        return true;
      }

      // Step 3: Resolving conflicts
      this.currentProgress.currentStepIndex = 2;
      this.currentProgress.step = 'resolving_conflicts';
      this.emit('sync:progress', { ...this.currentProgress });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 4: Uploading
      this.currentProgress.currentStepIndex = 3;
      this.currentProgress.step = 'uploading';
      this.emit('sync:progress', { ...this.currentProgress });
      const batch = changes.slice(0, SYNC_CONFIG.batchSize);
      const results = await this.syncBatch(batch);
      this.currentProgress.processedChanges = results.length;

      // Remove successful changes from queue
      this.pendingChanges = this.pendingChanges.filter((change) => {
        const result = results.find((r) => r.id === change.id);
        return !result?.success;
      });

      // Persist updated queue
      await this.persistPendingChanges();

      // Step 5: Downloading
      this.currentProgress.currentStepIndex = 4;
      this.currentProgress.step = 'downloading';
      this.emit('sync:progress', { ...this.currentProgress });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if all changes synced
      if (this.getPendingChangeCount() === 0) {
        this.currentProgress.currentStepIndex = 5;
        this.currentProgress.step = 'finalizing';
        this.emit('sync:progress', { ...this.currentProgress });
        this.lastSyncTime = Date.now();
        await this.saveToStorage(SYNC_METADATA, {
          changes: [],
          lastSync: this.lastSyncTime,
          syncVersion: this.syncVersion,
          changeCounter: this.changeCounter,
        });
        this.emit('sync:synced');
      } else {
        this.currentProgress.step = 'error';
        this.emit('sync:error', { error: `${this.getPendingChangeCount()} changes still pending` });
      }

      this.clearProgress();
      return true;
    } catch (error) {
      this.currentProgress.step = 'error';
      this.emit('sync:error', { error: error.message });
      this.clearProgress();
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync a batch of changes (in real implementation, this would push to remote server)
  async syncBatch(changes) {
    const results = [];
    for (const change of changes) {
      try {
        // Simulate successful sync for local operations
        // In production, this would send to remote sync endpoint
        change.status = 'synced';
        results.push({ id: change.id, success: true, type: change.type });
      } catch (error) {
        results.push({ id: change.id, success: false, error: error.message });
      }
    }
    return results;
  }

  // Get sync statistics
  getSyncStats() {
    return {
      pendingChanges: this.getPendingChangeCount(),
      lastSyncTime: this.lastSyncTime,
      syncVersion: this.syncVersion,
      isOnline: this.isOnline,
      isSyncing: this.syncInProgress,
      status: this.isOnline ? 'online' : 'offline',
      progress: null, // Will hold progress info during sync
    };
  }

  // Get current sync progress
  getProgress() {
    return this.currentProgress || null;
  }

  // Update sync progress
  updateProgress(step, data) {
    this.currentProgress = {
      step,
      currentStepIndex: this.currentProgress?.currentStepIndex || 0,
      steps: [...SYNC_CONFIG.progressSteps],
      ...data,
    };
  }

  // Clear sync progress
  clearProgress() {
    this.currentProgress = null;
  }
}

export const syncService = new SyncService();

export default syncService;
