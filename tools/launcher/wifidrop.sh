#!/usr/bin/env bash

# Function to install NVM
install_nvm() {
    echo "Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
}

if command -v node &> /dev/null
then
	echo "Node.js is installed."
else
	echo "Node.js is not installed."
	NODE_VERSION="22.16.0"
	# Check if NVM is installed
	if ! command -v nvm &> /dev/null
	then
		install_nvm
	else
		echo "NVM is already installed."
	fi
	# Install Node.js using NVM
	nvm install $NODE_VERSION
	nvm use $NODE_VERSION
fi

# Verify installation
if command -v node &> /dev/null
then
  node -v
  npm -v
fi

npm -y exec -- wifidrop "$@"