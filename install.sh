#!/bin/bash

# LMM - Lightweight Movie Maker Installer for Linux
# This script installs all dependencies and sets up the application
# Supports: CachyOS, Arch Linux, Ubuntu, Debian, Fedora, and other distributions

set -e

echo "================================"
echo "LMM Video Editor Installer"
echo "Linux Edition"
echo "================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "Please do not run this script as root"
    exit 1
fi

# Detect Linux distribution
DISTRO="unknown"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
fi

echo "Detected distribution: $DISTRO"
echo ""

# Function to install on Arch-based systems (CachyOS, Arch, Manjaro, etc.)
install_arch() {
    echo "Installing for Arch-based system..."
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
}

# Function to install on Debian-based systems (Ubuntu, Debian, etc.)
install_debian() {
    echo "Installing for Debian-based system..."
    echo ""

    # Update package database
    sudo apt update

    # Install Node.js and npm
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js and npm..."
        sudo apt install -y nodejs npm
    else
        echo "Node.js already installed: $(node --version)"
    fi

    # Install FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        echo "Installing FFmpeg..."
        sudo apt install -y ffmpeg
    else
        echo "FFmpeg already installed: $(ffmpeg -version | head -n1)"
    fi
}

# Function to install on Fedora-based systems
install_fedora() {
    echo "Installing for Fedora-based system..."
    echo ""

    # Install Node.js and npm
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js and npm..."
        sudo dnf install -y nodejs npm
    else
        echo "Node.js already installed: $(node --version)"
    fi

    # Install FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        echo "Installing FFmpeg..."
        # Enable RPM Fusion for FFmpeg
        sudo dnf install -y https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm 2>/dev/null || true
        sudo dnf install -y ffmpeg
    else
        echo "FFmpeg already installed: $(ffmpeg -version | head -n1)"
    fi
}

echo "Step 1: Installing system dependencies..."
echo "You may be asked for your sudo password."
echo ""

# Install based on detected distribution
case $DISTRO in
    arch|cachyos|manjaro|endeavouros)
        install_arch
        ;;
    ubuntu|debian|linuxmint|pop)
        install_debian
        ;;
    fedora|rhel|centos)
        install_fedora
        ;;
    *)
        echo "Distribution not automatically detected."
        echo ""

        # Try to detect package manager
        if command -v pacman &> /dev/null; then
            echo "Found pacman, assuming Arch-based system..."
            install_arch
        elif command -v apt &> /dev/null; then
            echo "Found apt, assuming Debian-based system..."
            install_debian
        elif command -v dnf &> /dev/null; then
            echo "Found dnf, assuming Fedora-based system..."
            install_fedora
        else
            echo "Error: Could not detect package manager"
            echo "Please install dependencies manually:"
            echo "  - Node.js (v16 or higher)"
            echo "  - npm"
            echo "  - FFmpeg"
            exit 1
        fi
        ;;
esac

echo ""
echo "Step 2: Checking Node.js dependencies..."
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
    echo "This may take a few minutes..."
    npm install

    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to install Node.js dependencies"
        echo ""
        echo "This might be due to:"
        echo "  - Network issues"
        echo "  - Permission problems"
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
echo "To uninstall LMM Video Editor, run: ./uninstall.sh"
echo ""
