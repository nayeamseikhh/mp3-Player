const { contextBridge, ipcRenderer, webUtils } = require('electron');

function toMediaUrl(filePath) {
  return `music://track/${encodeURIComponent(String(filePath))}`;
}

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
});

contextBridge.exposeInMainWorld('electronAPI', {
  getPathForFile: (file) => webUtils.getPathForFile(file),
  pathToMediaURL: toMediaUrl,
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => {
    const subscription = (event, ...args) => listener(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
});

