import { BrowserWindow as e, app as t, clipboard as n, globalShortcut as r, ipcMain as i } from "electron";
import * as a from "path";
//#region electron/main.ts
var o = null, s = null, c = "", l = !1;
function u() {
	o = new e({
		width: 1280,
		height: 850,
		minWidth: 1e3,
		minHeight: 700,
		show: !1,
		titleBarStyle: "hiddenInset",
		webPreferences: {
			preload: a.join(__dirname, "preload.js"),
			contextIsolation: !0,
			nodeIntegration: !1
		}
	}), process.env.VITE_DEV_SERVER_URL ? (o.loadURL(process.env.VITE_DEV_SERVER_URL), o.webContents.openDevTools()) : o.loadFile(a.join(__dirname, "../dist/index.html")), o.once("ready-to-show", () => {
		o && o.show();
	}), o.on("closed", () => {
		o = null;
	});
}
function d() {
	r.register("Alt+Space", () => {
		o && (o.isVisible() ? o.hide() : (o.show(), o.focus()));
	});
}
function f() {
	s && clearInterval(s), c = n.readText(), s = setInterval(() => {
		if (!l) return;
		let e = n.readText();
		e && e !== c && (c = e, o && o.webContents.send("clipboard-changed", e));
	}, 1e3);
}
i.handle("toggle-clipboard-monitor", (e, t) => (l = t, t ? f() : s && clearInterval(s), l)), i.handle("capture-screen", async () => o ? (o.hide(), await new Promise((e) => setTimeout(e, 350)), o.show(), {
	success: !0,
	simulated: !0,
	message: "Screen capture captured successfully. Mock screenshot returned."
}) : null), i.handle("get-app-version", () => t.getVersion()), i.handle("minimize-window", () => {
	o && o.minimize();
}), i.handle("hide-window", () => {
	o && o.hide();
}), i.handle("show-window", () => {
	o && (o.show(), o.focus());
}), t.whenReady().then(() => {
	u(), d(), t.on("activate", () => {
		e.getAllWindows().length === 0 && u();
	});
}), t.on("will-quit", () => {
	r.unregisterAll(), s && clearInterval(s);
}), t.on("window-all-closed", () => {
	process.platform !== "darwin" && t.quit();
});
//#endregion
export {};
