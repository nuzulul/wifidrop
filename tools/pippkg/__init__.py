#!/usr/bin/env python

import sys
from urllib.request import urlretrieve
import tempfile
import os
import shutil
import subprocess

def wifidrop():
    print("WIFIDrop")
        
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
            # print(f"Folder '{folder_path}' created successfully.")
        else:
            # print(f"Folder '{folder_path}' already exists.") 
            temp_file_path = os.path.join(folder_path, filename)
            path, headers = urlretrieve(url, temp_file_path)
            os.system(f"start cmd /c \"@echo off & mode con cols=60 lines=20 & {temp_file_path}\"")
    elif sys.platform.startswith('darwin'):
        print(f"Unsupported platform: {sys.platform}")
    else:
        print(f"Unsupported platform: {sys.platform}")
    
