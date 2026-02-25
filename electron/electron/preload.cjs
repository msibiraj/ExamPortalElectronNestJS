const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__electronAPI', {
  /** Returns { devToolsOpen: boolean } */
  checkIntegrity: () => ipcRenderer.invoke('check-integrity'),
});
