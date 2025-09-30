
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const app = express();
const port = 5000;

// Set ffmpeg path
const ffmpegPath = 'C:\\Users\\Seonil\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffmpeg.exe';
const ffprobePath = 'C:\\Users\\Seonil\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffprobe.exe';

if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log('FFmpeg path set:', ffmpegPath);
}
if (fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath);
    console.log('FFprobe path set:', ffprobePath);
}

app.use(cors());
app.use(express.json());

// Serve the static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to browse folders
app.get('/api/browse', (req, res) => {
    const folderPath = req.query.path || require('os').homedir();

    fs.readdir(folderPath, { withFileTypes: true }, (err, entries) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).json({ error: err.message });
        }

        const folders = entries
            .filter(entry => entry.isDirectory())
            .map(entry => ({
                name: entry.name,
                path: path.join(folderPath, entry.name)
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            current: folderPath,
            parent: path.dirname(folderPath),
            folders
        });
    });
});

// API endpoint to get the list of videos
app.get('/api/videos', (req, res) => {
    const customFolder = req.query.folder;
    const videoDir = customFolder || path.join(__dirname, 'videos');

    fs.readdir(videoDir, (err, files) => {
        if (err) {
            console.error('Error reading video directory:', err);
            return res.status(500).json({
                error: `Could not read video directory: ${videoDir}. ${err.message}`
            });
        }

        const videoFiles = files.filter(file => file.toLowerCase().endsWith('.mp4'));

        const videoData = videoFiles.map(file => {
            const filePath = path.join(videoDir, file);
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

// API endpoint to trim video to first 30 seconds
app.post('/api/trim', (req, res) => {
    const { video, folder, outputFolder } = req.body;

    if (!video || !folder) {
        return res.status(400).json({ error: 'Video and folder path are required.' });
    }

    const videoDir = folder || path.join(__dirname, 'videos');
    const inputPath = path.join(videoDir, video);
    const outputDir = outputFolder || path.join(videoDir, 'trimmed_output');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFileName = `trimmed-${Date.now()}-${video}`;
    const outputFilePath = path.join(outputDir, outputFileName);

    console.log('Starting trim:', inputPath);
    console.log('Output will be saved to:', outputFilePath);

    ffmpeg(inputPath)
        .setStartTime(0)
        .setDuration(30)
        .outputOptions(['-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k'])
        .on('start', (commandLine) => {
            console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
            console.log('Processing: ' + progress.percent + '% done');
        })
        .on('end', () => {
            console.log('Trimming finished successfully.');
            res.json({
                message: 'Trim successful',
                outputFile: outputFileName,
                outputPath: outputFilePath
            });
        })
        .on('error', (err, stdout, stderr) => {
            console.error('Error during trimming:', err.message);
            console.error('FFmpeg stderr:', stderr);
            res.status(500).json({
                error: '자르기 실패',
                details: err.message,
                stderr: stderr
            });
        })
        .save(outputFilePath);
});

// API endpoint to create timelapse
app.post('/api/timelapse', (req, res) => {
    const { videos, folder, fps, outputFolder } = req.body;

    if (!videos || videos.length === 0) {
        return res.status(400).json({ error: 'At least one video is required.' });
    }

    const targetFps = fps || 60;
    const videoDir = folder || path.join(__dirname, 'videos');
    const outputDir = outputFolder || path.join(videoDir, 'timelapse_output');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = [];
    let processed = 0;

    console.log(`Starting timelapse at ${targetFps}fps for ${videos.length} video(s)`);

    const processVideo = (videoName) => {
        return new Promise((resolve, reject) => {
            const inputPath = path.join(videoDir, videoName);
            const outputFileName = `timelapse-${targetFps}fps-${Date.now()}-${videoName}`;
            const outputFilePath = path.join(outputDir, outputFileName);

            console.log(`Processing: ${videoName}`);

            ffmpeg(inputPath)
                .videoFilters(`setpts=PTS/${targetFps}`)
                .outputOptions([
                    '-r', String(targetFps),
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-crf', '23',
                    '-an',
                    '-movflags', '+faststart'
                ])
                .on('start', (commandLine) => {
                    console.log('FFmpeg command:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log(`${videoName}: ${progress.percent}% done`);
                })
                .on('end', () => {
                    console.log(`Finished: ${videoName}`);
                    results.push({
                        original: videoName,
                        output: outputFileName,
                        outputPath: outputFilePath
                    });
                    resolve();
                })
                .on('error', (err, stdout, stderr) => {
                    console.error(`Error processing ${videoName}:`, err.message);
                    reject(err);
                })
                .save(outputFilePath);
        });
    };

    const processAll = async () => {
        for (const video of videos) {
            try {
                await processVideo(video);
                processed++;
            } catch (err) {
                return res.status(500).json({
                    error: '타임랩스 생성 실패',
                    details: err.message,
                    processed: results
                });
            }
        }

        res.json({
            message: `타임랩스 생성 완료 (${targetFps}fps)`,
            processed: processed,
            results: results,
            outputPath: outputDir
        });
    };

    processAll();
});

// API endpoint to speed up videos
app.post('/api/speedup', (req, res) => {
    const { videos, folder, speed, outputFolder } = req.body;

    if (!videos || videos.length === 0) {
        return res.status(400).json({ error: 'At least one video is required.' });
    }

    if (!speed || ![2, 4, 8].includes(speed)) {
        return res.status(400).json({ error: 'Speed must be 2, 4, or 8.' });
    }

    const videoDir = folder || path.join(__dirname, 'videos');
    const outputDir = outputFolder || path.join(videoDir, 'speedup_output');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = [];
    let processed = 0;
    let hasError = false;

    console.log(`Starting ${speed}x speed processing for ${videos.length} video(s)`);

    const processVideo = (videoName) => {
        return new Promise((resolve, reject) => {
            const inputPath = path.join(videoDir, videoName);
            const outputFileName = `${speed}x-${Date.now()}-${videoName}`;
            const outputFilePath = path.join(outputDir, outputFileName);

            // Calculate video and audio filters
            const videoFilter = `setpts=${1/speed}*PTS`;
            const audioFilter = `atempo=${speed > 2 ? 2 : speed}${speed === 4 ? ',atempo=2' : speed === 8 ? ',atempo=2,atempo=2' : ''}`;

            console.log(`Processing: ${videoName}`);

            ffmpeg(inputPath)
                .videoFilters(videoFilter)
                .audioFilters(audioFilter)
                .outputOptions(['-preset', 'fast', '-movflags', '+faststart'])
                .on('start', (commandLine) => {
                    console.log('FFmpeg command:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log(`${videoName}: ${progress.percent}% done`);
                })
                .on('end', () => {
                    console.log(`Finished: ${videoName}`);
                    results.push({
                        original: videoName,
                        output: outputFileName,
                        outputPath: outputFilePath
                    });
                    resolve();
                })
                .on('error', (err, stdout, stderr) => {
                    console.error(`Error processing ${videoName}:`, err.message);
                    hasError = true;
                    reject(err);
                })
                .save(outputFilePath);
        });
    };

    // Process videos sequentially
    const processAll = async () => {
        for (const video of videos) {
            try {
                await processVideo(video);
                processed++;
            } catch (err) {
                return res.status(500).json({
                    error: '속도 변경 실패',
                    details: err.message,
                    processed: results
                });
            }
        }

        res.json({
            message: `${speed}x 속도 변경 완료`,
            processed: processed,
            results: results,
            outputPath: outputDir
        });
    };

    processAll();
});

// API endpoint to merge videos
app.post('/api/merge', (req, res) => {
    const { videos, folder, outputFolder } = req.body;

    if (!videos || videos.length < 2) {
        return res.status(400).json({ error: 'At least two videos are required to merge.' });
    }

    const videoDir = folder || path.join(__dirname, 'videos');
    const outputDir = outputFolder || path.join(videoDir, 'merged_output');

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

    console.log('Starting merge with file list:', listFilePath);
    console.log('Output will be saved to:', outputFilePath);

    ffmpeg()
        .input(listFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', '-movflags', '+faststart'])
        .on('start', (commandLine) => {
            console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
            console.log('Processing: ' + progress.percent + '% done');
        })
        .on('end', () => {
            console.log('Merging finished successfully.');
            try {
                fs.unlinkSync(listFilePath);
            } catch (cleanupErr) {
                console.error('Error cleaning up temp file:', cleanupErr);
            }
            res.json({ message: 'Merge successful', outputFile: outputFileName, outputPath: outputFilePath });
        })
        .on('error', (err, stdout, stderr) => {
            console.error('Error during merging:', err.message);
            console.error('FFmpeg stderr:', stderr);
            try {
                fs.unlinkSync(listFilePath);
            } catch (cleanupErr) {
                console.error('Error cleaning up temp file:', cleanupErr);
            }
            res.status(500).json({
                error: '병합 실패',
                details: err.message,
                stderr: stderr
            });
        })
        .save(outputFilePath);
});

app.listen(port, () => {
    console.log(`
╔════════════════════════════════════════╗
║        MP4 Merger Server Ready         ║
╠════════════════════════════════════════╣
║  URL: http://localhost:${port}           ║
║  Press Ctrl+C to stop                  ║
╚════════════════════════════════════════╝
    `);
});
