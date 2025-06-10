@echo off
setlocal

if exist "%SYSTEMDRIVE%\Program Files (x86)\" (
   set nodearch=x64
) else (
   set nodearch=x86
)

set nodeversion=22.16.0
set nodedir=%localappdata%\narojilstudio\nodejs
set nodeenv=%nodedir%\node-v%nodeversion%-win-%nodearch%
set nodeexe=%nodeenv%\node.exe

rem check is node available
set nodev=
for /f "delims=" %%i in ('node -v 2^>nul') do set nodev=%%i
if "%nodev%"=="" (
	echo Node.js is not installed or not in PATH.
    goto checkexe
)

rem check is npm available
set npmv=
for /f "delims=" %%i in ('npm -v 2^>nul') do set npmv=%%i
if "%npmv%"=="" (
    echo NPM is not installed or not in PATH.
    goto checkexe
)

rem if node and nvm available jump to main 
echo Node.js is installed. Version: %nodev%
echo NPM is installed. Version: %npmv%
goto main

:checkexe

set nodePath=
for %%i in ("%nodeexe%") do (
    if exist "%%i" set nodePath="%%i"
)
if "%nodePath%"=="" (
    echo Node.js is not in default locations.
	goto downloadnode
	goto main
) else (
    echo Node.js is installed at %nodePath%
	goto updatepath
)

:downloadnode

echo Downloading node ...
if not exist %nodedir% md %nodedir%
set downloadurl=https://nodejs.org/dist/v22.16.0/node-v%nodeversion%-win-x64.zip
set downloadpath=%nodedir%\node.zip
set directory=%nodedir%\
%WINDIR%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "& {Import-Module BitsTransfer;Start-BitsTransfer '%downloadurl%' '%downloadpath%';$shell = new-object -com shell.application;$zip = $shell.NameSpace('%downloadpath%');foreach($item in $zip.items()){$shell.Namespace('%directory%').copyhere($item);};remove-item '%downloadpath%';}"
echo download complete and extracted to the directory.

:updatepath
set "NEW_PATH=%nodeenv%"
set "PATH=%APPDATA%\npm;%NEW_PATH%;%PATH%"
echo Path updated for current session.

:main

echo Launching ...

npm exec wifidrop -y

endlocal
pause