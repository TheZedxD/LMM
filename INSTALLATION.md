# LMM Video Editor - Detailed Installation Guide

This guide provides comprehensive installation instructions for all supported platforms.

## Table of Contents
- [Windows Installation](#windows-installation)
- [Linux Installation](#linux-installation)
  - [CachyOS / Arch Linux](#cachyos--arch-linux)
  - [Ubuntu / Debian](#ubuntu--debian)
  - [Fedora](#fedora)
- [Raspberry Pi Installation](#raspberry-pi-installation)
- [Verifying Installation](#verifying-installation)
- [Troubleshooting](#troubleshooting)

---

## Windows Installation

### Automatic Installation (Recommended)

1. **Download the LMM repository**
   - Clone using Git: `git clone <repository-url>`
   - Or download as ZIP and extract

2. **Run the installer**
   - Open PowerShell or Command Prompt **as Administrator**
   - Navigate to the LMM directory:
     ```batch
     cd path\to\LMM
     ```
   - Run the installer:
     ```batch
     install.bat
     ```

3. **What the installer does:**
   - Detects available package manager (winget or Chocolatey)
   - Installs Node.js LTS (if not already installed)
   - Installs FFmpeg (if not already installed)
   - Installs all Node.js dependencies
   - Creates a desktop shortcut
   - Creates launcher scripts

4. **After installation:**
   - You may need to restart your terminal or computer for PATH changes to take effect
   - Look for "LMM Video Editor" shortcut on your desktop
   - Double-click to launch

### Manual Installation (Windows)

If the automatic installer doesn't work:

1. **Install Node.js:**
   - Download from [nodejs.org](https://nodejs.org/)
   - Choose the LTS (Long Term Support) version
   - Run the installer with default options
   - Verify installation: `node --version`

2. **Install FFmpeg:**

   **Method 1: Using winget (Windows 11 / Windows 10 with App Installer)**
   ```batch
   winget install Gyan.FFmpeg
   ```

   **Method 2: Using Chocolatey**
   ```batch
   choco install ffmpeg
   ```

   **Method 3: Manual Installation**
   - Download from [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/)
   - Choose "ffmpeg-release-essentials.zip"
   - Extract to `C:\ffmpeg`
   - Add `C:\ffmpeg\bin` to your system PATH:
     1. Open System Properties → Advanced → Environment Variables
     2. Under System Variables, find and edit "Path"
     3. Add new entry: `C:\ffmpeg\bin`
     4. Click OK and restart your terminal

3. **Install Node.js dependencies:**
   ```batch
   cd path\to\LMM
   npm install
   ```

4. **Create launcher (optional):**
   - Create a batch file `start-lmm.bat` on your desktop
   - Add the following content:
     ```batch
     @echo off
     cd C:\path\to\LMM
     start http://localhost:3000
     npm start
     ```

### Verifying Windows Installation

```batch
node --version
npm --version
ffmpeg -version
```

All commands should display version information.

---

## Linux Installation

### CachyOS / Arch Linux

#### Automatic Installation (Recommended)

```bash
cd LMM
chmod +x install.sh
./install.sh
```

The installer will:
- Install Node.js, npm, and FFmpeg using pacman
- Install all Node.js dependencies
- Create a desktop launcher
- Create the `lmm` launcher script

#### Manual Installation

```bash
# Install dependencies
sudo pacman -Sy
sudo pacman -S --needed nodejs npm ffmpeg

# Install Node.js packages
cd LMM
npm install

# Create launcher script
chmod +x lmm
```

### Ubuntu / Debian

#### Automatic Installation (Recommended)

```bash
cd LMM
chmod +x install.sh
./install.sh
```

The installer automatically detects Ubuntu/Debian and uses apt.

#### Manual Installation

```bash
# Update package database
sudo apt update

# Install dependencies
sudo apt install nodejs npm ffmpeg

# For newer Node.js version (recommended):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Node.js packages
cd LMM
npm install

# Create launcher script
chmod +x lmm
```

### Fedora

#### Automatic Installation (Recommended)

```bash
cd LMM
chmod +x install.sh
./install.sh
```

The installer automatically detects Fedora and uses dnf.

#### Manual Installation

```bash
# Install Node.js and npm
sudo dnf install nodejs npm

# Install FFmpeg (requires RPM Fusion)
sudo dnf install https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm
sudo dnf install ffmpeg

# Install Node.js packages
cd LMM
npm install

# Create launcher script
chmod +x lmm
```

### Universal Linux Installer

For any Linux distribution, you can use the platform detection installer:

```bash
cd LMM
chmod +x install_platform.sh
./install_platform.sh
```

This script automatically detects your distribution and runs the appropriate installer.

---

## Raspberry Pi Installation

### Prerequisites
- Raspberry Pi 3 or newer (Raspberry Pi 4 with 4GB+ RAM recommended)
- Raspberry Pi OS (32-bit or 64-bit)
- Active internet connection

### Automatic Installation (Recommended)

```bash
cd LMM
chmod +x install-rpi.sh
./install-rpi.sh
```

The installer will:
- Detect your Raspberry Pi model
- Install Node.js LTS from NodeSource repository
- Install FFmpeg optimized for ARM architecture
- Install all Node.js dependencies
- Create a desktop launcher
- Provide performance tips

**Note:** Installation may take 10-15 minutes on Raspberry Pi due to package compilation.

### Manual Installation

```bash
# Update package database
sudo apt update

# Install prerequisites
sudo apt install -y curl

# Add NodeSource repository for Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and FFmpeg
sudo apt install -y nodejs ffmpeg

# Verify installations
node --version  # Should be v20.x or higher
npm --version
ffmpeg -version

# Install Node.js packages (this may take a while)
cd LMM
npm install

# Create launcher script
chmod +x lmm
```

### Raspberry Pi Performance Tips

1. **Hardware Requirements:**
   - Minimum: Raspberry Pi 3 with 1GB RAM
   - Recommended: Raspberry Pi 4 with 4GB+ RAM
   - Use a good quality power supply (5V 3A minimum for Pi 4)

2. **Optimize Performance:**
   - Close other applications during video processing
   - Use lower resolution exports (720p recommended)
   - Export videos at lower quality settings
   - Ensure adequate cooling (heatsinks or active cooling)
   - Consider overclocking (with proper cooling)

3. **Storage Recommendations:**
   - Use SSD via USB 3.0 for better I/O performance
   - Ensure adequate free space for temporary files
   - Class 10 SD card minimum if using SD card storage

---

## Verifying Installation

After installation on any platform, verify everything is working:

### 1. Check Dependencies

**Windows:**
```batch
node --version
npm --version
ffmpeg -version
```

**Linux/Raspberry Pi:**
```bash
node --version
npm --version
ffmpeg -version
```

All commands should display version information without errors.

### 2. Check Node Modules

```bash
cd LMM
ls node_modules
```

You should see a populated `node_modules` directory with many packages.

### 3. Test the Server

**Windows:**
```batch
npm start
```

**Linux/Raspberry Pi:**
```bash
npm start
```

You should see output like:
```
LMM Video Editor running on http://localhost:3000
Press Ctrl+C to stop
```

Open your browser and navigate to `http://localhost:3000` - you should see the LMM Video Editor interface.

---

## Troubleshooting

### Common Issues

#### "Node not found" or "npm not found"

**Cause:** Node.js is not in your PATH

**Solution:**
- **Windows:** Restart your terminal or computer after installing Node.js
- **Linux:** Run `source ~/.bashrc` or restart your terminal
- Verify installation path is in your PATH environment variable

#### "FFmpeg not found"

**Cause:** FFmpeg is not installed or not in your PATH

**Solution:**
- **Windows:**
  - Check if FFmpeg is installed: `where ffmpeg`
  - Add FFmpeg bin folder to PATH if needed
  - Restart terminal after changing PATH
- **Linux:**
  - Install FFmpeg using your package manager
  - Check installation: `which ffmpeg`

#### "Permission denied" errors

**Linux/Raspberry Pi:**
```bash
chmod +x install.sh
chmod +x install-rpi.sh
chmod +x install_platform.sh
chmod +x lmm
```

**Windows:**
- Run Command Prompt or PowerShell as Administrator

#### "EACCES" or permission errors during npm install

**Solution:**
```bash
# Linux/Raspberry Pi
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER node_modules

# Then retry
npm install
```

#### Port 3000 already in use

**Solution:**
```bash
# Use a different port
PORT=8080 npm start
```

#### Installation hangs or is very slow (Raspberry Pi)

**Cause:** Compiling native modules on ARM architecture

**Solution:**
- Be patient, this is normal
- Ensure stable internet connection
- Consider installing overnight if very slow
- Try installing on Raspberry Pi 4 for faster installation

#### Module compilation errors on Raspberry Pi

**Solution:**
```bash
# Install build tools
sudo apt install -y build-essential python3

# Retry npm install
npm install
```

### Getting Help

If you encounter issues not covered here:

1. Check the main [README.md](README.md) troubleshooting section
2. Review error messages carefully
3. Search for similar issues online
4. Create an issue on the GitHub repository with:
   - Your operating system and version
   - Node.js and npm versions
   - Complete error message
   - Steps you've already tried

---

## Uninstallation

### Windows

1. Delete the LMM folder
2. Remove desktop shortcut
3. (Optional) Uninstall Node.js and FFmpeg if not needed for other applications

### Linux / Raspberry Pi

1. Remove the LMM folder:
   ```bash
   rm -rf ~/LMM  # or wherever you installed it
   ```

2. Remove desktop launcher:
   ```bash
   rm ~/.local/share/applications/lmm-video-editor.desktop
   ```

3. (Optional) Uninstall dependencies if not needed:
   ```bash
   # Arch-based
   sudo pacman -Rs nodejs npm ffmpeg

   # Debian-based
   sudo apt remove nodejs npm ffmpeg
   ```

---

## Next Steps

After successful installation:

1. Read the [README.md](README.md) for usage instructions
2. Review [FEATURES.md](FEATURES.md) for feature details
3. Check [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md) for shortcuts
4. Start creating videos!

---

**Happy Video Editing!**
