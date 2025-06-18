@echo off
setlocal

set installdir=%localappdata%\narojilstudio\wifidrop\launcher
set startmenudir=%appdata%\Microsoft\Windows\Start Menu\Programs\WIFIDrop

if "%1"=="--install" (
	echo WIFIDrop
	echo https://wifidrop.js.org
	echo Local peer-to-peer file transfer via WIFI
	echo Please wait ...
	if not exist "%installdir%" md "%installdir%"
	copy "%~f0" "%installdir%\wifidrop.bat" /Y >nul
	copy "%~dp0\wifidrop.ico" "%installdir%\wifidrop.ico" /Y >nul
	copy "%~dp0\README.md" "%installdir%\README.md" /Y >nul
	copy "%~dp0\wifidrop.txt" "%installdir%\wifidrop-version.txt" /Y >nul
	powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('WIFIDrop.lnk');$s.TargetPath='powershell.exe';$s.Arguments='\""$s=(New-Object -COM WScript.Shell).Run(\\\"wifidrop.bat\\\",0)\""';$s.IconLocation='%installdir%\wifidrop.ico';$s.WorkingDirectory='%installdir%';$s.WindowStyle=7;$s.Save()"
	if not exist "%startmenudir%" md "%startmenudir%"
	copy "%~dp0\WIFIDrop.lnk" "%installdir%\WIFIDrop.lnk" /Y >nul
	copy "%~dp0\WIFIDrop.lnk" "%startmenudir%\WIFIDrop.lnk" /Y >nul
	copy "%~dp0\WIFIDrop.lnk" "%userprofile%\desktop\WIFIDrop.lnk" /Y >nul
	powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('Uninstall-WIFIDrop.lnk');$s.TargetPath='cmd.exe';$s.Arguments='/c wifidrop.bat --uninstall';$s.IconLocation='%installdir%\wifidrop.ico';$s.WorkingDirectory='%installdir%';$s.WindowStyle=7;$s.Save()"
	copy "%~dp0\Uninstall-WIFIDrop.lnk" "%startmenudir%\Uninstall-WIFIDrop.lnk" /Y >nul
	copy "%~dp0\Uninstall-WIFIDrop.lnk" "%installdir%\Uninstall-WIFIDrop.lnk" /Y >nul
	if "%2"=="--launch" (
		CD /D "%installdir%"
		if "%3"=="--debug" (
			cmd /c "%wifidrop.bat --debug"
		) else (
			powershell "$s=(New-Object -COM WScript.Shell).Run(\"wifidrop.bat\",0)"
		)
	)
	goto exit
)

if "%1"=="--uninstall" (
	echo Uninstall WIFIDrop ...
	rmdir /s /q "%startmenudir%"
	del /F /S /Q "%userprofile%\desktop\WIFIDrop.lnk"
	rmdir /s /q "%installdir%"
	goto exit
)

set filename=%~n0
set tempdir=%localappdata%\narojilstudio\wifidrop\temp
set nodetemp=%tempdir%\%date:/=-%_%time:,=-%
set wifidroptemp=%nodetemp%

if "%filename%"=="wifidrop" (
  rmdir /s /q "%tempdir%"
  if not exist "%wifidroptemp%" md "%wifidroptemp%"
  copy "%~f0" "%wifidroptemp%\%~n0-win.bat" /Y >nul
  CD /D "%wifidroptemp%"
  cmd /c "%~n0-win.bat %1"
  goto exit
)

if exist "%SYSTEMDRIVE%\Program Files (x86)\" (
   set nodearch=x64
) else (
   set nodearch=x86
)

set nodeversion=22.16.0
set nodedir=%localappdata%\narojilstudio\node
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

start cmd /V:ON /c "@echo off & mode con cols=60 lines=20 & set load=#& title WIFIDrop & echo CONFIGURING WIFIDROP PLEASE WAIT ... & Timeout /t 5 >nul & FOR /L %%A IN (1,1,1000) DO ( set load=!load!#& CLS & echo CONFIGURING WIFIDROP PLEASE WAIT ... %%A & echo:!load! & (tasklist | find "powershell.exe" > NUL) & If errorlevel 1 exit & Timeout /t 1 >nul)"
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

start cmd /V:ON /c "@echo off & mode con cols=60 lines=20 & set load=#& title WIFIDrop & echo LOADING WIFIDROP PLEASE WAIT ... & FOR /L %%A IN (1,1,3) DO ( set load=!load!#& CLS & echo LOADING WIFIDROP PLEASE WAIT ... %%A & echo:!load! & Timeout /t 1 >nul)"
echo Launching ...

npm -y exec --package=wifidrop@latest -- wifidrop %1

:exit

endlocal