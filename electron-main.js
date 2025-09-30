const electron = require('electron');
const { app, BrowserWindow } = electron;
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let serverProcess;

function checkServerReady(callback, retries = 30) {
    const req = http.get('http://localhost:5000', (res) => {
        callback(true);
    });

    req.on('error', () => {
        if (retries > 0) {
            setTimeout(() => checkServerReady(callback, retries - 1), 500);
        } else {
            callback(false);
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        show: false
    });

    // Wait for server to be ready
    checkServerReady((ready) => {
        if (ready) {
            mainWindow.loadURL('http://localhost:5000');
            mainWindow.show();
        } else {
            console.error('Server failed to start');
            mainWindow.loadURL('data:text/html,<h1>Server failed to start. Please restart the app.</h1>');
            mainWindow.show();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startServer() {
    console.log('Starting Express server...');
    const resourcesPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar')
        : __dirname;

    const serverPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar', 'server.js')
        : path.join(__dirname, 'server.js');

    serverProcess = spawn(process.execPath, [serverPath], {
        cwd: app.isPackaged ? process.resourcesPath : __dirname,
        stdio: 'pipe',
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    });

    serverProcess.stdout.on('data', (data) => {
        console.log('Server:', data.toString());
    });

    serverProcess.stderr.on('data', (data) => {
        console.error('Server Error:', data.toString());
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
    });
}

if (app) {
    app.on('ready', () => {
        startServer();
        createWindow();
    });

    app.on('window-all-closed', () => {
        if (serverProcess) {
            serverProcess.kill();
        }
        app.quit();
    });

    app.on('activate', () => {
        if (mainWindow === null) {
            createWindow();
        }
    });

    app.on('before-quit', () => {
        if (serverProcess) {
            serverProcess.kill();
        }
    });
}