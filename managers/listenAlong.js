const { app } = require("electron"),
    Store = require("electron-store"),
    config = new Store({}),
    appData = new Store({ name: "data" }),
    http = require("http"),
    fetch = require("fetch").fetchUrl;

console.log = app.addLog;

const requestListener = function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "api.zephra.cloud");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.writeHead(200);
        res.end("req", req);

        if (req.headers["listenalong-action"] === "play") {
            if (!req.headers["listenalong-track"])
                return console.log("[LISTEN-ALONG] No track data");

            const xhr = new XMLHttpRequest();

            xhr.open("POST", "http://localhost:941", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader(
                "listenalong-track",
                encodeURI(
                    JSON.stringify({
                        track: req.headers["listenalong-track"],
                        time: req.headers["listenalong-time"],
                    })
                )
            );
            xhr.send();
        } else if (req.headers["listenalong-action"] === "pause") {
            const xhr = new XMLHttpRequest();

            xhr.open("POST", "http://localhost:941", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("listenalong-action", "pause");
            xhr.send();
        }
    },
    server = http.createServer(requestListener);

module.exports = {
    create: () => {
        if (!config.get("zephra.userId"))
            return console.log("[LISTEN-ALONG] No user ID found in config");

        fetch(
            `https://api.zephra.cloud/api/amrpc/listenAlong/createRoom`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: config.get("zephra.userId"),
                }),
            },
            (error, meta, body) => {
                body = JSON.parse(body);

                appData.set("listenAlong.roomId", body.roomId);
                appData.set("listenAlong.roomUserCount", body.roomUserCount);
            }
        );
    },
    join: (roomId) => {
        if (!roomId) return console.log("[LISTEN-ALONG] No room ID provided");

        fetch(
            `https://api.zephra.cloud/api/amrpc/listenAlong/joinRoom`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: config.get("zephra.userId"),
                    roomId: roomId,
                }),
            },
            (error, meta, body) => {
                body = JSON.parse(body);

                appData.set("listenAlong.roomId", body.roomId);
                appData.set("listenAlong.roomUserCount", body.roomUserCount);
            }
        );
    },
    leave: () => {
        if (!appData.get("listenAlong.roomId"))
            return console.log("[LISTEN-ALONG] No room ID found in app data");

        fetch(
            `https://api.zephra.cloud/api/amrpc/listenAlong/leaveRoom`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    roomId: appData.get("listenAlong.roomId"),
                }),
            },
            (error, meta, body) => {
                appData.set("listenAlong", {});
            }
        );
    },
    play: () => {
        if (!appData.get("listenAlong.roomId"))
            return console.log("[LISTEN-ALONG] No room ID found in app data");
    },
};

server.listen(149, "localhost", () => {
    console.log("[LISTEN-ALONG] Listening on port 149");
});
