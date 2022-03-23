const { Tray, Menu, globalShortcut, nativeImage } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { getWindowPosition } = require("../lib/getWindowPosition");

class TrayGenerator {
  constructor(window, store) {
    this.tray = null;
    this.window = window;
    this.store = store;
  }

  setArrowVisibility = () => {
    const whereIsTray = getWindowPosition(this.tray);

    switch (whereIsTray) {
      case "trayCenter":
        this.window.webContents.send("SET_ARROW_VISIBILITY", true);
        break;

      case "topRight":
      case "trayBottomCenter":
      case "bottomLeft":
      case "bottomRight":
        this.window.webContents.send("SET_ARROW_VISIBILITY", false);
        break;
    }
  };

  setWinPosition = () => {
    const whereIsTray = getWindowPosition(this.tray);

    let x = null;
    let y = null;

    const windowBounds = this.window.getBounds();
    const trayBounds = this.tray.getBounds();

    switch (whereIsTray) {
      case "trayCenter":
        x = Math.round(
          trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
        );
        y = Math.round(trayBounds.y + trayBounds.height);
        break;

      case "topRight":
        x = Math.round(trayBounds.x + trayBounds.width / 2);
        y = Math.round(trayBounds.y + trayBounds.height);
        break;

      case "trayBottomCenter":
        x = Math.round(
          trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
        );
        y = Math.round(trayBounds.y - windowBounds.height);
        break;

      case "bottomLeft":
        x = Math.round(trayBounds.x + trayBounds.width);
        y = Math.round(trayBounds.y + trayBounds.height - windowBounds.height);
        break;

      case "bottomRight":
        x = Math.round(trayBounds.x - windowBounds.width);
        y = Math.round(trayBounds.y + trayBounds.height - windowBounds.height);
        break;
    }

    this.window.setPosition(x, y, false);
  };

  showWindow = () => {
    this.setWinPosition();
    this.setArrowVisibility();
    this.window.setVisibleOnAllWorkspaces(true, {
      skipTransformProcessType: true,
    });
    this.window.show();
    this.window.setVisibleOnAllWorkspaces(false, {
      skipTransformProcessType: true,
    });
  };

  toggleWindow = () => {
    if (this.window.isVisible()) {
      this.window.hide();
    } else {
      this.showWindow();
      this.window.focus();
    }
  };

  toggleShortcut = (event) => {
    this.store.set("useShortcut", event);

    if (event) {
      globalShortcut.register("CommandOrControl+U", this.toggleWindow);
    } else {
      globalShortcut.unregister("CommandOrControl+U");
    }
  };

  rightClickMenu = () => {
    const menu = [
      {
        label: "Always on top",
        type: "checkbox",
        checked: this.store.get("alwaysOnTop"),
        click: (event) => this.store.set("alwaysOnTop", event.checked),
      },
      {
        type: "separator",
      },
      {
        label: "Translate as you type",
        type: "checkbox",
        checked: this.store.get("translateWhileTyping"),
        click: (event) => this.store.set("translateWhileTyping", event.checked),
      },
      {
        label: "Show correction bubble",
        type: "checkbox",
        checked: this.store.get("showCorrectionBubble"),
        click: (event) => this.store.set("showCorrectionBubble", event.checked),
      },
      {
        label: "Clear on minimize",
        type: "checkbox",
        checked: this.store.get("clearOnMinimize"),
        click: (event) => this.store.set("clearOnMinimize", event.checked),
      },
      {
        type: "separator",
      },
      {
        label: "Launch at startup",
        type: "checkbox",
        checked: this.store.get("launchAtStart"),
        click: (event) => this.store.set("launchAtStart", event.checked),
      },
      {
        label: "Use CMD+U shortcut",
        type: "checkbox",
        checked: this.store.get("useShortcut"),
        click: (event) => this.toggleShortcut(event.checked),
      },
      {
        type: "separator",
      },
      {
        label: "Check updates",
        type: "checkbox",
        checked: this.store.get("checkUpdates"),
        click: (event) => {
          this.store.set("checkUpdates", event.checked);

          if (event.checked) {
            this.store.set("latestSkippedVersion", null);
            autoUpdater.checkForUpdates();
          }
        },
      },
      {
        label: "Update",
        type: "normal",
        click: () => {
          this.store.set("forceUpdate", true);
          autoUpdater.checkForUpdates();
        },
      },
      {
        type: "separator",
      },
      {
        role: "about",
      },
      {
        role: "quit",
        accelerator: "Command+Q",
      },
    ];

    this.tray.popUpContextMenu(Menu.buildFromTemplate(menu));
  };

  createTray = () => {
    const icon = nativeImage.createFromPath(
      path.join(__dirname, "./assets/TrayIconTemplate.png")
    );
    icon.setTemplateImage(true);

    this.tray = new Tray(icon);
    this.setWinPosition();

    this.tray.setIgnoreDoubleClickEvents(true);

    const isShortcutEnabled = this.store.get("useShortcut");
    this.toggleShortcut(isShortcutEnabled);

    this.tray.on("click", this.toggleWindow);
    this.tray.on("right-click", this.rightClickMenu);
    // this.tray.on("double-click", this.toggleWindow);
  };
}

module.exports = TrayGenerator;
