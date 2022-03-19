const path = require("path");
const { app, BrowserWindow, globalShortcut } = require("electron");
const { NSEventMonitor, NSEventMask } = require("nseventmonitor");
const { is } = require("electron-util");
const Store = require("electron-store");

const TrayGenerator = require("./TrayGenerator");

let mainWindow = null;
let trayObject = null;
let macEventMonitor = null;

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

  if (store.get("useShortcut") === undefined) {
    store.set("useShortcut", true);
  }

  if (store.get("alwaysOnTop") === undefined) {
    store.set("alwaysOnTop", false);
  }
};

const enableMacEventMonitor = () => {
  macEventMonitor.start(
    NSEventMask.leftMouseDown | NSEventMask.rightMouseDown,
    () => {
      mainWindow.hide();
    }
  );
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

  macEventMonitor = new NSEventMonitor();

  if (is.development) mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.loadURL(
    `file://${path.join(__dirname, "../../src/client/index.html")}`
  );

  mainWindow.on("blur", () => {
    if (store.get("alwaysOnTop") === false) {
      mainWindow.hide();
      macEventMonitor.stop();

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

    if (mainWindow.isAlwaysOnTop() === false) enableMacEventMonitor();

    mainWindow.webContents.send("FOCUS_EDITOR");
  });

  mainWindow.on("hide", () => {
    // stop capturing global mouse events
    macEventMonitor.stop();
  });
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
  mainWindow.setAlwaysOnTop(store.get("alwaysOnTop"));
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

    if (isEnabled) {
      macEventMonitor.stop();

      trayObject.showWindow();
    } else {
      enableMacEventMonitor();
      // mainWindow.hide();
    }
  }
});

// hide dock icon
app.dock.hide();

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

  mainWindow.webContents.on("dom-ready", applyPreferences);

  mainWindow.webContents.on("did-fail-load", () => console.log("fail"));
});
