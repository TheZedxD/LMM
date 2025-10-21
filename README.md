# LMM - Lightweight Movie Maker

A modern, cross-platform web-based video editor built with Node.js and FFmpeg. LMM provides an intuitive interface similar to Clipchamp, designed for users who want a simple yet powerful video editing solution.

**Supported Platforms:**
- Windows 10/11
- CachyOS and other Arch-based Linux distributions
- Ubuntu, Debian, and other Debian-based distributions
- Raspberry Pi (Raspberry Pi OS)

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
All platforms require:
- Node.js (v16 or higher)
- npm (usually comes with Node.js)
- FFmpeg

### Quick Install

#### Windows

1. Download or clone this repository
2. Open PowerShell or Command Prompt as Administrator
3. Navigate to the LMM directory and run:

```batch
install.bat
```

The installer will:
- Detect and use winget or Chocolatey package manager
- Install Node.js and FFmpeg (if not already installed)
- Install all Node.js dependencies
- Create a desktop shortcut
- Set up the application

**Note:** If you don't have a package manager, the installer will provide manual installation instructions.

#### Linux (CachyOS, Arch, Ubuntu, Debian, Fedora)

1. Clone or download this repository
2. Navigate to the LMM directory and run:

```bash
cd LMM
chmod +x install.sh
./install.sh
```

Or use the universal installer that auto-detects your distribution:

```bash
chmod +x install_platform.sh
./install_platform.sh
```

The installer will:
- Detect your Linux distribution automatically
- Install Node.js, npm, and FFmpeg (if not already installed)
- Install all Node.js dependencies
- Create a desktop launcher
- Set up the application

#### Raspberry Pi

For Raspberry Pi, use the dedicated installer optimized for ARM architecture:

```bash
cd LMM
chmod +x install-rpi.sh
./install-rpi.sh
```

The installer will:
- Install Node.js LTS from NodeSource repository
- Install FFmpeg
- Install all Node.js dependencies
- Create a desktop launcher
- Provide performance tips for Raspberry Pi

**Raspberry Pi Requirements:**
- Raspberry Pi 3 or newer (Raspberry Pi 4 with 4GB+ RAM recommended)
- Raspberry Pi OS (32-bit or 64-bit)

### Manual Installation

If the automatic installers don't work, install dependencies manually:

#### Windows (Manual):
1. Install [Node.js LTS](https://nodejs.org/) (includes npm)
2. Install [FFmpeg](https://www.gyan.dev/ffmpeg/builds/) and add to PATH
3. Run `npm install` in the LMM directory

#### Ubuntu/Debian (Manual):
```bash
sudo apt update
sudo apt install nodejs npm ffmpeg
npm install
```

#### Fedora (Manual):
```bash
sudo dnf install nodejs npm
sudo dnf install https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm
sudo dnf install ffmpeg
npm install
```

#### macOS (Manual):
```bash
brew install node ffmpeg
npm install
```

## Usage

### Starting the Application

#### Windows

1. **Double-click the desktop shortcut** "LMM Video Editor"

2. **Using the launcher:**
   ```batch
   run_server.bat
   ```

3. **Using npm:**
   ```batch
   npm start
   ```

#### Linux / Raspberry Pi

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

### Windows-Specific Issues

**FFmpeg not found:**
1. Check if FFmpeg is installed: `ffmpeg -version`
2. If not in PATH, add FFmpeg bin folder to system PATH
3. Restart terminal/command prompt after adding to PATH

**Port already in use:**
```batch
set PORT=8080
npm start
```

**Permission errors:**
- Run Command Prompt or PowerShell as Administrator for installation

### Linux-Specific Issues

**FFmpeg not found:**
Make sure FFmpeg is installed and in your PATH:
```bash
ffmpeg -version
```

**Port already in use:**
Change the port:
```bash
PORT=8080 npm start
```

**Permission errors:**
- Ensure you're not running as root
- Check that the installer scripts have execute permissions (`chmod +x`)

### Raspberry Pi-Specific Issues

**Performance issues:**
- Use Raspberry Pi 4 with 4GB+ RAM for best performance
- Export videos at lower quality settings (720p instead of 1080p)
- Close other applications during video processing
- Consider overclocking (with proper cooling)

**Out of memory errors:**
- Reduce video quality settings
- Work with shorter clips
- Increase swap file size

### General Issues

**Upload fails:**
- Check file size limit (default 500MB) and format support
- Ensure uploads directory has write permissions

**Export fails:**
- Ensure FFmpeg is properly installed
- Check console for error messages
- Verify clips have valid media files
- Check available disk space in temp directory

**Browser compatibility:**
- Use modern browsers (Chrome, Firefox, Edge)
- Enable JavaScript
- Clear browser cache if issues persist

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

### All Platforms
1. **Use appropriate quality settings**: Higher quality = longer export times
2. **Trim clips before exporting**: Reduces processing time
3. **Close other applications**: FFmpeg can be CPU-intensive
4. **Use compatible formats**: MP4 files process faster than other formats

### Windows
- Disable Windows Defender real-time scanning for the temp folder during exports
- Use SSD storage for better I/O performance
- Consider upgrading to Windows 11 for better performance

### Raspberry Pi
- Use Raspberry Pi 4 with at least 4GB RAM
- Enable hardware acceleration if available
- Use lower resolution exports (720p recommended)
- Export during off-peak usage times
- Ensure adequate cooling to prevent thermal throttling

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

**Made with ❤️ for video creators on Windows, Linux, and Raspberry Pi**
