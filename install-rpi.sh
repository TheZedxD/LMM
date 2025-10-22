#!/bin/bash

# LMM - Lightweight Movie Maker Installer for Raspberry Pi
# This script installs all dependencies and sets up the application
# Supports Raspberry Pi OS (Debian-based)

set -e

echo "================================"
echo "LMM Video Editor Installer"
echo "Raspberry Pi Edition"
echo "================================"
echo ""

# Check if running on Raspberry Pi or Debian-based system
if ! command -v apt &> /dev/null; then
    echo "Error: This installer is designed for Raspberry Pi OS (Debian-based)"
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

# Detect Raspberry Pi model
if [ -f /proc/device-tree/model ]; then
    RPI_MODEL=$(cat /proc/device-tree/model)
    echo "Detected: $RPI_MODEL"
    echo ""
fi

echo "Step 1: Updating package database..."
echo "You may be asked for your sudo password."
echo ""

# Update package database
sudo apt update

echo ""
echo "Step 2: Installing system dependencies..."
echo ""

# Install Node.js and npm
if ! command -v node &> /dev/null; then
    echo "Installing Node.js and npm..."

    # For Raspberry Pi, we'll use NodeSource repository for latest LTS
    echo "Adding NodeSource repository for Node.js LTS..."

    # Install prerequisites
    sudo apt install -y curl

    # Add NodeSource repository (Node.js 20.x LTS)
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

    # Install Node.js
    sudo apt install -y nodejs

    echo "Node.js installed: $(node --version)"
    echo "npm installed: $(npm --version)"
else
    NODE_VERSION=$(node --version)
    echo "Node.js already installed: $NODE_VERSION"

    # Check if version is adequate (v16 or higher)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 16 ]; then
        echo "WARNING: Node.js version is too old (need v16+)"
        echo "Upgrading Node.js..."

        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs

        echo "Node.js upgraded to: $(node --version)"
    fi
fi

# Install FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing FFmpeg..."
    sudo apt install -y ffmpeg
    echo "FFmpeg installed: $(ffmpeg -version | head -n1)"
else
    echo "FFmpeg already installed: $(ffmpeg -version | head -n1)"
fi

echo ""
echo "Step 3: Checking Node.js dependencies..."
echo ""

# Check if node_modules exists and has the main dependencies
NEED_INSTALL=1
if [ -d "node_modules" ]; then
    echo "Checking existing node_modules..."
    if [ -d "node_modules/express" ] && [ -d "node_modules/multer" ] && [ -d "node_modules/fluent-ffmpeg" ]; then
        echo "[OK] Dependencies appear to be already installed."
        echo "Skipping npm install..."
        NEED_INSTALL=0
    fi
fi

if [ $NEED_INSTALL -eq 1 ]; then
    echo "Installing Node.js dependencies..."
    echo "This may take a while on Raspberry Pi (15-30 minutes)..."
    npm install

    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to install Node.js dependencies"
        echo ""
        echo "This might be due to:"
        echo "  - Network issues"
        echo "  - Insufficient memory (try closing other applications)"
        echo "  - Missing build tools"
        echo ""
        echo "Try running: npm cache clean --force"
        echo "Then run this installer again."
        exit 1
    fi
    echo "[OK] Dependencies installed successfully!"
else
    echo "To reinstall dependencies, delete the node_modules folder first."
fi

echo ""
echo "Step 4: Creating desktop entry (optional)..."
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
echo "Step 5: Creating launcher script..."
echo ""

# Create a launcher script
cat > "$INSTALL_DIR/lmm" << 'EOF'
#!/bin/bash

# LMM Launcher Script for Raspberry Pi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting LMM Video Editor..."
echo "The application will open in your default browser."
echo ""

# Start the server
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v chromium-browser &> /dev/null; then
    chromium-browser http://localhost:3000
elif command -v firefox &> /dev/null; then
    firefox http://localhost:3000
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
echo "RASPBERRY PI PERFORMANCE NOTES:"
echo "- Video processing is CPU-intensive"
echo "- Raspberry Pi 4 (4GB+) recommended for best performance"
echo "- Consider using lower quality settings for faster exports"
echo "- Hardware acceleration may be limited"
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
echo "To uninstall LMM Video Editor, run: ./uninstall.sh"
echo ""
