@echo off
setlocal

where powershell.exe >nul 2>&1

if %errorlevel% equ 0 (
    echo PowerShell exists on this system.
) else (
    echo PowerShell does not exist on this system or is not in the system's PATH.
	pause
	goto exit
)

if "%1"=="/q" (
	echo WIFIDrop
	echo https://wifidrop.js.org
	rem not working for now
	powershell "$s=(New-Object -COM WScript.Shell).Run(\"install.bat --silent\",1)"
	goto exit
)

echo Install WIFIDrop pre-requisites ...

set tempdir=%temp%\%date:/=-%_%time:,=-%
if not exist "%tempdir%" md "%tempdir%"

set downloadurl1=https://raw.githubusercontent.com/nuzulul/wifidrop/refs/heads/main/tools/launcher/wifidrop.bat
set downloadpath1=%tempdir%\wifidrop.bat
set downloadurl2=https://raw.githubusercontent.com/nuzulul/wifidrop/refs/heads/main/tools/launcher/wifidrop.ico
set downloadpath2=%tempdir%\wifidrop.ico
set downloadurl3=https://raw.githubusercontent.com/nuzulul/wifidrop/refs/heads/main/tools/launcher/wifidrop.txt
set downloadpath3=%tempdir%\wifidrop.txt
set downloadurl4=https://raw.githubusercontent.com/nuzulul/wifidrop/refs/heads/main/README.md
set downloadpath4=%tempdir%\README.md

powershell -Command "& {Import-Module BitsTransfer;Start-BitsTransfer '%downloadurl1%' '%downloadpath1%';}"
powershell -Command "& {Import-Module BitsTransfer;Start-BitsTransfer '%downloadurl2%' '%downloadpath2%';}"
powershell -Command "& {Import-Module BitsTransfer;Start-BitsTransfer '%downloadurl3%' '%downloadpath3%';}"
powershell -Command "& {Import-Module BitsTransfer;Start-BitsTransfer '%downloadurl4%' '%downloadpath4%';}"

set installdir=%localappdata%\narojilstudio\wifidrop\launcher
set app=%installdir%\wifidrop.bat
set windowsappsdir=%localappdata%\Microsoft\WindowsApps
if not exist "%windowsappsdir%" md "%windowsappsdir%"

echo @echo off>"%windowsappsdir%\wifidrop.bat"
echo "%app%" %%*>>"%windowsappsdir%\wifidrop.bat"

CD /D %tempdir%

if "%1"=="--silent" (
	cmd /c "wifidrop.bat --install --quiet"
	goto exit
)

if "%1"=="/p" (
	cmd /c "wifidrop.bat --install --quiet"
	goto exit
)

if "%1"=="/u" (
	cmd /c "wifidrop.bat --uninstall"
	goto exit
)
	
cmd /c "wifidrop.bat --install --launch %*"

:exit

endlocal