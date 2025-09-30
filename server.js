
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

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

const ffmpeg = require('fluent-ffmpeg');

// API endpoint to merge videos
app.post('/api/merge', (req, res) => {
    const { videos, folder } = req.body;

    if (!videos || videos.length < 2) {
        return res.status(400).json({ error: 'At least two videos are required to merge.' });
    }

    const videoDir = folder || path.join(__dirname, 'videos');
    const outputDir = path.join(__dirname, 'output');

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
        .outputOptions('-c copy') // Fast merge without re-encoding
        .save(outputFilePath)
        .on('end', () => {
            console.log('Merging finished successfully.');
            try {
                fs.unlinkSync(listFilePath); // Clean up the temporary file list
            } catch (cleanupErr) {
                console.error('Error cleaning up temp file:', cleanupErr);
            }
            res.json({ message: 'Merge successful', outputFile: outputFileName });
        })
        .on('error', (err) => {
            console.error('Error during merging:', err);
            try {
                fs.unlinkSync(listFilePath); // Clean up on error too
            } catch (cleanupErr) {
                console.error('Error cleaning up temp file:', cleanupErr);
            }
            res.status(500).json({ error: 'Merging failed', details: err.message });
        });
});

// Handles any requests that don't match the ones above
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '/client/build/index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
