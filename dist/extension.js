"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var http = __toESM(require("http"));
var myStatusBarItem;
var intervalId;
var isRunning = false;
var TEST_URL = "http://speedtest.tele2.net/100MB.zip";
function activate(context) {
  myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  myStatusBarItem.command = "leekpulse.toggle";
  myStatusBarItem.tooltip = "Click to Toggle Speed Test (Save Data)";
  context.subscriptions.push(myStatusBarItem);
  let toggleCommand = vscode.commands.registerCommand("leekpulse.toggle", () => {
    if (isRunning) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  });
  context.subscriptions.push(toggleCommand);
  let configDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("leekpulse.interval")) {
      if (isRunning) {
        startMonitoring();
      }
    }
  });
  context.subscriptions.push(configDisposable);
  const config = vscode.workspace.getConfiguration("leekpulse");
  const autoStart = config.get("enableAutoStart", false);
  if (autoStart) {
    startMonitoring();
  } else {
    stopMonitoring();
  }
  myStatusBarItem.show();
}
function startMonitoring() {
  if (intervalId) clearInterval(intervalId);
  isRunning = true;
  myStatusBarItem.text = "$(sync~spin) LeekPulse: Starting...";
  myStatusBarItem.backgroundColor = void 0;
  const config = vscode.workspace.getConfiguration("leekpulse");
  const seconds = config.get("interval", 10);
  const ms = seconds * 1e3;
  checkSpeed();
  intervalId = setInterval(checkSpeed, ms);
}
function stopMonitoring() {
  if (intervalId) clearInterval(intervalId);
  isRunning = false;
  myStatusBarItem.text = "$(circle-slash) LeekPulse: Paused";
  myStatusBarItem.backgroundColor = void 0;
}
function checkSpeed() {
  if (!isRunning) return;
  const testDuration = 800;
  let loadedBytes = 0;
  const startTime = Date.now();
  myStatusBarItem.text = "$(cloud-download) LeekPulse: Testing...";
  const req = http.get(TEST_URL, (res) => {
    res.on("data", (chunk) => {
      loadedBytes += chunk.length;
      const currentTime = Date.now();
      const duration = currentTime - startTime;
      if (duration >= testDuration) {
        req.destroy();
        const seconds = duration / 1e3;
        const bits = loadedBytes * 8;
        const mbps = bits / seconds / 1e6;
        updateStatusBar(mbps, true);
      }
    });
  });
  req.on("error", (e) => {
    updateStatusBar(0, false);
  });
  req.setTimeout(2e3, () => {
    req.destroy();
  });
}
function updateStatusBar(mbps, online) {
  if (!isRunning) return;
  if (!online) {
    myStatusBarItem.text = "$(plug) LeekPulse: Offline";
    myStatusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    return;
  }
  let icon = "$(rocket)";
  let color = void 0;
  if (mbps > 100) {
    icon = "$(rocket)";
  } else if (mbps > 20) {
    icon = "$(check)";
  } else if (mbps > 5) {
    icon = "$(dashboard)";
    color = new vscode.ThemeColor("statusBarItem.warningBackground");
  } else {
    icon = "$(alert)";
    color = new vscode.ThemeColor("statusBarItem.errorBackground");
  }
  myStatusBarItem.text = `LeekPulse ${icon} ${mbps.toFixed(1)} Mbps`;
  myStatusBarItem.backgroundColor = color;
}
function deactivate() {
  if (intervalId) clearInterval(intervalId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
