const DiscordRPC = require("discord-rpc"),
    Store = require("electron-store"),
    config = new Store({}),
    { app, dialog } = require("electron"),
    appData = new Store({name: "data"}),
    covers = require("../covers.json"),
    fetch = require("fetch").fetchUrl,
    langString = require(`../language/${config.get("language")}.json`);

app.discord = {
    client: undefined,
    presenceData: {},
    currentTrack: {},
    disconnected: false,
    prevCover: null
};

module.exports = {
    connect: () => {
        console.log("[DiscordRPC] Connecting...");

        if (app.discord) app.discord = {};

        const client = new DiscordRPC.Client({transport: "ipc"});
        client.login({ clientId: "842112189618978897" }).catch(module.exports.connect);

        app.discord.client = client;

        DiscordRPC.register("842112189618978897");

        app.discord.presenceData = {
            largeImageKey: config.get("cover"),
            largeImageText: `${app.dev ? "AMRPC - DEV" : "AMRPC"} - V.${app.getVersion()}`,
            isLive: false,
            isReady: false
        };

        // if (config.get("listenAlong")) {
        //     app.discord.presenceData.partySize = 1;
        //     app.discord.presenceData.partyMax = 5;
        //     app.discord.presenceData.joinSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        // }

        client.on("ready", () => {
            app.discord.presenceData.isReady = true;
            app.discord.presenceData.isLive = false;
            app.discord.disconnected = false;

            module.exports.checkAlpha();

            console.log("[DiscordRPC] Successfully connected");
            console.log("[DiscordRPC] Connected user:", client.user.username);

            app.on("before-quit", () => {
                module.exports.clearActivity();
                app.discord.client.destroy();

                app.discord.disconnected = true;
            });
        });
    },

    updateActivity: (type, currentTrack, appType, log=true) => {
        if (log) console.log("[DiscordRPC] Update Activity");

        if (JSON.stringify(currentTrack) === JSON.stringify(app.discord.currentTrack)) return;

        app.discord.presenceData.isLive = false;
        app.discord.currentTrack = currentTrack;

        if (currentTrack.album.length === 0) app.discord.presenceData.details = currentTrack.name;
        else module.exports.replaceRPCVars(currentTrack, "rpcDetails");

        module.exports.replaceRPCVars(currentTrack, "rpcState");

        if (currentTrack.duration > 0)
            if (appType === "ame")
                app.discord.presenceData.endTimestamp = currentTrack.endTime;
            else
                app.discord.presenceData.endTimestamp = Math.floor(Date.now() / 1000) - currentTrack.elapsedTime + currentTrack.duration;
        else {
            if (app.discord.presenceData.endTimestamp) delete app.discord.presenceData.endTimestamp;
            app.discord.presenceData.details = currentTrack.name.substring(0, 128);
            app.discord.presenceData.state = "LIVE";
            app.discord.presenceData.isLive = true;
        }

        if (currentTrack.artwork && config.get("showAlbumArtwork")) {
            if (!app.discord.prevCover) {
                app.discord.presenceData.largeImageKey = currentTrack.artwork;
                app.discord.prevCover = [+Date.now(), currentTrack.artwork]
            } else if(app.discord.prevCover[1] !== currentTrack.artwork) {
                app.discord.presenceData.largeImageKey = currentTrack.artwork;
                app.discord.prevCover = [+Date.now(), currentTrack.artwork];
                // There is currently no information about rate limits from Discord's side
                // if (app.discord.prevCover[1] !== currentTrack.artwork && Date.now() - app.discord.prevCover[0] > 2500) {
                //     app.discord.presenceData.largeImageKey = currentTrack.artwork;
                //     app.discord.prevCover = [+Date.now(), currentTrack.artwork]
                // } else {
                //     console.log("[DiscordRPC] Artwork rate limit");

                //     app.discord.presenceData.largeImageKey = "applemusic-logo";
                // }
            }
        } else module.exports.checkCover();

        module.exports.getAppleMusicData(currentTrack.name, currentTrack.artist, function (res, err) {
            if (!err) {
                app.discord.presenceData.buttons = [
                    {
                        label: "Play on Apple Music",
                        url: res.url
                    }
                ]
                if (config.get("listenAlong") && appData.get("zephra.userId") && appData.get("zephra.userAuth")) {
                    rpc.presenceData.buttons.push({
                        label: "Listen alongᴮᴱᵀᴬ",
                        url: `https://amrpc.zephra.cloud/listen-along/${appData.get("zephra.userId")}`
                    });
                }
                if (app.discord.presenceData.isReady) app.discord.client.setActivity(app.discord.presenceData);
            } else if (app.discord.presenceData.buttons) delete app.discord.presenceData.buttons;
    
            if (log) console.log("currentTrack", currentTrack);
        });

        if (!app.discord.disconnected && app.discord.client) {
            app.discord.client.setActivity(app.discord.presenceData);

            if (app.discord.timeout) clearTimeout(app.discord.timeout);

            app.discord.timeout = setTimeout(() => {
                    const dif = new Date(app.discord.presenceData.endTimestamp).getTime() - new Date().getTime();

                    if (dif <= 0) module.exports.clearActivity();
                }, new Date(app.discord.presenceData.endTimestamp).getTime() - new Date().getTime() + 1000);

            setTimeout(() => {
                if (!app.discord.disconnected && app.discord.client) app.discord.client.setActivity(app.discord.presenceData);
            }, 1500);
        }
    },

    clearActivity: (remove=true, log=true) => {
        if (log) console.log("[DiscordRPC] Clear Activity");

        if (!app.discord.presenceData.details && !app.discord.presenceData.state && !app.discord.presenceData.endTimestamp) return;

        if (remove) {
            delete app.discord.presenceData.details;
            delete app.discord.presenceData.state;
            delete app.discord.presenceData.endTimestamp;
            delete app.discord.currentTrack;
        }

        if (!app.discord.disconnected && app.discord.client) app.discord.client.clearActivity();
    },

    replaceRPCVars: (ct, cfg) => {
        if (!ct || !cfg || ct.playerState === "stopped" || (cfg !== "rpcDetails" && cfg !== "rpcState")) return;
        if ((!ct.name && config.get(cfg).includes("%title%")) || (!ct.album && config.get(cfg).includes("%album%")) || (!ct.artist && config.get(cfg).includes("%artist%"))) return;
    
        app.discord.presenceData[(cfg === "rpcDetails") ? "details" : "state"] = config.get(cfg).replace("%title%", ct.name).replace("%album%", ct.album).replace("%artist%", ct.artist).substring(0, 128);
    },

    checkCover: (ct) => {
        if (!ct || ct.playerState === "stopped") return;
        if (!config.get("showAlbumArtwork")) return app.discord.presenceData.largeImageKey = config.get("cover");
        if (appData.get("nineelevenCovers") && (new Date().getMonth() + 1 === 9 && new Date().getDate() === 11)) return app.discord.presenceData.largeImageKey = "cover_911";
    
        if (covers.album[ct.album.toLowerCase()]) app.discord.presenceData.largeImageKey = covers.album[ct.album.toLowerCase()];
        else if (covers.song[ct.artist.toLowerCase()]) {
            if (covers.song[ct.artist.toLowerCase()][ct.name.toLowerCase()]) app.discord.presenceData.largeImageKey = covers.song[ct.artist.toLowerCase()][ct.name.toLowerCase()];
            else app.discord.presenceData.largeImageKey = config.get("cover");
        } else if (app.discord.presenceData.isLive && covers.playlist[ct.name.toLowerCase()]) app.discord.presenceData.largeImageKey = covers.playlist[ct.name.toLowerCase()];
        else if (app.discord.presenceData.largeImageKey !== config.get("cover")) app.discord.presenceData.largeImageKey = config.get("cover");
    
        if (app.discord.presenceData.isReady && !app.discord.disconnected) app.discord.client.setActivity(app.discord.presenceData);
    },

    checkAlpha: () => {
        let timeout = 0;
    
        if(!app.discord.client.user) timeout = 2000;
    
        setTimeout(() => {
            if(!app.discord.client.user) return checkAlpha();
    
            fetch("https://amrpc.zephra.cloud/checkAlpha", {
                cache: "no-store",
                headers: {
                    userid: app.discord.client.user.id,
                    key: "UTNbOEM4NjsmLGpXPEsvMldoYX5SfS5IYDhIXUopM3R3M0BMemtaWW4zcFove2hQNCV4ZTNFY0FgTGNNVXpAUXAnWygoU0guOjZmZGtzQFkjPV1oeHVVaFxUPnp4VDlRXlokM21HRX0hOUM8PCt5cj9OYE4zWkN6Z212bSt+ZUYvPUBjLlcmVC5lW3V+XSV4OSNlJFo5P2I1bnp4K3J1I3l+JVJSPSZ3U254WT8mV3E1UnY0VzJfIi9bJ2VVciRHXmNOOG1dY2E5NDJQLnQ9VXs/PngoUCc9ejVARGFAe0soQCdzUkReLHArI1glVlxWPWt1WzwlJWcjezYyUTRFfQ=="
                }
            }, function(error, meta, body) {
                if(!body) return callback(null, true);
    
                let res = body.toString();
    
                if(meta.status === 200) {
                    res = JSON.parse(res);
    
                    if(!res) {
                        app.discord.disconnected = true;
                        app.discord.client.destroy();

                        dialog.showErrorBox("AMRPC Alpha", langString.notification.alphaNotAllowed);
                        app.exit();
                    } else
                        console.log("[API] Alpha authentication successful");
                }
            });
        }, timeout);
    },

    getAppleMusicData: (title, artist, callback) => {
        const reqParam = encodeURIComponent(`${title} ${artist}`).replace(/"/g, "%27").replace(/"/g, "%22");
    
        fetch(`https://itunes.apple.com/search?term=${reqParam}&entity=musicTrack`, { cache: "no-store" }, function (error, meta, body) {
            if (!body) return callback(null, true);

            const res = JSON.parse(body.toString()).results[0];

            if (res) callback({
                url: res.trackViewUrl,
                collectionId: res.collectionId,
                trackId: res.trackId,
                explicit: !res.notExplicit
            });
            else callback(null, true);
        });
    }
}