import { app, BrowserWindow, dialog } from "electron";
import express from "express";
import * as path from "path";
import * as fs from "fs";
import getPort from "get-port";
import { checkForWebUpdate, getActiveWebDir } from "./web-updater";

let mainWindow: BrowserWindow | null = null;
let serverListener: ReturnType<typeof express.application.listen> | null = null;

async function createMainWindow(): Promise<void> {
  const bundledWebDir = app.isPackaged
    ? path.join(process.resourcesPath, "web")
    : path.join(__dirname, "..", "web");

  const webDir = getActiveWebDir(bundledWebDir);

  const server = express();
  server.use(express.static(webDir, { maxAge: "1d", immutable: true }));

  const port = await getPort({ port: 31337 });
  serverListener = server.listen(port, "127.0.0.1");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    autoHideMenuBar: true,
    fullscreenable: true,
    title: "PokéVoid",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  mainWindow.webContents.on("will-prevent-unload", (event) => {
    if (!mainWindow) return;
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "question",
      buttons: ["Leave", "Stay"],
      title: "PokéVoid",
      message: "You have unsaved progress. Close anyway?",
      defaultId: 0,
      cancelId: 1,
    });
    if (choice === 0) event.preventDefault();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    try { serverListener?.close(); } catch {}
  });

  checkForWebUpdate(bundledWebDir).then((result) => {
    if (result?.updated) {
      console.log(`[WebUpdater] Update to ${result.version} downloaded. Will apply on next restart.`);
    }
  }).catch((err) => {
    console.warn("[WebUpdater] Update check failed (offline?):", err.message);
  });
}

app.whenReady().then(createMainWindow);
app.on("window-all-closed", () => app.quit());
app.on("activate", () => { if (!mainWindow) createMainWindow(); });
