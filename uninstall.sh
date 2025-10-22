#!/bin/bash

# LMM - Lightweight Movie Maker Uninstaller for Linux
# This script removes all LMM Video Editor components
# Supports: CachyOS, Arch Linux, Ubuntu, Debian, Fedora, Raspberry Pi, and other distributions

echo "================================"
echo "LMM Video Editor Uninstaller"
echo "Linux Edition"
echo "================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "Please do not run this script as root"
    exit 1
fi

# Check if in LMM directory
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found!"
    echo "Please run this script from the LMM directory."
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

echo "This will remove LMM Video Editor from your system."
echo ""
read -p "Are you sure you want to uninstall? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Uninstallation cancelled."
    exit 0
fi

echo ""
echo "Step 1: Removing Node.js dependencies..."
echo ""

if [ -d "node_modules" ]; then
    echo "Removing node_modules folder..."
    rm -rf node_modules
    if [ $? -eq 0 ]; then
        echo "[OK] node_modules removed"
    else
        echo "WARNING: Could not fully remove node_modules"
        echo "You may need to delete it manually with: rm -rf node_modules"
    fi
else
    echo "[SKIP] node_modules not found"
fi

if [ -f "package-lock.json" ]; then
    echo "Removing package-lock.json..."
    rm -f package-lock.json
    echo "[OK] package-lock.json removed"
fi

echo ""
echo "Step 2: Removing desktop entry..."
echo ""

DESKTOP_FILE="$HOME/.local/share/applications/lmm-video-editor.desktop"
if [ -f "$DESKTOP_FILE" ]; then
    rm -f "$DESKTOP_FILE"
    echo "[OK] Desktop entry removed"
else
    echo "[SKIP] Desktop entry not found"
fi

echo ""
echo "Step 3: Removing launcher script..."
echo ""

INSTALL_DIR=$(pwd)
if [ -f "$INSTALL_DIR/lmm" ]; then
    rm -f "$INSTALL_DIR/lmm"
    echo "[OK] Launcher script removed"
else
    echo "[SKIP] Launcher script not found"
fi

# Check if lmm is in PATH and offer to remove
if grep -q "$INSTALL_DIR" "$HOME/.bashrc" 2>/dev/null; then
    echo ""
    echo "Found LMM in .bashrc PATH"
    read -p "Remove LMM from PATH in .bashrc? (y/n): " REMOVE_PATH
    if [ "$REMOVE_PATH" = "y" ] || [ "$REMOVE_PATH" = "Y" ]; then
        # Create backup
        cp "$HOME/.bashrc" "$HOME/.bashrc.backup.$(date +%s)"
        # Remove the PATH line
        sed -i "\|$INSTALL_DIR|d" "$HOME/.bashrc"
        echo "[OK] Removed from .bashrc (backup created)"
    fi
fi

echo ""
echo "Step 4: Cleaning up temporary files..."
echo ""

if [ -d "uploads" ]; then
    read -p "Remove uploads folder? (y/n): " CLEAN_UPLOADS
    if [ "$CLEAN_UPLOADS" = "y" ] || [ "$CLEAN_UPLOADS" = "Y" ]; then
        rm -rf uploads
        echo "[OK] uploads folder removed"
    fi
fi

if [ -d "exports" ]; then
    read -p "Remove exports folder? (y/n): " CLEAN_EXPORTS
    if [ "$CLEAN_EXPORTS" = "y" ] || [ "$CLEAN_EXPORTS" = "Y" ]; then
        rm -rf exports
        echo "[OK] exports folder removed"
    fi
fi

echo ""
echo "================================"
echo "System Dependencies (Optional)"
echo "================================"
echo ""
echo "LMM has been uninstalled, but the following system dependencies"
echo "are still installed and may be used by other applications:"
echo ""
echo "- Node.js"
echo "- npm"
echo "- FFmpeg"
echo ""

read -p "Do you want to remove Node.js and FFmpeg? (y/n): " REMOVE_DEPS
if [ "$REMOVE_DEPS" = "y" ] || [ "$REMOVE_DEPS" = "Y" ]; then
    echo ""
    echo "Removing system dependencies..."
    echo "You may be asked for your sudo password."
    echo ""

    # Function to uninstall on Arch-based systems
    uninstall_arch() {
        sudo pacman -Rns --noconfirm nodejs npm ffmpeg 2>/dev/null || \
        sudo pacman -Rs --noconfirm nodejs npm ffmpeg
    }

    # Function to uninstall on Debian-based systems
    uninstall_debian() {
        sudo apt remove -y nodejs npm ffmpeg
        sudo apt autoremove -y
    }

    # Function to uninstall on Fedora-based systems
    uninstall_fedora() {
        sudo dnf remove -y nodejs npm ffmpeg
        sudo dnf autoremove -y
    }

    # Uninstall based on detected distribution
    case $DISTRO in
        arch|cachyos|manjaro|endeavouros)
            uninstall_arch
            ;;
        ubuntu|debian|linuxmint|pop|raspbian)
            uninstall_debian
            ;;
        fedora|rhel|centos)
            uninstall_fedora
            ;;
        *)
            # Try to detect package manager
            if command -v pacman &> /dev/null; then
                uninstall_arch
            elif command -v apt &> /dev/null; then
                uninstall_debian
            elif command -v dnf &> /dev/null; then
                uninstall_fedora
            else
                echo "Could not detect package manager"
                echo "Please uninstall Node.js and FFmpeg manually using your package manager"
            fi
            ;;
    esac

    if [ $? -eq 0 ]; then
        echo "[OK] System dependencies removed"
    else
        echo "WARNING: Some dependencies may not have been removed"
    fi
else
    echo "System dependencies will remain installed."
fi

echo ""
echo "================================"
echo "Uninstallation Complete!"
echo "================================"
echo ""
echo "LMM Video Editor has been removed from your system."
echo ""
echo "You can delete this entire directory if you no longer need the source code:"
echo "  cd .."
echo "  rm -rf $(basename $INSTALL_DIR)"
echo ""
echo "To reinstall LMM Video Editor, run: ./install.sh"
echo ""
