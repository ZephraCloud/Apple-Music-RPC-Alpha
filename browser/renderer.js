let appVersion,
    restartRequiredMemory = {},
    langString = {};

(async () => {
    const seenChangelogs = await window.electron.appData.get("changelog");
    appVersion = await window.electron.appVersion();

    document.querySelector("span#extra_version").textContent = `${window.electron.isDeveloper() ? "Developer" : ""} V.${appVersion}`;

    if (!seenChangelogs[appVersion]) {
        const changelog = await window.electron.fetchChangelog();

        if (changelog) {
            newModal(`Changelog ${changelog.name}`, marked.parse(changelog.body.replace("# Changelog:\r\n", "")), [
                {
                    text: langString.settings.modal.buttons.okay,
                    style: "btn-grey",
                    events: [
                        {
                            name: "onclick",
                            value: "updateDataChangelog(appVersion, true), closeModal(this.parentElement.id)"
                        }
                    ]
                }
            ]);
        }
    }
})();

console.log("[BROWSER RENDERER] Loading...");

updateTheme();
updateLanguage();

// ipcRenderer.on("asynchronous-message", function (evt, o) {
//     if (o.type === "new-update-available") {
//         newModal(langString.settings.modal["newUpdate"].title, langString.settings.modal["newUpdate"].description.replace("%version%", o.data.version), [
//             {
//                 text: langString.settings.modal["newUpdate"].buttons.downandinst,
//                 style: "btn-grey",
//                 events: [
//                     {
//                         name: "onclick",
//                         value: "ipcRenderer.send('asynchronous-message', {'type': 'download-and-install-update'}), closeModal(this.parentElement.id)"
//                     }
//                 ]
//             },
//             {
//                 text: langString.settings.modal["newUpdate"].buttons.download,
//                 style: "btn-grey",
//                 events: [
//                     {
//                         name: "onclick",
//                         value: "ipcRenderer.send('asynchronous-message', {'type': 'download-update'}), closeModal(this.parentElement.id)"
//                     }
//                 ]
//             }
//         ]);
//     } else if (o.type === "update-installation-available") {
//         newModal(langString.settings.modal["newUpdate"].title, langString.settings.modal["newUpdate"].installed.description.replace("%version%", o.data.version), [
//             {
//                 text: langString.settings.modal["newUpdate"].installed.buttons.install,
//                 style: "btn-grey",
//                 events: [
//                     {
//                         name: "onclick",
//                         value: "ipcRenderer.send('asynchronous-message', {'type': 'install-update'}), closeModal(this.parentElement.id)"
//                     }
//                 ]
//             },
//             {
//                 text: langString.settings.modal["newUpdate"].installed.buttons.later,
//                 style: "btn-grey",
//                 events: [
//                     {
//                         name: "onclick",
//                         value: "closeModal(this.parentElement.id)"
//                     }
//                 ]
//             }
//         ]);
//     } else if (o.type === "download-progress-update") {
//         document.querySelector("span#download-progress").style.display = (o.data.percent === 100) ? "none" : "inline-block";
//         document.querySelector("span#download-progress progress").value = o.data.percent;
//     }
// });

document.querySelector("span.dot.minimize")?.addEventListener("click", function (e) {
    window.electron.minimize();
});

document.querySelector("span.dot.maximize")?.addEventListener("click", function (e) {
    window.electron.maximize();
});

document.querySelector("span.dot.close")?.addEventListener("click", function (e) {
    window.electron.hide();
});

document.querySelectorAll("div.setting input").forEach(async (input) => {
    if (input.type == "checkbox") {
        input.addEventListener('click', (e) => {
            window.electron.config.set(input.name.replace("config_", ""), input.checked);

            if (input.getAttribute("rR") === "true") {
                updateSCPM();

                if (input.checked === restartRequiredMemory[input.name]) {
                    delete restartRequiredMemory[input.name];

                    document.querySelector("span#restartApp").style["display"] = "none";
                    document.querySelector("span#reloadPage").style["display"] = "inline";
                } else {
                    restartRequiredMemory[input.name] = !input.checked;

                    document.querySelector("span#restartApp").style["display"] = "inline";
                    document.querySelector("span#reloadPage").style["display"] = "none";
                }
            }
            if (input.name === "config_autolaunch") ipcRenderer.send("autolaunch-change", {});
        });
    } else if (input.type === "text") {
        let timeout;

        input.addEventListener('keyup', function (e) {
            clearTimeout(timeout);

            timeout = setTimeout(function () {
                window.electron.config.set(input.name.replace("config_", ""), input.value);
            }, 1500);
        });
    }

    if (input.type === "checkbox") input.checked = await window.electron.config.get(input.name.replace("config_", ""));
    else if (input.type === "text") input.value = await window.electron.config.get(input.name.replace("config_", ""));
    updateSCPM();
});

document.querySelectorAll("div.setting select").forEach(async (select) => {
    select.addEventListener('change', async (e) => {
        console.log(select.name.replace("config_", ""), select.value);

        if (select.getAttribute("rR") === "true") {
            if (select.value?.toString() === restartRequiredMemory[select.name]?.toString()) {
                delete restartRequiredMemory[select.name];
    
                document.querySelector("span#restartApp").style["display"] = "none";
                document.querySelector("span#reloadPage").style["display"] = "inline";
            } else {
                restartRequiredMemory[select.name] = await window.electron.config.get(select.name.replace("config_", ""));
    
                document.querySelector("span#restartApp").style["display"] = "inline";
                document.querySelector("span#reloadPage").style["display"] = "none";
            }
        }

        window.electron.config.set(select.name.replace("config_", ""), (select.value === "true" || select.value === "false") ? (select.value === "true") ? true : false : select.value);

        if (select.name === "config_colorTheme") updateTheme();
        else if (select.name === "config_language") updateLanguage();
    });

    select.value = await window.electron.config.get(select.name.replace("config_", ""));
});

function openUrl(url) {
    if (!url) return;
    window.electron.openURL(url);
}

async function updateTheme() {
    let theme = await window.electron.config.get("colorTheme");

    if (theme === "os") theme = await window.electron.getSystemTheme();

    document.querySelector("body").setAttribute("data-theme", theme);
}

async function updateSCPM() {
    const e = {
        cb: document.querySelector("div.setting input[name='config_performanceMode']"),
        cs: document.querySelector("div.setting input[name='config_show']"),
        cp: document.querySelector("div.setting input[name='config_hideOnPause']")
    };

    if (e.cb.checked) {
        if (await window.electron.config.get("show")) e.cs.disabled = true;
        e.cp.checked = true;
        e.cp.disabled = true;
    } else {
        if (await window.electron.config.get("show")) e.cs.disabled = false;
        e.cp.disabled = false;
    }
}

async function updateLanguage() {
    const language = await window.electron.config.get("language");

    langString = await window.electron.getLangStrings(language);

    //window.electron.updateLanguage(language);

    document.querySelectorAll("div.setting label").forEach((ele) => {
        const ls = langString.settings.config[ele.getAttribute("for").replace("config_", "")];

        if (ls) ele.textContent = ls
    });

    document.querySelectorAll(".extra span").forEach((ele) => {
        const ls = langString.settings.extra[ele.parentElement.id];

        if (ls) ele.textContent = ls
    });
}

function newModal(title, description, buttons) {
    const e = {
        modal: document.createElement("div"),
        title: document.createElement("h1"),
        description: document.createElement("p"),
        body: document.body
    }

    e.body.appendChild(e.modal);
    e.modal.appendChild(e.title);
    e.modal.appendChild(e.description);

    e.modal.classList.add("modal");
    e.title.classList.add("title");
    e.description.classList.add("description");

    e.title.innerHTML = title;
    e.description.innerHTML = description;

    e.modal.id = generateEleId();

    for (let i = 0; i < buttons.length; i++) {
        if (i > 2) return;
        const btn = buttons[i],
            ele = document.createElement("p");

        ele.classList.add("btn");
        ele.classList.add(btn.style);
        if (i === 2) ele.classList.add("btn-last");
        ele.innerHTML = btn.text;

        if (btn.events) {
            for (let i2 = 0; i2 < buttons[i].events.length; i2++) {
                const event = buttons[i].events[i2];

                ele.setAttribute(event.name, event.value);
            }
        }

        e.modal.appendChild(ele);
    }

    document.querySelectorAll(".modal a").forEach(element => {
        element.addEventListener("click", function (e) {
            e.preventDefault();
            openUrl(element.href);
    
            return false;
        });
    });

    if (e.body.classList.contains("modalIsOpen")) e.modal.style.display = "none", e.modal.classList.add("awaiting");
    else e.body.classList.add("modalIsOpen");
}

function closeModal(id) {
    const e = document.querySelector(`div.modal#${id}`);
    e.style.display = "none";
    document.body.classList.remove("modalIsOpen");

    if (document.querySelectorAll("div.modal.awaiting").length > 0) openModal(document.querySelectorAll("div.modal.awaiting")[0].id);
}

function openModal(id) {
    const e = document.querySelector(`div.modal#${id}`);
    e.style.display = "block";
    e.classList.remove("awaiting");
    document.body.classList.add("modalIsOpen");
}

function deleteModal(id) {
    const e = document.querySelector(`div.modal#${id}`);
    e.remove();
    document.body.classList.remove("modalIsOpen");

    if (document.querySelectorAll("div.modal.awaiting").length > 0) openModal(document.querySelectorAll("div.modal.awaiting")[0].id);
}

function sendUserCount() {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", "https://amrpc.zephra.cloud/userCount.php", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send();
}

function generateEleId() {
    let result = '',
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < characters.length; i++) result += characters.charAt(Math.floor(Math.random() * characters.length));

    return result;
}

async function updateDataChangelog(k, v) {
    let changelog = await window.electron.appData.get("changelog");

    changelog[k] = v;

    window.electron.appData.set("changelog", changelog);
}

console.log("[BROWSER RENDERER] Ready");