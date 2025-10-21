const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/temp', express.static(path.join(__dirname, '../public/temp')));

// Ensure directories exist
const uploadsDir = path.join(__dirname, '../public/uploads');
const tempDir = path.join(__dirname, '../public/temp');
[uploadsDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mkv|mov|webm|mp3|wav|png|jpg|jpeg|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes

// Upload media file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileInfo = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size,
      type: req.file.mimetype.startsWith('video') ? 'video' :
            req.file.mimetype.startsWith('audio') ? 'audio' : 'image'
    };

    // Get video metadata
    if (fileInfo.type === 'video') {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('FFprobe error:', err);
          fileInfo.duration = 0;
          fileInfo.width = 0;
          fileInfo.height = 0;
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          fileInfo.duration = metadata.format.duration || 0;
          fileInfo.width = videoStream ? videoStream.width : 0;
          fileInfo.height = videoStream ? videoStream.height : 0;
          fileInfo.fps = videoStream ? eval(videoStream.r_frame_rate) : 30;
        }

        // Generate thumbnail
        generateThumbnail(filePath, req.file.filename, (thumbnailPath) => {
          fileInfo.thumbnail = thumbnailPath;
          res.json(fileInfo);
        });
      });
    } else if (fileInfo.type === 'audio') {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (!err) {
          fileInfo.duration = metadata.format.duration || 0;
        }
        res.json(fileInfo);
      });
    } else {
      // Image
      fileInfo.thumbnail = fileInfo.path;
      fileInfo.duration = 5; // Default 5 seconds for images
      res.json(fileInfo);
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate thumbnail for video
function generateThumbnail(videoPath, filename, callback) {
  const thumbnailName = `thumb-${filename}.jpg`;
  const thumbnailPath = path.join(tempDir, thumbnailName);

  ffmpeg(videoPath)
    .screenshots({
      timestamps: ['1'],
      filename: thumbnailName,
      folder: tempDir,
      size: '320x180'
    })
    .on('end', () => {
      callback(`/temp/${thumbnailName}`);
    })
    .on('error', (err) => {
      console.error('Thumbnail generation error:', err);
      callback(null);
    });
}

// Get media info
app.post('/api/media/info', (req, res) => {
  const { filepath } = req.body;
  const fullPath = path.join(__dirname, '..', filepath);

  ffmpeg.ffprobe(fullPath, (err, metadata) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(metadata);
  });
});

// Export video
app.post('/api/export', (req, res) => {
  const { clips, settings } = req.body;
  const outputFilename = `export-${uuidv4()}.mp4`;
  const outputPath = path.join(tempDir, outputFilename);

  try {
    exportVideo(clips, settings, outputPath, (error, result) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json({
        success: true,
        path: `/temp/${outputFilename}`,
        filename: outputFilename
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export video function
function exportVideo(clips, settings, outputPath, callback) {
  if (!clips || clips.length === 0) {
    return callback(new Error('No clips to export'));
  }

  // Create filter complex for concatenation and effects
  const videoClips = clips.filter(c => c.type === 'video' || c.type === 'image');

  if (videoClips.length === 0) {
    return callback(new Error('No video clips to export'));
  }

  // Simple export for now - we'll enhance this
  const command = ffmpeg();

  // For simple case: single video clip with trim
  if (videoClips.length === 1 && videoClips[0].type === 'video') {
    const clip = videoClips[0];
    const inputPath = path.join(__dirname, '..', clip.path);

    command
      .input(inputPath)
      .setStartTime(clip.start || 0)
      .setDuration(clip.duration || clip.end - clip.start)
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 22',
        '-c:a aac',
        '-b:a 128k'
      ])
      .output(outputPath)
      .on('start', (cmdLine) => {
        console.log('FFmpeg command:', cmdLine);
      })
      .on('progress', (progress) => {
        console.log('Processing: ' + progress.percent + '% done');
        io.emit('export-progress', { percent: progress.percent });
      })
      .on('end', () => {
        console.log('Export complete');
        callback(null, { success: true });
      })
      .on('error', (err) => {
        console.error('Export error:', err);
        callback(err);
      })
      .run();
  } else {
    // Multiple clips - need concat demuxer
    exportMultipleClips(videoClips, outputPath, callback);
  }
}

// Export multiple clips
function exportMultipleClips(clips, outputPath, callback) {
  const concatFile = path.join(tempDir, `concat-${uuidv4()}.txt`);
  const processedClips = [];

  // Process each clip first
  let processed = 0;

  clips.forEach((clip, index) => {
    const inputPath = path.join(__dirname, '..', clip.path);
    const tempClipPath = path.join(tempDir, `clip-${index}-${uuidv4()}.mp4`);

    const cmd = ffmpeg(inputPath);

    if (clip.start !== undefined) {
      cmd.setStartTime(clip.start);
    }
    if (clip.duration !== undefined) {
      cmd.setDuration(clip.duration);
    } else if (clip.end !== undefined && clip.start !== undefined) {
      cmd.setDuration(clip.end - clip.start);
    }

    cmd
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        '-c:a aac'
      ])
      .output(tempClipPath)
      .on('end', () => {
        processedClips[index] = tempClipPath;
        processed++;

        if (processed === clips.length) {
          // All clips processed, now concatenate
          concatenateClips(processedClips, outputPath, callback);
        }
      })
      .on('error', (err) => {
        console.error('Clip processing error:', err);
        callback(err);
      })
      .run();
  });
}

// Concatenate clips
function concatenateClips(clipPaths, outputPath, callback) {
  const concatFile = path.join(tempDir, `concat-${uuidv4()}.txt`);
  const fileList = clipPaths.map(p => `file '${p}'`).join('\n');

  fs.writeFileSync(concatFile, fileList);

  ffmpeg()
    .input(concatFile)
    .inputOptions(['-f concat', '-safe 0'])
    .outputOptions([
      '-c:v libx264',
      '-preset fast',
      '-crf 22',
      '-c:a aac',
      '-b:a 128k'
    ])
    .output(outputPath)
    .on('progress', (progress) => {
      io.emit('export-progress', { percent: progress.percent });
    })
    .on('end', () => {
      // Cleanup temp files
      fs.unlinkSync(concatFile);
      clipPaths.forEach(p => {
        try { fs.unlinkSync(p); } catch (e) {}
      });
      callback(null, { success: true });
    })
    .on('error', (err) => {
      callback(err);
    })
    .run();
}

// Trim video endpoint
app.post('/api/trim', (req, res) => {
  const { filepath, start, end } = req.body;
  const inputPath = path.join(__dirname, '..', filepath);
  const outputFilename = `trimmed-${uuidv4()}.mp4`;
  const outputPath = path.join(tempDir, outputFilename);

  ffmpeg(inputPath)
    .setStartTime(start)
    .setDuration(end - start)
    .output(outputPath)
    .on('end', () => {
      res.json({
        success: true,
        path: `/temp/${outputFilename}`
      });
    })
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    })
    .run();
});

// Save project
app.post('/api/project/save', (req, res) => {
  try {
    const { project } = req.body;
    const projectId = project.id || uuidv4();
    const projectsDir = path.join(__dirname, '../public/projects');

    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    const projectFile = path.join(projectsDir, `${projectId}.json`);
    fs.writeFileSync(projectFile, JSON.stringify(project, null, 2));

    res.json({
      success: true,
      projectId: projectId,
      filename: `${projectId}.json`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Load project
app.get('/api/project/load/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const projectsDir = path.join(__dirname, '../public/projects');
    const projectFile = path.join(projectsDir, `${projectId}.json`);

    if (!fs.existsSync(projectFile)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = fs.readFileSync(projectFile, 'utf8');
    res.json(JSON.parse(projectData));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List projects
app.get('/api/project/list', (req, res) => {
  try {
    const projectsDir = path.join(__dirname, '../public/projects');

    if (!fs.existsSync(projectsDir)) {
      return res.json({ projects: [] });
    }

    const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'));
    const projects = files.map(file => {
      const filePath = path.join(projectsDir, file);
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      return {
        id: path.basename(file, '.json'),
        name: data.name || 'Untitled Project',
        created: data.created || stats.birthtime,
        modified: stats.mtime
      };
    });

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ffmpeg: true });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`LMM Video Editor running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
