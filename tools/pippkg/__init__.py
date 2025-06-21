#!/usr/bin/env python

import sys
from urllib.request import urlretrieve
import tempfile
import os
import shutil
import subprocess

def wifidrop():
    print("WIFIDrop")
    print("https://wifidrop.js.org")
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--debug":
            print("Version : WIFIDrop PIP Launcher")
        
    if sys.platform.startswith('linux'):
        url = 'https://github.com/nuzulul/wifidrop/raw/refs/heads/main/tools/util/install.sh'
        filename = 'install.sh'
        print(f"Unsupported platform: {sys.platform}")
    elif sys.platform.startswith('win'):
        url = 'https://github.com/nuzulul/wifidrop/raw/refs/heads/main/tools/util/install.bat'
        filename = 'install.bat'
        temp_dir_path = tempfile.gettempdir()
        folder_path = os.path.join(temp_dir_path, "wifidrop")
        if not os.path.exists(folder_path):
            # Create the folder if it doesn't exist
            os.makedirs(folder_path)
            
        if os.path.exists(folder_path):
            temp_file_path = os.path.join(folder_path, filename)
            path, headers = urlretrieve(url, temp_file_path)
            if len(sys.argv) > 1:
                if sys.argv[1] == "--debug":
                    os.system(f"cmd /c \"@echo off & {temp_file_path} {sys.argv[1]}\"")
                elif sys.argv[1] == "--uninstall":
                    os.system(f"start cmd /c \"@echo off & mode con cols=60 lines=20 & {temp_file_path} {sys.argv[1]}\"")
                elif sys.argv[1] == "/s":
                    os.system(f"start cmd /c \"@echo off & mode con cols=60 lines=20 & {temp_file_path} {sys.argv[1]}\"")
                else:
                    print("Switch not supported")
            else:
                os.system(f"start cmd /c \"@echo off & mode con cols=60 lines=20 & {temp_file_path} /n\"")
    elif sys.platform.startswith('darwin'):
        print(f"Unsupported platform: {sys.platform}")
    else:
        print(f"Unsupported platform: {sys.platform}")
    
