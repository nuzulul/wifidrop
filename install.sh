#!/usr/bin/env bash

OS=$(uname)

if [[ "$1" == "--debug" ]]; then
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

if [ -n "$XDG_CACHE_HOME" ]; then
	CACHE_DIR="$XDG_CACHE_HOME/narojilstudio/wifidrop/launcher"
else
	CACHE_DIR="$HOME/.cache/narojilstudio/wifidrop/launcher"
fi

if [[ "$1" == "--uninstall" ]]; then
	rm -rf "$CACHE_DIR"
	rm -rf "$HOME/.local/share/applications/wifidrop.desktop"
	rm -rf "$HOME/.local/bin/wifidrop"
	echo "WIFIDrop has been uninstalled successfully!"
	exit 1
fi

if [ ! -d "$CACHE_DIR" ]; then
  mkdir "$CACHE_DIR"
  echo "Directory '$CACHE_DIRR' created."
else
  echo "Directory '$CACHE_DIR' already exists."
  rm -rf "$CACHE_DIR"
  mkdir "$CACHE_DIR"
fi

if [[ "$1" == "/n" ]]; then
	echo "Skip PATH Install"
else
	# symbolic link
	mkdir -p "$HOME/.local/bin"
	ln -s "$CACHE_DIR/wifidrop/tools/launcher/wifidrop.sh" "$HOME/.local/bin/wifidrop"
fi

# the project
cd $CACHE_DIR
git clone https://github.com/nuzulul/wifidrop.git

# desktop
mkdir -p "$HOME/.local/share/applications"
cp -f "$CACHE_DIR/wifidrop/tools/launcher/wifidrop.desktop" "$HOME/.local/share/applications"

# permissions
chmod -R 777 "$CACHE_DIR/wifidrop"

# message
echo "Loading WIFIDrop ..."

"$CACHE_DIR/wifidrop/tools/launcher/wifidrop.sh" $1

