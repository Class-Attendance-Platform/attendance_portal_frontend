const { contextBridge, ipcRenderer } = require('electron');

const API_ARG = '--portal-api-base=';
const apiArg = process.argv.find((arg) => arg.startsWith(API_ARG));

contextBridge.exposeInMainWorld('desktop', {
  defaultApiBase: apiArg ? apiArg.slice(API_ARG.length) : '',
  onOpenServerSettings: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('open-server-settings', listener);
    return () => ipcRenderer.removeListener('open-server-settings', listener);
  },
  onGoBack: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('go-back', listener);
    return () => ipcRenderer.removeListener('go-back', listener);
  },
});
