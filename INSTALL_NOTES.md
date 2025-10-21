# Installation Notes

## Important: FFmpeg Requirement

**FFmpeg is required for this application to work properly.**

### Why FFmpeg?
FFmpeg is used for:
- Video thumbnail generation
- Video processing and trimming
- Audio extraction and mixing
- Video export and format conversion

### Installing FFmpeg

#### CachyOS / Arch Linux
```bash
sudo pacman -S ffmpeg
```

#### Ubuntu / Debian
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

#### Fedora
```bash
sudo dnf install ffmpeg
```

#### Verify Installation
After installing, verify FFmpeg is available:
```bash
ffmpeg -version
```

You should see output showing the FFmpeg version and configuration.

## Quick Start

Once FFmpeg is installed:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the application:
   ```bash
   npm start
   ```

3. Open your browser to:
   ```
   http://localhost:3000
   ```

## Testing Without FFmpeg

The application will start without FFmpeg, but you'll see warnings and these features won't work:
- Thumbnail generation
- Video export
- Media duration detection

For a fully functional video editor, **FFmpeg is required**.

## Troubleshooting

### "ffmpeg: command not found"
This means FFmpeg is not installed or not in your PATH. Install it using the commands above.

### "Cannot find module 'xyz'"
Run `npm install` to install all dependencies.

### Port 3000 already in use
Change the port:
```bash
PORT=8080 npm start
```

### Upload fails
- Check file size (max 500MB by default)
- Ensure file format is supported
- Check browser console for errors

## For Developers

### Project Structure
- `backend/` - Node.js server and API
- `frontend/` - HTML/CSS/JS client
- `public/` - Uploaded files and exports

### Running in Development Mode
```bash
npm run dev
```

This uses nodemon for auto-reload on file changes.

### API Testing
Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"status":"ok","ffmpeg":true}
```

If FFmpeg is not installed, `ffmpeg` will be `false`.
