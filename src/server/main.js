const { app, BrowserWindow, globalShortcut } = require("electron");

const { is } = require("electron-util");

const path = require("path");
const Store = require("electron-store");
const { NSEventMonitor, NSEventMask } = require("nseventmonitor");
const TrayGenerator = require("./TrayGenerator");

let mainWindow = null;
let trayObject = null;

const gotTheLock = app.requestSingleInstanceLock();

const macEventMonitor = new NSEventMonitor();

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

  if (store.get("clearOnBlur") === undefined) {
    store.set("clearOnBlur", true);
  }

  if (store.get("useShortcut") === undefined) {
    store.set("useShortcut", true);
  }
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
      backgroundThrottling: false,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  if (is.development) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
    mainWindow.loadURL(
      `file://${path.join(__dirname, "../../src/client/index.html")}`
    );
  } else {
    mainWindow.loadURL(
      `file://${path.join(__dirname, "../../src/client/index.html")}`
    );
  }

  mainWindow.on("focus", () => {
    globalShortcut.register("Command+R", () => null);
    macEventMonitor.start(
      NSEventMask.leftMouseDown || NSEventMask.rightMouseDown,
      () => {
        mainWindow.hide();
      }
    );
  });

  mainWindow.on("blur", () => {
    if (!mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
      globalShortcut.unregister("Command+R");
      macEventMonitor.stop();
    }
    if (store.get("clearOnBlur")) {
      mainWindow.webContents.send("CLEAR_TEXT_AREA");
    }
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

if (!gotTheLock) {
  app.quit();
} else {
  app.on("ready", () => {
    initStore();
    createMainWindow();
    createTray();
    // applyPreferences();

    mainWindow.webContents.on("dom-ready", applyPreferences);

    mainWindow.webContents.on("did-fail-load", () => console.log("fail"));
  });

  app.on("second-instance", () => {
    if (mainWindow) {
      trayObject.showWindow();
    }
  });

  if (!is.development) {
    app.setLoginItemSettings({
      openAtLogin: store.get("launchAtStart"),
    });
  }

  app.dock.hide();
}
