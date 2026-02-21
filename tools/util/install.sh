#!/usr/bin/env bash

set -euo pipefail

OS=$(uname)
ARG1="${1:-}"

if [[ "$ARG1" == "--debug" ]]; then
	version=$(<wifidrop.txt)
	echo "Version : WIFIDrop BASH Installer $version"
fi

if [[ "$OS" == "Linux" ]]; then
	echo "Platform Linux"
else
	echo "Platform not supported yet"
	echo "Open : https://wifidrop.js.org"
	exit 1
fi

if command -v git &> /dev/null; then
    # echo "Git is installed."
    git --version
else
    echo "Git is not installed."
    echo "Open : https://wifidrop.js.org"
	exit 1
fi

if [ -n "${XDG_CACHE_HOME:-}" ]; then
	CACHE_DIR="$XDG_CACHE_HOME/narojilstudio/wifidrop/launcher"
else
	CACHE_DIR="$HOME/.cache/narojilstudio/wifidrop/launcher"
fi
PROJECT_DIR="$CACHE_DIR/wifidrop"
LAUNCHER_SCRIPT="$PROJECT_DIR/tools/launcher/wifidrop.sh"
DESKTOP_FILE="$PROJECT_DIR/tools/launcher/wifidrop.desktop"

if [[ "$ARG1" == "--uninstall" ]]; then
	rm -rf "$CACHE_DIR"
	rm -rf "$HOME/.local/share/applications/wifidrop.desktop"
	rm -rf "$HOME/.local/bin/wifidrop"
	echo "WIFIDrop has been uninstalled successfully!"
	exit 0
fi

if [ -d "$CACHE_DIR" ]; then
	  echo "Directory '$CACHE_DIR' already exists."
	  rm -rf "$CACHE_DIR"
fi

mkdir -p "$CACHE_DIR"
echo "Directory '$CACHE_DIR' created."

if [ ! -d "$CACHE_DIR" ]; then
	echo "Failed to create cache directory: $CACHE_DIR"
	exit 1
fi

# the project
cd "$CACHE_DIR"
git clone https://github.com/nuzulul/wifidrop.git "$PROJECT_DIR"

if [ ! -f "$LAUNCHER_SCRIPT" ]; then
	echo "Launcher script not found: $LAUNCHER_SCRIPT"
	exit 1
fi

if [ ! -f "$DESKTOP_FILE" ]; then
	echo "Desktop file not found: $DESKTOP_FILE"
	exit 1
fi

if [[ "$ARG1" == "/n" ]]; then
	echo "Skip PATH Install"
else
	# symbolic link
	mkdir -p "$HOME/.local/bin"
	ln -sfn "$LAUNCHER_SCRIPT" "$HOME/.local/bin/wifidrop"
fi

# desktop
mkdir -p "$HOME/.local/share/applications"
cp -f "$DESKTOP_FILE" "$HOME/.local/share/applications"

# permissions
chmod -R 777 "$PROJECT_DIR"

# message
echo "Loading WIFIDrop ..."

"$LAUNCHER_SCRIPT" "$@"
