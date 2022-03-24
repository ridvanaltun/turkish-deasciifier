const {
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
  clipboard,
} = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const Positioner = require("electron-positioner");
const { is } = require("electron-util");
const { getWindowPosition } = require("../lib/getWindowPosition");

const { Deasciifier } = require("../lib/deasciifier.min");
const patterns = require("../lib/deasciifier.patterns.min");

Deasciifier.init(patterns);

class TrayGenerator {
  constructor(window, store) {
    this.tray = null;
    this.window = window;
    this.store = store;
    this.positioner = new Positioner(window);

    Deasciifier.init(patterns);
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

    // const windowBounds = this.window.getBounds();
    const trayBounds = this.tray.getBounds();

    this.positioner.move(whereIsTray, trayBounds);
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

  deasciifyClipboard = () => {
    const readText = clipboard.readText("clipboard");
    const deasciifyedObject = Deasciifier.deasciify(readText);
    clipboard.write(deasciifyedObject, "clipboard");
  };

  toggleShortcut = (enabled) => {
    this.store.set("useToggleShortcut", enabled);

    if (enabled) {
      globalShortcut.register("CommandOrControl+U", this.toggleWindow);
    } else {
      globalShortcut.unregister("CommandOrControl+U");
    }
  };

  clipboardShortcut = (enabled) => {
    this.store.set("useClipboardShortcut", enabled);

    if (enabled) {
      globalShortcut.register("CommandOrControl+1", this.deasciifyClipboard);
    } else {
      globalShortcut.unregister("CommandOrControl+1");
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
        label: `Toggle with ${is.macos ? "CMD" : "CTRL"}+U shortcut`,
        type: "checkbox",
        checked: this.store.get("useToggleShortcut"),
        click: (event) => this.toggleShortcut(event.checked),
      },
      {
        label: `Deasciify clipboard with ${
          is.macos ? "CMD" : "CTRL"
        }+1 shortcut`,
        type: "checkbox",
        checked: this.store.get("useClipboardShortcut"),
        click: (event) => this.clipboardShortcut(event.checked),
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

    const isToggleShortcutEnabled = this.store.get("useToggleShortcut");
    this.toggleShortcut(isToggleShortcutEnabled);

    const isClipboardShortcutEnabled = this.store.get("useClipboardShortcut");
    this.clipboardShortcut(isClipboardShortcutEnabled);

    this.tray.on("click", this.toggleWindow);
    this.tray.on("right-click", this.rightClickMenu);
    // this.tray.on("double-click", this.toggleWindow);
  };
}

module.exports = TrayGenerator;
