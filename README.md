# LMM - Lightweight Movie Maker

A modern, web-based video editor for Linux built with Node.js and FFmpeg. LMM provides an intuitive interface similar to Clipchamp, designed specifically for Linux users who want a simple yet powerful video editing solution.

## Features

### Core Functionality
- **Web-based Interface**: Modern, responsive UI accessible through any browser
- **Drag & Drop**: Easy media import and timeline management
- **Multi-track Timeline**: Separate video and audio tracks
- **Real-time Preview**: Watch your edits as you make them
- **Non-destructive Editing**: Original files remain untouched
- **Video Trimming & Cutting**: Precise control over clip duration
- **Multiple Format Support**: Import MP4, AVI, MKV, MOV, WebM, and more
- **Audio Support**: Add and edit audio tracks (MP3, WAV)
- **Image Support**: Include images in your videos (PNG, JPG, GIF)
- **Export Options**: Export to MP4, WebM, or AVI with quality settings

### Advanced Features
- **Timeline Zoom**: Zoom in/out for precise editing
- **Clip Properties**: Edit timing, trimming, and other properties
- **Live Export Progress**: Real-time feedback during export
- **Thumbnail Generation**: Automatic thumbnail creation for video files
- **Responsive Design**: Works on various screen sizes

## Installation

### Prerequisites
- CachyOS, Arch Linux, or any Linux distribution
- Node.js (v16 or higher)
- npm
- FFmpeg

### Quick Install (CachyOS/Arch Linux)

1. Clone or download this repository
2. Run the installer script:

```bash
cd LMM
./install.sh
```

The installer will:
- Install Node.js, npm, and FFmpeg (if not already installed)
- Install all Node.js dependencies
- Create a desktop launcher
- Set up the application

### Manual Installation

If you're not on CachyOS/Arch, install dependencies manually:

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install nodejs npm ffmpeg
npm install
```

#### Fedora:
```bash
sudo dnf install nodejs npm ffmpeg
npm install
```

#### Other Distributions:
Install Node.js, npm, and FFmpeg using your package manager, then run:
```bash
npm install
```

## Usage

### Starting the Application

1. **Using the launcher script:**
   ```bash
   ./lmm
   ```

2. **Using npm:**
   ```bash
   npm start
   ```

3. **From application menu:**
   Find "LMM Video Editor" in your application launcher

The application will start a local server and open in your default browser at `http://localhost:3000`

### Creating Your First Video

1. **Add Media**:
   - Click "Add Media" button or drag files into the Media Library
   - Supported formats: MP4, AVI, MKV, MOV, WebM, MP3, WAV, PNG, JPG

2. **Build Timeline**:
   - Drag media from the library to the timeline
   - Video clips go on the video track
   - Audio clips go on the audio track
   - Drag clips to reposition them

3. **Edit Clips**:
   - Click a clip to select it
   - Use the handles on clip edges to trim
   - Adjust properties in the Properties panel
   - Preview your changes with the play button

4. **Export**:
   - Click "Export Video"
   - Choose format and quality
   - Click "Export" to generate your video
   - The video will download automatically

### Keyboard Tips
- **Drag clips**: Click and drag on timeline
- **Trim clips**: Drag the handles on clip edges
- **Zoom timeline**: Use + and - buttons in timeline header

## Architecture

### Backend (`backend/server.js`)
- **Express.js**: Web server and API endpoints
- **Multer**: File upload handling
- **fluent-ffmpeg**: FFmpeg wrapper for video processing
- **Socket.io**: Real-time progress updates

### Frontend
- **HTML5/CSS3**: Modern, responsive interface
- **Vanilla JavaScript**: No framework overhead
- **Canvas API**: Timeline rendering
- **Drag & Drop API**: Intuitive media management

### File Structure
```
LMM/
├── backend/
│   └── server.js          # Node.js server and API
├── frontend/
│   ├── index.html         # Main application UI
│   ├── style.css          # Styling
│   └── app.js            # Client-side logic
├── public/
│   ├── uploads/          # Uploaded media files
│   └── temp/             # Temporary files and exports
├── package.json          # Dependencies
├── install.sh           # Installer script
├── lmm                  # Launcher script (created by installer)
└── README.md           # This file
```

## API Endpoints

- `POST /api/upload` - Upload media files
- `POST /api/export` - Export video
- `POST /api/trim` - Trim video clip
- `POST /api/media/info` - Get media metadata
- `GET /api/health` - Health check

## Configuration

The application runs on port 3000 by default. To change this:

```bash
PORT=8080 npm start
```

## Troubleshooting

### FFmpeg not found
Make sure FFmpeg is installed and in your PATH:
```bash
ffmpeg -version
```

### Port already in use
Change the port:
```bash
PORT=8080 npm start
```

### Upload fails
Check file size limit (default 500MB) and format support

### Export fails
- Ensure FFmpeg is properly installed
- Check console for error messages
- Verify clips have valid media files

## Development

### Run in development mode with auto-reload:
```bash
npm run dev
```

### Project Structure
The application follows a client-server architecture:
- **Backend**: Handles file uploads, FFmpeg processing, and video export
- **Frontend**: Provides the UI and timeline editor
- **Communication**: RESTful API + WebSocket for real-time updates

## Performance Tips

1. **Use appropriate quality settings**: Higher quality = longer export times
2. **Trim clips before exporting**: Reduces processing time
3. **Close other applications**: FFmpeg can be CPU-intensive
4. **Use compatible formats**: MP4 files process faster than other formats

## Known Limitations

- Maximum file upload size: 500MB (configurable)
- Export format options are currently limited
- Advanced effects and transitions coming in future updates
- Audio mixing capabilities are basic

## Roadmap

- [ ] Video transitions (fade, dissolve, etc.)
- [ ] Text overlays and titles
- [ ] Audio effects and volume control
- [ ] Multiple video tracks
- [ ] Filters and color correction
- [ ] Project save/load functionality
- [ ] Batch export
- [ ] GPU acceleration

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- [Express.js](https://expressjs.com/)
- [FFmpeg](https://ffmpeg.org/)
- [Socket.io](https://socket.io/)
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)

## Support

For issues and questions:
1. Check the Troubleshooting section
2. Review existing issues on GitHub
3. Create a new issue with details about your problem

---

**Made with ❤️ for the Linux community**
