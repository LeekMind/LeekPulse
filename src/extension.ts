import * as vscode from 'vscode';
import * as http from 'http';

let myStatusBarItem: vscode.StatusBarItem;
let intervalId: NodeJS.Timeout | undefined;
let isRunning = false;

const TEST_URL = 'http://speedtest.tele2.net/100MB.zip'; 

export function activate(context: vscode.ExtensionContext) {
    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    myStatusBarItem.command = 'leekpulse.toggle'; // Make it clickable
    myStatusBarItem.tooltip = "Click to Toggle Speed Test (Save Data)";
    context.subscriptions.push(myStatusBarItem);

    let toggleCommand = vscode.commands.registerCommand('leekpulse.toggle', () => {
        if (isRunning) {
            stopMonitoring();
        } else {
            startMonitoring();
        }
    });
    context.subscriptions.push(toggleCommand);

    let configDisposable = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('leekpulse.interval')) {
            if (isRunning) {
                startMonitoring(); 
            }
        }
    });
    context.subscriptions.push(configDisposable);

    const config = vscode.workspace.getConfiguration('leekpulse');
    const autoStart = config.get<boolean>('enableAutoStart', false);

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
    myStatusBarItem.backgroundColor = undefined;

    const config = vscode.workspace.getConfiguration('leekpulse');
    const seconds = config.get<number>('interval', 10);
    const ms = seconds * 1000;

    checkSpeed();
    intervalId = setInterval(checkSpeed, ms);
}

function stopMonitoring() {
    if (intervalId) clearInterval(intervalId);
    isRunning = false;

    myStatusBarItem.text = "$(circle-slash) LeekPulse: Paused";
    myStatusBarItem.backgroundColor = undefined; 
}

function checkSpeed() {
    if (!isRunning) return;

    const testDuration = 800; // 0.8 seconds sample
    let loadedBytes = 0;
    const startTime = Date.now();

    myStatusBarItem.text = "$(cloud-download) LeekPulse: Testing...";

    const req = http.get(TEST_URL, (res) => {
        res.on('data', (chunk) => {
            loadedBytes += chunk.length;
            
            const currentTime = Date.now();
            const duration = currentTime - startTime;

            if (duration >= testDuration) {
                req.destroy(); // Stop downloading to SAVE DATA
                
                const seconds = duration / 1000;
                const bits = loadedBytes * 8;
                const mbps = (bits / seconds) / 1_000_000;
                
                updateStatusBar(mbps, true);
            }
        });
    });

    req.on('error', (e) => {
        updateStatusBar(0, false);
    });

    req.setTimeout(2000, () => {
        req.destroy();
    });
}

function updateStatusBar(mbps: number, online: boolean) {
    if (!isRunning) return; // If user paused during test, don't update

    if (!online) {
        myStatusBarItem.text = "$(plug) LeekPulse: Offline";
        myStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        return;
    }

    let icon = "$(rocket)";
    let color = undefined;

    if (mbps > 100) {
        icon = "$(rocket)"; 
    } else if (mbps > 20) {
        icon = "$(check)"; 
    } else if (mbps > 5) {
        icon = "$(dashboard)"; 
        color = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        icon = "$(alert)"; 
        color = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    myStatusBarItem.text = `LeekPulse ${icon} ${mbps.toFixed(1)} Mbps`;
    myStatusBarItem.backgroundColor = color;
}

export function deactivate() {
    if (intervalId) clearInterval(intervalId);
}