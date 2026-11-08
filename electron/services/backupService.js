const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function createBackup(dbPath, backupDir) {
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `mymusicplayer-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupName);

    // Copy database file
    fs.copyFileSync(dbPath, backupPath);

    // Also copy WAL file if exists
    const walPath = `${dbPath}-wal`;
    if (fs.existsSync(walPath)) {
      fs.copyFileSync(walPath, `${backupPath}-wal`);
    }

    // Get backup size
    const stats = fs.statSync(backupPath);

    return {
      success: true,
      path: backupPath,
      name: backupName,
      size: stats.size,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function listBackups(backupDir) {
  try {
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db') || f.endsWith('.sqlite'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          path: filePath,
          name: f,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return files;
  } catch (error) {
    return [];
  }
}

function deleteBackup(backupPath) {
  try {
    fs.unlinkSync(backupPath);
    const walPath = `${backupPath}-wal`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function exportSettings(settings) {
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    data: settings,
  };
}

function exportDatabaseData(dbPath) {
  // This would export all data from the database
  // For now, just return the path
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    databasePath: dbPath,
  };
}

module.exports = {
  createBackup,
  listBackups,
  deleteBackup,
  exportSettings,
  exportDatabaseData,
};