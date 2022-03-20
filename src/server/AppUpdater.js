const { BrowserWindow } = require("electron");
const { autoUpdater } = require("electron-updater");

class AppUpdater {
  constructor(url) {
    this.url = url;
    this.window = new BrowserWindow({
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    this.log = require("electron-log");
    this.log.transports.file.level = "debug";
    autoUpdater.logger = this.log;
  }

  sendStatusToWindow = (text) => {
    this.log.info(text);
    this.window.webContents.send("message", text);
  };

  createUpdater = () => {
    autoUpdater.on("checking-for-update", () => {
      this.sendStatusToWindow("Checking for update...");
    });

    autoUpdater.on("update-available", () => {
      this.sendStatusToWindow("Update available.");
    });

    autoUpdater.on("update-not-available", () => {
      this.sendStatusToWindow("Update not available.");
    });

    autoUpdater.on("error", (err) => {
      this.sendStatusToWindow("Error in auto-updater. " + err);
    });

    autoUpdater.on("download-progress", (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + " - Downloaded " + progressObj.percent + "%";
      log_message =
        log_message +
        " (" +
        progressObj.transferred +
        "/" +
        progressObj.total +
        ")";
      this.sendStatusToWindow(log_message);
    });

    autoUpdater.on("update-downloaded", () => {
      this.sendStatusToWindow("Update downloaded");
    });

    this.window.loadURL(this.url);

    this.window.once("ready-to-show", () => {
      autoUpdater.checkForUpdatesAndNotify();
    });

    return this.window;
  };
}

module.exports = AppUpdater;
