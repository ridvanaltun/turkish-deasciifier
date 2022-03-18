const { Tray, Menu, globalShortcut, nativeImage } = require("electron");
const path = require("path");

class TrayGenerator {
  constructor(window, store) {
    this.tray = null;
    this.window = window;
    this.store = store;
  }

  getWindowPosition = () => {
    const windowBounds = this.window.getBounds();
    const trayBounds = this.tray.getBounds();

    // center window horizontally below the tray icon
    const x = Math.round(
      trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
    );

    // position window vertically below the tray icon
    const y = Math.round(trayBounds.y + trayBounds.height);

    return { x, y };
  };

  setWinPosition = () => {
    const position = this.getWindowPosition();
    this.window.setPosition(position.x, position.y, false);
  };

  showWindow = () => {
    this.setWinPosition();
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
        click: (event) => {
          this.window.setAlwaysOnTop(event.checked);
          this.store.set("alwaysOnTop", event.checked);
        },
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
        role: "quit",
        accelerator: "Command+Q",
      },
    ];

    this.tray.popUpContextMenu(Menu.buildFromTemplate(menu));
  };

  createTray = () => {
    const icon = nativeImage.createFromPath(
      path.join(__dirname, "./assets/TrayIcon.png")
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
