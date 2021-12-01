const iTunes = require("itunes-bridge"),
    iTunesEmitter = iTunes.emitter,
    Store = require("electron-store"),
    { connect, updateActivity, clearActivity } = require("../managers/discord.js"),
    config = new Store({}),
    appData = new Store({name: "data"});

iTunesEmitter.on("playing", (type, currentTrack) => {
    console.log("[iTunes] Playing");
    if (!currentTrack) return console.log("[iTunes] No Track detected");

    updateActivity(type, currentTrack, "iTunes");
});

iTunesEmitter.on("paused", (type, currentTrack) => {
    console.log("[iTunes] Paused");
    if (!currentTrack) return console.log("[iTunes] No Track detected");

    clearActivity();
});

iTunesEmitter.on("stopped", () => {
    console.log("[iTunes] Stopped");
    clearActivity(true);
});

// iTunesEmitter.on("timeChange", async (type, currentTrack) => {
//     if (!rpc.presenceData.details || rpc.presenceData.details.length > 128) return;
//     let ct = Math.floor(Date.now() / 1000) - currentTrack.elapsedTime + currentTrack.duration;

//     if (rpc.presenceData.isLive) {
//         let ctg = Math.floor(Date.now() / 1000) - rpc.ctG.elapsedTime + rpc.ctG.duration;
//         const difference = (ct > ctg) ? ct - ctg : ctg - ct;

//         if (rpc.presenceData.endTimestamp) delete rpc.presenceData.endTimestamp;

//         if (difference > 99 && currentTrack.duration > 0) {
//             rpc.replaceRPCVars(currentTrack, "rpcDetails");
//             rpc.replaceRPCVars(currentTrack, "rpcState");

//             rpc.presenceData.endTimestamp = Math.floor(Date.now() / 1000) - currentTrack.elapsedTime + (currentTrack.duration + (config.get("performanceMode") ? 1.75 : 1));
//             rpc.presenceData.isLive = false;

//             if (rpc.presenceData.isReady) rpc.rpc.setActivity(rpc.presenceData);
//         }
//         return;
//     }

//     if (!rpc.presenceData.endTimestamp) return;

//     if (ct !== rpc.presenceData.endTimestamp) {
//         const difference = (ct > rpc.presenceData.endTimestamp) ? ct - rpc.presenceData.endTimestamp : rpc.presenceData.endTimestamp - ct;

//         if (difference > 1.5) {
//             rpc.presenceData.endTimestamp = Math.floor(Date.now() / 1000) - currentTrack.elapsedTime + (currentTrack.duration + (config.get("performanceMode") ? 1.75 : 1));

//             if (rpc.presenceData.isReady) rpc.rpc.setActivity(rpc.presenceData);
//         }
//     }
// });