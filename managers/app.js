const { ipcMain, app, Menu, Notification, Tray, BrowserWindow, dialog } = require("electron"),
    Store = require("electron-store"),
    config = new Store({}),
    path = require("path"),
    { autoUpdater } = require("electron-updater"),
    AutoLaunch = require("auto-launch"),
    fetch = require("fetch").fetchUrl,
    fs = require("fs"),
    { connect } = require("../managers/discord.js");

let langString = require(`../language/${config.get("language")}.json`);

app.dev = (app.isPackaged) ? false : true;

app.on("ready", () => {
    console.log("[APP] Starting...");

    let tray = new Tray(path.join(app.isPackaged ? process.resourcesPath : __dirname + "/..", "/assets/logo.png")),
        autoLaunch = new AutoLaunch({
            name: app.dev ? "AMRPC - ALPHA - DEV" : "AMRPC - ALPHA",
            path: app.getPath("exe")
        }),
        cmenu = Menu.buildFromTemplate([
            { label: `${app.dev ? "AMRPC - DEV" : "AMRPC"} V${app.getVersion()}`, icon: path.join(app.isPackaged ? process.resourcesPath : __dirname + "/..", "/assets/tray/logo@18.png"), enabled: false },
            { label: (config.get("appleMusicElectron")) ? "Apple Music Electron" : "iTunes", enabled: false },
            { type: "separator" },
            { label: langString.tray.restart, click() { app.restart() } },
            { label: langString.tray.checkForUpdates, click() { app.checkForUpdates() } },
            { type: "separator" },
            { label: langString.tray.openSettings, click() { app.mainWindow.show() } },
            { type: "separator" },
            { label: langString.tray.quit, click() { app.isQuiting = true, app.quit() } }
        ]);

    app.on("quit", () => tray.destroy());
    app.on("before-quit", function () {
        app.isQuiting = true;
    });

    tray.setToolTip(app.dev ? "AMRPC - ALPHA - DEV" : "AMRPC - ALPHA");
    tray.setContextMenu(cmenu);
    tray.on("right-click", () => tray.update());
    tray.on("click", () => app.mainWindow.show());

    if (config.get("autolaunch")) autoLaunch.enable();
    else autoLaunch.disable();

    app.mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(app.isPackaged ? process.resourcesPath : __dirname  + "/..", "/assets/logo.png"),
        frame: false,
        resizable: false
    });

    app.mainWindow.loadFile(path.join(app.isPackaged ? process.resourcesPath + "/app.asar/" : __dirname + "/../", "browser/index.html"));

    require("@electron/remote/main").initialize();

    app.mainWindow.on("close", function (event) {
        if (!app.isQuiting) {
            event.preventDefault();
            app.mainWindow.hide();

            return false;
        }
    });

    autoUpdater.on("update-available", (info) => {
        console.log("Update available.");
        app.sendToMainWindow("asynchronous-message", {
            "type": "new-update-available",
            "data": {
                "version": info.version
            }
        });
        //autoUpdater.downloadUpdate();
    });

    autoUpdater.on("update-not-available", (info) => {
        console.log("No updates available");
    });

    autoUpdater.on("error", (err) => {
        console.log("Error in auto-updater. " + err);
    });

    autoUpdater.on("download-progress", (progressObj) => {
        app.sendToMainWindow("asynchronous-message", {
            "type": "download-progress-update",
            "data": {
                "percent": progressObj.percent,
                "transferred": progressObj.transferred,
                "total": progressObj.total,
                "speed": progressObj.bytesPerSecond
            }
        });
    });

    autoUpdater.on("update-downloaded", (info) => {
        app.sendToMainWindow("asynchronous-message", "Update downloaded");
        autoUpdater.quitAndInstall();
    });

    ipcMain.on("autolaunch-change", (e, d) => {
        if (config.get("autolaunch")) autoLaunch.enable();
        else autoLaunch.disable();

        console.log(`Autolaunch is now ${(config.get("autolaunch")) ? "enabled" : "disabled"}`);
    });

    app.mainWindow.hide();
    connect();
    app.checkForUpdates();

    setInterval(() => {
        app.checkForUpdates();
    }, 600e3);

    console.log("[APP] Ready");
});

app.checkForUpdates = () => {
    // console.log("Checking for updates...");

    // autoUpdater.checkForUpdatesAndNotify();

    // if (!app.isPackaged) return;

    // fetch("https://raw.githubusercontent.com/ZephraCloud/Apple-Music-RPC/main/covers.json", { cache: "no-store" }, function (error, meta, body) {
    //     if (!body) return console.log(`Error ${error}. Cover check was canceled.`);
    //     body = JSON.parse(body.toString());

    //     console.log("Checking for new covers...");

    //     if (!isEqual(require("../covers.json"), body)) {
    //         fs.writeFile(path.join(app.isPackaged ? process.resourcesPath + "/app.asar.unpacked" : __dirname + "/..", "/covers.json"), JSON.stringify(body, null, 4), function (err) { if (err) console.log(err) });
    //         console.log("Updated covers");

    //         app.showNotification("AMRPC", langString.notification.coverlistUpdated);

    //         setTimeout(() => {
    //             app.relaunch();
    //             app.exit();
    //         }, 1000);
    //     } else console.log("No new covers available");
    // });
}

app.sendToMainWindow = (t, v) => {
    app.mainWindow.webContents.send(t, v)
}

app.showNotification = (title, body) => {
    new Notification({ title: title, body: body, icon: path.join(app.isPackaged ? process.resourcesPath : __dirname + "/..", "/assets/logo.png") }).show();
}

app.restart = () => {
    app.relaunch();
    app.exit();
}

function isEqual(obj1, obj2) {
    const obj1Keys = Object.keys(obj1),
        obj2Keys = Object.keys(obj2);

    if (obj1Keys.length !== obj2Keys.length) return false;

    for (let objKey of obj1Keys) {
        if (obj1[objKey] !== obj2[objKey]) {
            if (typeof obj1[objKey] == "object" && typeof obj2[objKey] == "object") {
                if (!isEqual(obj1[objKey], obj2[objKey])) return false;
            }
            else return false;
        }
    }

    return true;
}