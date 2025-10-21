#!/bin/bash

# LMM - Lightweight Movie Maker Universal Platform Installer
# This script detects your platform and runs the appropriate installer

echo "================================"
echo "LMM Video Editor"
echo "Universal Platform Installer"
echo "================================"
echo ""

# Detect platform
PLATFORM="unknown"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Check if it's Raspberry Pi
    if [ -f /proc/device-tree/model ]; then
        if grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
            PLATFORM="raspberry-pi"
        fi
    fi

    # If not Raspberry Pi, check distribution
    if [ "$PLATFORM" == "unknown" ] && [ -f /etc/os-release ]; then
        . /etc/os-release
        case $ID in
            arch|cachyos|manjaro|endeavouros)
                PLATFORM="arch-linux"
                ;;
            ubuntu|debian|linuxmint|pop)
                PLATFORM="debian-linux"
                ;;
            fedora|rhel|centos)
                PLATFORM="fedora-linux"
                ;;
            *)
                PLATFORM="linux"
                ;;
        esac
    fi

    # Fallback: generic Linux
    if [ "$PLATFORM" == "unknown" ]; then
        PLATFORM="linux"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
else
    PLATFORM="unknown"
fi

echo "Detected platform: $PLATFORM"
echo ""

# Run appropriate installer
case $PLATFORM in
    raspberry-pi)
        echo "Running Raspberry Pi installer..."
        echo ""
        if [ -f ./install-rpi.sh ]; then
            chmod +x ./install-rpi.sh
            ./install-rpi.sh
        else
            echo "Error: install-rpi.sh not found"
            exit 1
        fi
        ;;
    arch-linux|debian-linux|fedora-linux|linux)
        echo "Running Linux installer..."
        echo ""
        if [ -f ./install.sh ]; then
            chmod +x ./install.sh
            ./install.sh
        else
            echo "Error: install.sh not found"
            exit 1
        fi
        ;;
    macos)
        echo "macOS detected."
        echo "Please install dependencies manually using Homebrew:"
        echo ""
        echo "  brew install node ffmpeg"
        echo "  npm install"
        echo ""
        echo "Then run: npm start"
        exit 1
        ;;
    *)
        echo "Error: Unsupported platform"
        echo ""
        echo "For Windows, please run: install.bat"
        echo "For Linux, please run: ./install.sh"
        echo "For Raspberry Pi, please run: ./install-rpi.sh"
        exit 1
        ;;
esac
