#!/bin/bash

# LMM - Lightweight Movie Maker Installer for CachyOS/Arch Linux
# This script installs all dependencies and sets up the application

set -e

echo "================================"
echo "LMM Video Editor Installer"
echo "================================"
echo ""

# Check if running on Arch-based system
if ! command -v pacman &> /dev/null; then
    echo "Error: This installer is designed for CachyOS/Arch Linux"
    echo "Please install dependencies manually:"
    echo "  - Node.js (v16 or higher)"
    echo "  - npm"
    echo "  - FFmpeg"
    exit 1
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "Please do not run this script as root"
    exit 1
fi

echo "Step 1: Installing system dependencies..."
echo "You may be asked for your sudo password."
echo ""

# Update package database
sudo pacman -Sy

# Install Node.js and npm
if ! command -v node &> /dev/null; then
    echo "Installing Node.js and npm..."
    sudo pacman -S --needed --noconfirm nodejs npm
else
    echo "Node.js already installed: $(node --version)"
fi

# Install FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing FFmpeg..."
    sudo pacman -S --needed --noconfirm ffmpeg
else
    echo "FFmpeg already installed: $(ffmpeg -version | head -n1)"
fi

echo ""
echo "Step 2: Installing Node.js dependencies..."
echo ""

# Install npm packages
npm install

echo ""
echo "Step 3: Creating desktop entry (optional)..."
echo ""

# Get the current directory
INSTALL_DIR=$(pwd)

# Create desktop entry
DESKTOP_FILE="$HOME/.local/share/applications/lmm-video-editor.desktop"
mkdir -p "$HOME/.local/share/applications"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=LMM Video Editor
Comment=Lightweight Movie Maker - Web-based video editor
Exec=bash -c "cd $INSTALL_DIR && npm start"
Icon=multimedia-video-player
Terminal=false
Categories=AudioVideo;Video;AudioVideoEditing;
Keywords=video;editor;movie;maker;
EOF

chmod +x "$DESKTOP_FILE"

echo "Desktop entry created at: $DESKTOP_FILE"

echo ""
echo "Step 4: Creating launcher script..."
echo ""

# Create a launcher script
cat > "$INSTALL_DIR/lmm" << 'EOF'
#!/bin/bash

# LMM Launcher Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting LMM Video Editor..."
echo "The application will open in your default browser."
echo ""

# Start the server
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v firefox &> /dev/null; then
    firefox http://localhost:3000
elif command -v chromium &> /dev/null; then
    chromium http://localhost:3000
else
    echo "Please open http://localhost:3000 in your browser"
fi

# Wait for user to press Ctrl+C
echo ""
echo "Press Ctrl+C to stop the server"
wait $SERVER_PID
EOF

chmod +x "$INSTALL_DIR/lmm"

echo "Launcher script created: $INSTALL_DIR/lmm"

echo ""
echo "================================"
echo "Installation Complete!"
echo "================================"
echo ""
echo "You can start LMM Video Editor in several ways:"
echo ""
echo "1. Run from this directory:"
echo "   ./lmm"
echo ""
echo "2. Run with npm:"
echo "   npm start"
echo ""
echo "3. Add to PATH (optional):"
echo "   echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.bashrc"
echo "   source ~/.bashrc"
echo "   Then run: lmm"
echo ""
echo "4. Use the desktop launcher from your application menu"
echo ""
echo "The application will be available at: http://localhost:3000"
echo ""
