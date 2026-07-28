import { BrowserWindow, app, clipboard, globalShortcut, ipcMain } from "electron";
import * as path from "path";
//#region electron/main.ts
var mainWindow = null;
var clipboardTimer = null;
var lastClipboardText = "";
var clipboardMonitoring = false;
function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1280,
		height: 850,
		minWidth: 1e3,
		minHeight: 700,
		show: false,
		titleBarStyle: "hiddenInset",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false
		}
	});
	if (process.env.VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
		mainWindow.webContents.openDevTools();
	} else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
	mainWindow.once("ready-to-show", () => {
		if (mainWindow) mainWindow.show();
	});
	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}
function registerGlobalHotkeys() {
	globalShortcut.register("Alt+Space", () => {
		if (mainWindow) if (mainWindow.isVisible()) mainWindow.hide();
		else {
			mainWindow.show();
			mainWindow.focus();
		}
	});
}
function startClipboardMonitoring() {
	if (clipboardTimer) clearInterval(clipboardTimer);
	lastClipboardText = clipboard.readText();
	clipboardTimer = setInterval(() => {
		if (!clipboardMonitoring) return;
		const currentText = clipboard.readText();
		if (currentText && currentText !== lastClipboardText) {
			lastClipboardText = currentText;
			if (mainWindow) mainWindow.webContents.send("clipboard-changed", currentText);
		}
	}, 1e3);
}
ipcMain.handle("toggle-clipboard-monitor", (event, enabled) => {
	clipboardMonitoring = enabled;
	if (enabled) startClipboardMonitoring();
	else if (clipboardTimer) clearInterval(clipboardTimer);
	return clipboardMonitoring;
});
ipcMain.handle("capture-screen", async () => {
	if (!mainWindow) return null;
	mainWindow.hide();
	await new Promise((resolve) => setTimeout(resolve, 350));
	mainWindow.show();
	return {
		success: true,
		simulated: true,
		message: "Screen capture captured successfully. Mock screenshot returned."
	};
});
ipcMain.handle("get-app-version", () => {
	return app.getVersion();
});
ipcMain.handle("minimize-window", () => {
	if (mainWindow) mainWindow.minimize();
});
ipcMain.handle("hide-window", () => {
	if (mainWindow) mainWindow.hide();
});
ipcMain.handle("show-window", () => {
	if (mainWindow) {
		mainWindow.show();
		mainWindow.focus();
	}
});
app.whenReady().then(() => {
	createWindow();
	registerGlobalHotkeys();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("will-quit", () => {
	globalShortcut.unregisterAll();
	if (clipboardTimer) clearInterval(clipboardTimer);
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion
export {};
