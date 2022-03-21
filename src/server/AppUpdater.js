const { app, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

class AppUpdater {
  constructor(window, store) {
    this.window = window;
    this.store = store;
    this.error = false;

    this.log = require("electron-log");
    this.log.transports.file.level = "debug";
    autoUpdater.logger = this.log;
  }

  sendStatusToWindow = (text) => {
    const isCheckUpdatesEnabled = this.store.get("checkUpdates");

    if (isCheckUpdatesEnabled === false) return;

    this.log.info(text);
    this.window.webContents.send("message", text);
  };

  start = () => {
    autoUpdater.on("checking-for-update", () => {
      this.error = false;
      this.sendStatusToWindow("Checking for update...");
    });

    autoUpdater.on("update-available", () => {
      this.sendStatusToWindow("Update available.");
    });

    autoUpdater.on("update-not-available", () => {
      const isForceUpdate = this.store.get("forceUpdate");

      if (isForceUpdate) {
        this.store.set("forceUpdate", false);
        dialog
          .showMessageBox({
            type: "info",
            buttons: ["Close"],
            title: `Update not found for ${app.name}`,
            detail: "Update not found, please try again later!",
          })
          .then((returnValue) => {
            if (returnValue.response === 0) return;
          });
      }

      this.sendStatusToWindow("Update not available.");
    });

    autoUpdater.on("error", (err) => {
      this.sendStatusToWindow("Error in auto-updater. " + err);

      this.error = err;

      const isForceUpdate = this.store.get("forceUpdate");

      if (isForceUpdate) {
        this.store.set("forceUpdate", false);
        dialog
          .showMessageBox({
            type: "error",
            buttons: ["Close"],
            title: `Something goes wrong for ${app.name}`,
            detail: "Something goes wrong, please try again later!",
            message: err.message,
          })
          .then((returnValue) => {
            if (returnValue.response === 0) return;
          });
      }
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

    autoUpdater.on("update-downloaded", ({ version }) => {
      this.sendStatusToWindow("Update downloaded");

      const isSkipped = version === this.store.get("latestSkippedVersion");
      const isCheckUpdatesEnabled = this.store.get("checkUpdates");
      const isForceUpdate = this.store.get("forceUpdate");
      const isError = this.error;

      if (isError) return;

      if (
        isForceUpdate === false &&
        (isSkipped || isCheckUpdatesEnabled === false)
      )
        return;

      this.update(version);
    });

    autoUpdater.checkForUpdates();
  };

  update = (version) => {
    this.store.set("forceUpdate", false);

    dialog
      .showMessageBox({
        type: "info",
        cancelId: 1,
        buttons: [
          `Restart the ${app.name}`,
          "Not now, wait next restart",
          "Skip this version",
        ],
        title: `Update ${app.name} ${app.getVersion()}`,
        detail: `A new version (${version}) has been downloaded. Restart the Turkish Deasciifier to complete the update.`,
      })
      .then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall();
        if (returnValue.response === 1) return;
        if (returnValue.response === 2)
          this.store.set("latestSkippedVersion", version);
      });
  };
}

module.exports = AppUpdater;
