const { app, contextBridge, ipcRenderer, shell } = require("electron");

console.log("[BROWSER PRELOAD] Ready");

contextBridge.exposeInMainWorld("electron", {
    appVersion: async () => {
        return await ipcRenderer.invoke("appVersion");
    },
    isDeveloper: async () => {
        return await ipcRenderer.invoke("isDeveloper");
    },
    getLangStrings: (lang) => {
        return require(`../language/${lang}.json`);
    },
    appData: {
        set: (k, v) => {
            return ipcRenderer.invoke("updateAppData", k, v);
        },
        get: (k) => {
            return ipcRenderer.invoke("getAppData", k);
        }
    },
    config: {
        set: (k, v) => {
            return ipcRenderer.invoke("updateConfig", k, v);
        },
        get: (k) => {
            return ipcRenderer.invoke("getConfig", k);
        }
    },
    updateLanguage: (lang) => ipcRenderer.invoke("updateLanguage", lang),
    openURL: (url) => shell.openExternal(url),
    minimize: () => app.mainWindow?.minimize(),
    maximize: () => app.mainWindow?.maximize(),
    close: () => app.mainWindow?.hide(),
});
