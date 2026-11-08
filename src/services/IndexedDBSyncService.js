// IndexedDB-based offline sync service for Phase 21
// Provides persistent change queue for offline data synchronization

const STORE_NAME = 'syncQueue';
const DB_NAME = 'MyMusicPlayerSync';
const DB_VERSION = 1;

class IndexedDBSyncService {
  constructor() {
    this.db = null;
    this.dbOpenPromise = null;
    this.isReady = false;
    this.eventTarget = new EventTarget();
    this.onChanges = [];
    this.lastSyncTime = null;
    this.changeCounter = 0;
  }

  onChange(callback) {
    this.onChanges.push(callback);
    return () => {
      this.onChanges = this.onChanges.filter((cb) => cb !== callback);
    };
  }

  emitChange(event, detail) {
    this.onChanges.forEach((callback) => callback(event, detail));
  }

  // Initialize or open the IndexedDB database
  async init() {
    if (this.db) {
      return this.db;
    }

    if (!this.dbOpenPromise) {
      this.dbOpenPromise = this.openDatabase();
    }

    try {
      this.db = await this.dbOpenPromise;
      this.isReady = true;
      return this.db;
    } catch (error) {
      console.error('Failed to initialize IndexedDB sync service:', error);
      throw error;
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Failed to open IndexedDB database:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        this.db = event.target.result;

        // Create object store for sync queue
        if (!this.db.objectStoreNames.contains(STORE_NAME)) {
          const store = this.db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          // Index for type and status
          store.createIndex('byType', 'type', { unique: false });
          store.createIndex('byStatus', 'status', { unique: false });
          store.createIndex('byTimestamp', 'timestamp', { unique: false });
        }

        // Also store metadata in a separate store
        if (!this.db.objectStoreNames.contains('metadata')) {
          this.db.createObjectStore('metadata', {
            keyPath: 'key',
          });
        }
      };
    });
  }

  async getMetadata() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');

      const request = store.get('current');
      request.onsuccess = () => {
        const metadata = request.result || {
          version: '1.0.0',
          lastSync: null,
          changeCounter: 0,
          onlineStatus: true,
        };
        resolve(metadata);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateMetadata(metadata) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');

      metadata.lastModified = Date.now();
      const request = store.put({ ...metadata, key: 'current' });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Queue a change for sync
  async queueChange(type, data) {
    await this.init();
    const change = {
      type,
      timestamp: Date.now(),
      data,
      status: 'pending',
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.add(change);
      request.onsuccess = async (event) => {
        change.id = event.target.result;
        this.emitChange('change:queued', change);
        resolve(change.id);

        // Update metadata with new change counter
        const metadata = await this.getMetadata();
        await this.updateMetadata({
          ...metadata,
          changeCounter: (metadata.changeCounter || 0) + 1,
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pending changes
  async getPendingChanges() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const changes = request.result.filter((change) => change.status === 'pending');
        resolve(changes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Update change status (e.g., from 'pending' to 'synced')
  async updateChangeStatus(id, status) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const change = getRequest.result;
        if (!change) {
          resolve(false);
          return;
        }

        change.status = status;
        const putRequest = store.put(change);
        putRequest.onsuccess = () => {
          this.emitChange('change:updated', change);
          resolve(true);
        };
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Get sync statistics
  async getSyncStats() {
    await this.init();
    const metadata = await this.getMetadata();
    const pendingChanges = await this.getPendingChanges();

    return {
      pendingChanges: pendingChanges.length,
      lastSyncTime: metadata.lastSync,
      syncVersion: metadata.version,
      changeCounter: metadata.changeCounter || 0,
      onlineStatus: metadata.onlineStatus || true,
    };
  }

  // Clear all synced changes (but keep sync metadata)
  async clearSyncQueue() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.clear();
      request.onsuccess = () => {
        this.emitChange('queue:cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Store metadata (version, last sync, etc.)
  async setMetadata(key, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');

      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get metadata value
  async getMetadataValue(key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');

      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  // Check if IndexedDB is available
  isAvailable() {
    return typeof indexedDB !== 'undefined' && indexedDB.isAvailable;
  }

  // Cleanup old changes based on age
  async cleanupOldChanges(maxAgeMs = 24 * 60 * 60 * 1000) {
    // 24 hours default
    await this.init();
    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const now = Date.now();
    const cursor = store.openCursor();

    cursor.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.timestamp < now - maxAgeMs && cursor.value.status === 'synced') {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }

  // Export change queue for backup/restore
  async exportChanges() {
    await this.init();
    const changes = await this.getPendingChanges();
    return {
      changes,
      exportTime: Date.now(),
      version: '1.0.0',
    };
  }

  // Import changes from backup
  async importChanges(data) {
    if (!data || !data.changes) {
      throw new Error('Invalid sync data');
    }

    await this.init();
    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const batch = data.changes.filter((change) => !change.id);
    await new Promise((resolve, reject) => {
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < batch.length; i += batchSize) {
        batches.push(batch.slice(i, i + batchSize));
      }

      const processBatch = async (batch) => {
        if (batch.length === 0) {
          resolve();
          return;
        }
        const batchTransaction = this.db.transaction([STORE_NAME], 'readwrite');
        const batchStore = batchTransaction.objectStore(STORE_NAME);
        for (const change of batch) {
          const id = batchStore.add({ ...change, status: 'pending' });
        }
        await new Promise((r, rj) => {
          batchTransaction.oncomplete = () => r();
          batchTransaction.onerror = () => rj(batchTransaction.error);
        });
        processBatch(batches.shift());
      };
      processBatch(batches.shift());
    });
  }
}

export const indexedDBSyncService = new IndexedDBSyncService();
export default indexedDBSyncService;
