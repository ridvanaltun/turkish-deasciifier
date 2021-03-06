const path = require("path");
const { app, BrowserWindow, globalShortcut } = require("electron");
const { is } = require("electron-util");
const Store = require("electron-store");

const TrayGenerator = require("./TrayGenerator");
const AppUpdater = require("./AppUpdater");

app.setAboutPanelOptions({
  applicationName: app.name,
  applicationVersion: app.getVersion(),
  authors: ["Rıdvan Altun"],
  website: "https://github.com/ridvanaltun/turkish-deasciifier",
  iconPath: path.join(__dirname, "../../assets/images/logo.png"),
});

let mainWindow = null;
let trayObject = null;
let updaterObject = null;

if (is.development) require("electron-reloader")(module);

const store = new Store();

const initStore = () => {
  if (store.get("launchAtStart") === undefined) {
    store.set("launchAtStart", true);
  }

  if (store.get("showCorrectionBubble") === undefined) {
    store.set("showCorrectionBubble", true);
  }

  if (store.get("translateWhileTyping") === undefined) {
    store.set("translateWhileTyping", true);
  }

  if (store.get("clearOnMinimize") === undefined) {
    store.set("clearOnMinimize", true);
  }

  if (store.get("useToggleShortcut") === undefined) {
    store.set("useToggleShortcut", true);
  }

  if (store.get("useClipboardShortcut") === undefined) {
    store.set("useClipboardShortcut", true);
  }

  if (store.get("checkUpdates") === undefined) {
    store.set("checkUpdates", true);
  }

  if (store.get("latestSkippedVersion") === undefined) {
    store.set("latestSkippedVersion", null);
  }

  if (store.get("alwaysOnTop") === undefined) {
    store.set("alwaysOnTop", false);
  }

  store.set("forceUpdate", false);
};

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    transparent: true,
    width: 500,
    height: 365,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: is.development,
    skipTaskbar: true,
    webPreferences: {
      devTools: is.development,
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      // prevents renderer process code from not running when window is hidden
      backgroundThrottling: false,
    },
  });

  if (is.development) mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.loadURL(
    `file://${path.join(__dirname, "../../src/client/index.html")}`
  );

  mainWindow.on("blur", () => {
    if (store.get("alwaysOnTop") === false) {
      mainWindow.hide();

      if (store.get("clearOnMinimize")) {
        mainWindow.webContents.send("CLEAR_TEXT_AREA");
      }
    }

    if (mainWindow.webContents.isDevToolsOpened() === false) {
      // unregister refresh shortcut
      globalShortcut.unregister("Command+R");
    }
  });

  mainWindow.on("show", () => {
    // register refresh shortcut
    globalShortcut.register("Command+R", () => null);

    mainWindow.webContents.send("FOCUS_EDITOR");
  });
};

const createUpdater = () => {
  updaterObject = new AppUpdater(mainWindow, store);
  updaterObject.start();
};

const createTray = () => {
  trayObject = new TrayGenerator(mainWindow, store);
  trayObject.createTray();
};

const applyPreferences = () => {
  mainWindow.webContents.send(
    "SET_AUTO_CONVERT",
    store.get("translateWhileTyping")
  );
  mainWindow.webContents.send(
    "SET_CORRECTION_MENU",
    store.get("showCorrectionBubble")
  );
};

store.onDidChange("translateWhileTyping", () => {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send(
      "SET_AUTO_CONVERT",
      store.get("translateWhileTyping")
    );
  }
});

store.onDidChange("showCorrectionBubble", () => {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send(
      "SET_CORRECTION_MENU",
      store.get("showCorrectionBubble")
    );
  }
});

store.onDidChange("alwaysOnTop", () => {
  if (mainWindow) {
    const isEnabled = store.get("alwaysOnTop");

    if (isEnabled) trayObject.showWindow();
  }
});

// hide dock icon
if (is.macos) app.dock.hide();

const gotTheLock = app.requestSingleInstanceLock();
if (gotTheLock === false) app.quit();

// Quit when all windows are closed
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their
  // menu bar to stay active until the user quits
  // explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("second-instance", () => {
  if (mainWindow) trayObject.showWindow();
});

app.setLoginItemSettings({
  openAtLogin: is.development ? false : store.get("launchAtStart"),
});

app.on("ready", () => {
  initStore();
  createMainWindow();
  createTray();
  createUpdater();

  mainWindow.setAlwaysOnTop(true);

  mainWindow.webContents.on("dom-ready", applyPreferences);

  mainWindow.webContents.on("did-fail-load", () => console.log("fail"));
});
