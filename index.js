const { ipcMain, app, Menu, Notification, Tray, BrowserWindow, dialog } = require("electron"),
    Store = require("electron-store"),
    { autoUpdater } = require("electron-updater"),
    path = require("path"),
    log = require("electron-log"),
    url = require("url"),
    fetch = require("fetch").fetchUrl,
    fs = require("fs"),
    { logInfo, logSuccess, logError } = require("./managers/log");

const config = new Store({
        defaults: {
            autolaunch: true,
            show: true,
            hideOnPause: true,
            showAlbumCover: true,
            performanceMode: false,
            listenAlong: false,
            appleMusicElectron: false,
            colorTheme: "white",
            language: "en_US",
            cover: "applemusic-logo",
            rpcDetails: "%title% - %album%",
            rpcState: "%artist%"
        }
    }),
    appData = new Store({
        name: "data", defaults: {
            userCountUsageAsked: false,
            nineelevenAsked: false,
            appleEventAsked: false,
            nineelevenCovers: false,
            changelog: {},
            zephra: {
                userId: false,
                userAuth: false,
                lastAuth: false
            },
            discordImg: []
        }
    });

console.log = log.log;

let covers = require("./covers.json"),
    userLang = config.get("language"),
    langString = require(`./language/${userLang}.json`);

require("child_process").exec("NET SESSION", function (err, so, se) {
    if (se.length === 0) {
        app.isQuiting = true;
        console.log("Please do not run AMRPC with administrator privileges!");
        dialog.showErrorBox("Oh no!", langString.error.admin);
        app.quit();
    }
});

require("./managers/app.js");
require("./managers/discord.js");
require(`./managers/${config.get("appleMusicElectron") ? "ame" : "itunes"}.js`);

ipcMain.on("language-change", (e, d) => {
    console.log(`Changed backend language to ${d.lang}`);
    userLang = d.lang;
    langString = require(`./language/${userLang}.json`);
});

ipcMain.on("getCover", (e, d) => {
    if (!app.discord.currentTrack) return;

    app.sendToMainWindow("asynchronous-message", {
        "type": "sendCover",
        "data": {
            "element": app.discord.presenceData.largeImageKey
        }
    });
});

ipcMain.on("listenalong-change", (e, d) => {
    userLang = d.lang;
    langString = require(`./language/${userLang}.json`);
});

function updateUserData(ct) {
    // if(!ct || !ct.artist || ct.name.toLowerCase() === "connecting...") return;

    // let artist = userData.get(ct.artist.toLowerCase());

    // if(artist) {
    //     if(artist[ct.album.toLowerCase()][ct.name.toLowerCase()]) artist[ct.album.toLowerCase()][ct.name.toLowerCase()] = {
    //         "lastplayed": Date.now(),
    //         "count": artist[ct.album.toLowerCase()][ct.name.toLowerCase()].count+1
    //     };
    //     else artist[ct.album.toLowerCase()][ct.name.toLowerCase()] = {
    //         "lastplayed": Date.now(),
    //         "count": 1
    //     };

    //     userData.set(ct.artist.toLowerCase(), artist);
    // } else {
    //     userData.set(ct.artist.toLowerCase(), {
    //         [ct.album.toLowerCase()]: {
    //             [ct.name.toLowerCase()]: {
    //                 "lastplayed": Date.now(),
    //                 "count": 1
    //             }
    //         }
    //     });
    // }
}