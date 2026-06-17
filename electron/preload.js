const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath, encoding) => ipcRenderer.invoke('file:read', filePath, encoding),
  getFileInfo: (filePath) => ipcRenderer.invoke('file:getInfo', filePath),
  openPath: (filePath) => ipcRenderer.invoke('file:openPath', filePath),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),

  // Recent files
  getRecentFiles: () => ipcRenderer.invoke('recent:get'),
  addRecentFile: (file) => ipcRenderer.invoke('recent:add', file),
  removeRecentFile: (filePath) => ipcRenderer.invoke('recent:remove', filePath),
  clearRecentFiles: () => ipcRenderer.invoke('recent:clear'),

  // Bookmarks
  getBookmarks: (filePath) => ipcRenderer.invoke('bookmarks:get', filePath),
  addBookmark: (filePath, bookmark) => ipcRenderer.invoke('bookmarks:add', filePath, bookmark),
  removeBookmark: (filePath, bookmarkId) => ipcRenderer.invoke('bookmarks:remove', filePath, bookmarkId),

  // Reading position
  getPosition: (filePath) => ipcRenderer.invoke('position:get', filePath),
  setPosition: (filePath, position) => ipcRenderer.invoke('position:set', filePath, position),

  // Events from main process
  onFileOpened: (callback) => {
    ipcRenderer.on('file:opened', (_event, filePath) => callback(filePath));
    return () => ipcRenderer.removeAllListeners('file:opened');
  },

  // Pull pending open-file path (cold start via macOS "Open With")
  getPendingOpenFile: () => ipcRenderer.invoke('file:getPendingOpenFile'),
});
