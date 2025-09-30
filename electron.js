const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');

let mainWindow;
let serverPort = 5002; // Different port to avoid conflicts
let server;

// Express server for API
function createServer() {
    const expressApp = express();
    expressApp.use(cors());
    expressApp.use(express.json());

    // API endpoint to get the list of videos
    expressApp.get('/api/videos', (req, res) => {
        const customFolder = req.query.folder;
        if (!customFolder) {
            return res.status(400).json({ error: 'Folder path is required' });
        }

        fs.readdir(customFolder, (err, files) => {
            if (err) {
                console.error('Error reading video directory:', err);
                return res.status(500).json({
                    error: `Could not read video directory: ${customFolder}. ${err.message}`
                });
            }

            const videoFiles = files.filter(file => file.toLowerCase().endsWith('.mp4'));

            const videoData = videoFiles.map(file => {
                const filePath = path.join(customFolder, file);
                try {
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        size: stats.size,
                        createdAt: stats.birthtime
                    };
                } catch (statErr) {
                    console.error('Error reading file stats:', statErr);
                    return {
                        name: file,
                        size: 0,
                        createdAt: new Date()
                    };
                }
            });

            res.json(videoData);
        });
    });

    // API endpoint to merge videos
    expressApp.post('/api/merge', (req, res) => {
        const { videos, folder } = req.body;

        if (!videos || videos.length < 2) {
            return res.status(400).json({ error: 'At least two videos are required to merge.' });
        }

        if (!folder) {
            return res.status(400).json({ error: 'Folder path is required.' });
        }

        const videoDir = folder;
        const outputDir = path.join(folder, 'merged_output');

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const listFilePath = path.join(outputDir, 'videolist.txt');
        const outputFileName = `merged-${Date.now()}.mp4`;
        const outputFilePath = path.join(outputDir, outputFileName);

        // Create a file list for ffmpeg's concat demuxer
        const fileListContent = videos.map(v => `file '${path.join(videoDir, v)}'`).join('\n');

        try {
            fs.writeFileSync(listFilePath, fileListContent);
        } catch (writeErr) {
            return res.status(500).json({ error: 'Failed to create video list file', details: writeErr.message });
        }

        ffmpeg()
            .input(listFilePath)
            .inputOptions(['-f concat', '-safe 0'])
            .outputOptions('-c copy')
            .save(outputFilePath)
            .on('end', () => {
                console.log('Merging finished successfully.');
                try {
                    fs.unlinkSync(listFilePath);
                } catch (cleanupErr) {
                    console.error('Error cleaning up temp file:', cleanupErr);
                }
                res.json({
                    message: 'Merge successful',
                    outputFile: outputFileName,
                    outputPath: outputFilePath
                });
            })
            .on('error', (err) => {
                console.error('Error during merging:', err);
                try {
                    fs.unlinkSync(listFilePath);
                } catch (cleanupErr) {
                    console.error('Error cleaning up temp file:', cleanupErr);
                }
                res.status(500).json({ error: 'Merging failed', details: err.message });
            });
    });

    server = expressApp.listen(serverPort, '127.0.0.1', () => {
        console.log(`Electron server running on port ${serverPort}`);
    }).on('error', (err) => {
        console.error('Server failed to start:', err);
        if (err.code === 'EADDRINUSE') {
            serverPort = serverPort + 1;
            console.log(`Port ${serverPort - 1} in use, trying ${serverPort}`);
            createServer();
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Always load from React dev server when it's available
    const isDev = process.env.NODE_ENV === 'development' || !require('fs').existsSync(path.join(__dirname, 'client/build/index.html'));

    if (isDev) {
        console.log('Loading from React dev server...');
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();

        // Handle loading errors and retry
        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            console.log('Failed to load:', errorDescription);
            setTimeout(() => {
                console.log('Retrying to load React dev server...');
                mainWindow.loadURL('http://localhost:3000');
            }, 2000);
        });
    } else {
        // In production, load built React app
        console.log('Loading from built files...');
        mainWindow.loadFile(path.join(__dirname, 'client/build/index.html'));
    }
}

// IPC handlers
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (result.canceled) {
        return null;
    }

    return result.filePaths[0];
});

ipcMain.handle('get-server-port', () => {
    return serverPort;
});

app.whenReady().then(() => {
    createServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (server) {
        server.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});