const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');

// Enhanced logging utility
const logger = {
  colors: {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  },

  timestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
  },

  info(message) {
    console.log(`${this.colors.cyan}[${this.timestamp()}] [INFO]${this.colors.reset} ${message}`);
  },

  success(message) {
    console.log(`${this.colors.green}[${this.timestamp()}] [SUCCESS]${this.colors.reset} ${message}`);
  },

  warn(message) {
    console.log(`${this.colors.yellow}[${this.timestamp()}] [WARNING]${this.colors.reset} ${message}`);
  },

  error(message, err = null) {
    console.error(`${this.colors.red}[${this.timestamp()}] [ERROR]${this.colors.reset} ${message}`);
    if (err) {
      console.error(`${this.colors.dim}${err.stack || err}${this.colors.reset}`);
    }
  },

  debug(message) {
    console.log(`${this.colors.dim}[${this.timestamp()}] [DEBUG]${this.colors.reset} ${message}`);
  },

  ffmpeg(message) {
    console.log(`${this.colors.magenta}[${this.timestamp()}] [FFMPEG]${this.colors.reset} ${message}`);
  }
};

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
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));

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
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
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
      logger.info(`Processing video file: ${req.file.originalname}`);
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error('FFprobe error', err);
          fileInfo.duration = 0;
          fileInfo.width = 0;
          fileInfo.height = 0;
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          fileInfo.duration = metadata.format.duration || 0;
          fileInfo.width = videoStream ? videoStream.width : 0;
          fileInfo.height = videoStream ? videoStream.height : 0;
          fileInfo.fps = videoStream ? eval(videoStream.r_frame_rate) : 30;
          logger.success(`Video metadata extracted: ${fileInfo.width}x${fileInfo.height}, ${fileInfo.duration.toFixed(2)}s`);
        }

        // Generate thumbnail
        generateThumbnail(filePath, req.file.filename, (thumbnailPath) => {
          fileInfo.thumbnail = thumbnailPath;
          logger.success(`File uploaded: ${req.file.originalname}`);
          res.json(fileInfo);
        });
      });
    } else if (fileInfo.type === 'audio') {
      logger.info(`Processing audio file: ${req.file.originalname}`);
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (!err) {
          fileInfo.duration = metadata.format.duration || 0;
          logger.success(`Audio metadata extracted: ${fileInfo.duration.toFixed(2)}s`);
        }
        logger.success(`File uploaded: ${req.file.originalname}`);
        res.json(fileInfo);
      });
    } else {
      // Image
      logger.info(`Processing image file: ${req.file.originalname}`);
      fileInfo.thumbnail = fileInfo.path;
      fileInfo.duration = 5; // Default 5 seconds for images
      logger.success(`File uploaded: ${req.file.originalname}`);
      res.json(fileInfo);
    }
  } catch (error) {
    logger.error('Upload error', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate thumbnail for video
function generateThumbnail(videoPath, filename, callback) {
  const thumbnailName = `thumb-${filename}.jpg`;
  const thumbnailPath = path.join(tempDir, thumbnailName);

  logger.debug(`Generating thumbnail for: ${filename}`);
  ffmpeg(videoPath)
    .screenshots({
      timestamps: ['1'],
      filename: thumbnailName,
      folder: tempDir,
      size: '320x180'
    })
    .on('end', () => {
      logger.success(`Thumbnail generated: ${thumbnailName}`);
      callback(`/temp/${thumbnailName}`);
    })
    .on('error', (err) => {
      logger.error('Thumbnail generation error', err);
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

  logger.info(`Starting export with quality: ${settings.quality}, format: ${settings.format}`);

  // Separate video and audio clips
  const videoClips = clips.filter(c => c.type === 'video' || c.type === 'image');
  const audioClips = clips.filter(c => c.type === 'audio');

  if (videoClips.length === 0) {
    return callback(new Error('No video clips to export'));
  }

  // Determine quality settings
  const qualitySettings = getQualitySettings(settings.quality);
  logger.info(`Using quality settings: ${qualitySettings.resolution}, CRF: ${qualitySettings.crf}`);

  // For simple case: single video clip with trim
  if (videoClips.length === 1 && videoClips[0].type === 'video') {
    const clip = videoClips[0];
    const inputPath = path.join(__dirname, '..', clip.path);

    const command = ffmpeg()
      .input(inputPath)
      .setStartTime(clip.start || 0)
      .setDuration(clip.duration || clip.end - clip.start);

    // Apply quality settings
    const outputOptions = [
      '-c:v libx264',
      '-preset fast',
      `-crf ${qualitySettings.crf}`,
      '-c:a aac',
      '-b:a 192k'  // Increased audio bitrate
    ];

    // Apply resolution scaling if specified
    if (qualitySettings.scale) {
      outputOptions.push(`-vf scale=${qualitySettings.scale}`);
    }

    command
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('start', (cmdLine) => {
        logger.ffmpeg(`Starting export: ${cmdLine}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          logger.ffmpeg(`Export progress: ${progress.percent.toFixed(1)}% done`);
        }
        io.emit('export-progress', { percent: progress.percent || 0 });
      })
      .on('end', () => {
        logger.success('Video export completed successfully');
        callback(null, { success: true });
      })
      .on('error', (err) => {
        logger.error('Export error', err);
        callback(err);
      })
      .run();
  } else {
    // Multiple clips - need concat demuxer with audio mixing
    exportMultipleClips(clips, settings, outputPath, callback);
  }
}

// Get quality settings based on quality level
function getQualitySettings(quality) {
  switch (quality) {
    case 'high':
      return {
        resolution: '1080p',
        scale: '1920:1080',
        crf: 18
      };
    case 'medium':
      return {
        resolution: '720p',
        scale: '1280:720',
        crf: 22
      };
    case 'low':
      return {
        resolution: '480p',
        scale: '854:480',
        crf: 26
      };
    default:
      return {
        resolution: '1080p',
        scale: null,  // Keep original resolution
        crf: 22
      };
  }
}

// Export multiple clips
function exportMultipleClips(clips, settings, outputPath, callback) {
  const concatFile = path.join(tempDir, `concat-${uuidv4()}.txt`);
  const processedClips = [];

  // Separate video and audio clips
  const videoClips = clips.filter(c => c.type === 'video' || c.type === 'image');
  const audioClips = clips.filter(c => c.type === 'audio');

  logger.info(`Processing ${videoClips.length} video clips and ${audioClips.length} audio clips`);

  // Get quality settings
  const qualitySettings = getQualitySettings(settings.quality);

  // Process each clip first
  let processed = 0;
  const totalClips = videoClips.length;

  videoClips.forEach((clip, index) => {
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

    const outputOptions = [
      '-c:v libx264',
      '-preset ultrafast',
      '-c:a aac',
      '-b:a 192k'
    ];

    // Apply resolution scaling
    if (qualitySettings.scale) {
      outputOptions.push(`-vf scale=${qualitySettings.scale}`);
    }

    cmd
      .outputOptions(outputOptions)
      .output(tempClipPath)
      .on('end', () => {
        processedClips[index] = tempClipPath;
        processed++;
        logger.debug(`Processed clip ${processed}/${totalClips}`);

        if (processed === totalClips) {
          // All clips processed, now concatenate with audio mixing
          concatenateClips(processedClips, audioClips, settings, outputPath, callback);
        }
      })
      .on('error', (err) => {
        logger.error('Clip processing error', err);
        callback(err);
      })
      .run();
  });
}

// Concatenate clips with audio mixing
function concatenateClips(clipPaths, audioClips, settings, outputPath, callback) {
  const concatFile = path.join(tempDir, `concat-${uuidv4()}.txt`);
  const fileList = clipPaths.map(p => `file '${p}'`).join('\n');

  fs.writeFileSync(concatFile, fileList);

  const qualitySettings = getQualitySettings(settings.quality);
  const command = ffmpeg();

  // Add video input (concatenated)
  command.input(concatFile).inputOptions(['-f concat', '-safe 0']);

  // Add audio track inputs
  if (audioClips && audioClips.length > 0) {
    logger.info(`Adding ${audioClips.length} audio tracks to mix`);
    audioClips.forEach((audioClip, index) => {
      const audioPath = path.join(__dirname, '..', audioClip.path);
      command.input(audioPath);

      // Set start time and duration for audio clips
      if (audioClip.start !== undefined) {
        command.inputOptions(`-ss ${audioClip.start}`);
      }
      if (audioClip.duration !== undefined) {
        command.inputOptions(`-t ${audioClip.duration}`);
      }
    });

    // Build filter complex for audio mixing
    let filterComplex = '';
    const audioInputs = audioClips.map((_, i) => `[${i + 1}:a]`).join('');

    if (audioClips.length > 0) {
      // Mix audio from video with additional audio tracks
      filterComplex = `[0:a]${audioInputs}amix=inputs=${audioClips.length + 1}:duration=longest:dropout_transition=2[aout]`;
      command.complexFilter(filterComplex);
      command.outputOptions('-map 0:v');  // Map video from concat
      command.outputOptions('-map [aout]');  // Map mixed audio
    }
  } else {
    // No additional audio tracks, just use video audio
    logger.info('No additional audio tracks, using video audio only');
  }

  const outputOptions = [
    '-c:v copy',  // Copy video codec from processed clips
    '-c:a aac',
    '-b:a 192k',
    '-ar 48000'  // Sample rate
  ];

  command
    .outputOptions(outputOptions)
    .output(outputPath)
    .on('start', (cmdLine) => {
      logger.ffmpeg(`Concatenating with command: ${cmdLine}`);
    })
    .on('progress', (progress) => {
      if (progress.percent) {
        io.emit('export-progress', { percent: progress.percent });
      }
    })
    .on('end', () => {
      // Cleanup temp files
      try {
        fs.unlinkSync(concatFile);
        clipPaths.forEach(p => {
          try { fs.unlinkSync(p); } catch (e) {}
        });
      } catch (e) {
        logger.warn('Error cleaning up temp files', e);
      }

      logger.success('Concatenation and audio mixing completed');
      callback(null, { success: true });
    })
    .on('error', (err) => {
      logger.error('Concatenation error', err);
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

// Get assets (sounds, transitions, effects)
app.get('/api/assets/:type', (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['sounds', 'transitions', 'effects'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid asset type' });
    }

    const assetsFile = path.join(__dirname, '../public/assets', type, 'assets.json');

    if (!fs.existsSync(assetsFile)) {
      return res.json({ assets: [] });
    }

    const assetsData = fs.readFileSync(assetsFile, 'utf8');
    const assets = JSON.parse(assetsData);

    logger.debug(`Loaded ${assets.length} ${type} assets`);
    res.json({ assets });
  } catch (error) {
    logger.error(`Error loading assets: ${req.params.type}`, error);
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
  logger.success(`LMM Video Editor Server Started`);
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Node version: ${process.version}`);
  logger.info(`Platform: ${process.platform}`);
  logger.info(`Press Ctrl+C to stop the server`);
});
