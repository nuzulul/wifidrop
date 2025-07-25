@echo off
setlocal ENABLEDELAYEDEXPANSION

color 3f
title WIFIDrop

cd %~dp0

if "%1"=="--debug" (
	if exist wifidrop.txt (
		set /p version=< wifidrop.txt
	) else (
		set version=
	)
	echo Version : WIFIDrop BATCH Installer !version!
)

where powershell.exe >nul 2>&1

if %errorlevel% equ 0 (
    rem echo PowerShell exists on this system.
) else (
	if "%1"=="/q" (
		echo PowerShell does not exist on this system or is not in the system's PATH.
		echo Open : https://wifidrop.js.org
		goto exit	
	) else (
		echo PowerShell does not exist on this system or is not in the system's PATH.
		echo Open : https://wifidrop.js.org
		pause
		goto exit
	)
)

set/a timer=0
set load=#

if "%1"=="/main" (
	echo Main program
) else (
	echo WIFIDrop
	echo https://wifidrop.js.org
	echo Checking WIFIDrop prerequisites ...
	
	if "%1"=="/q" (
		powershell "$s=(New-Object -COM WScript.Shell).Run(\"install.bat /main --silent\",0)"
	) else (
		if "%1"=="/s" (
			powershell "$s=(New-Object -COM WScript.Shell).Run(\"install.bat /main --super\",0)"
		) else (
			if "%1"=="/n" (
				powershell "$s=(New-Object -COM WScript.Shell).Run(\"install.bat /main --normal\",0)"
			) else (
				if "%1"=="/u" (
					powershell "$s=(New-Object -COM WScript.Shell).Run(\"install.bat /main --uninstall\",0)"
				) else (
					if "%1"=="--debug" (
						cmd /c "install.bat /main --debug"
						goto exit
					) else (
						powershell "$s=(New-Object -COM WScript.Shell).Run(\"install.bat /main %*\",0)"
					)
				)
			)	
		)
	)
	
	FOR /L %%A IN (1,1,30) DO ( 
		set load=!load!#
		CLS
		echo WIFIDrop
		echo https://wifidrop.js.org		
		echo Checking WIFIDrop prerequisites ... %%A
		echo:!load!
		(tasklist | find "powershell.exe" > NUL)
		If errorlevel 1 (
			set/a timer=!timer!+1
			if !timer!==3 (
				goto exit
			)
		) else (
			set/a timer=0
		)
		Timeout /t 1 >nul
	)
	goto exit
)

echo Checking WIFIDrop prerequisites ...

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

CD /D %tempdir%

if "%2"=="--silent" (
	cmd /c "wifidrop.bat --install --quiet"
	goto installpath
)

if "%2"=="--super" (
	cmd /c "wifidrop.bat --install --launch"
	goto installpath
)

if "%2"=="--normal" (
	cmd /c "wifidrop.bat --install --launch"
	goto exit
)

if "%2"=="--uninstall" (
	cmd /c "wifidrop.bat --uninstall"
	goto exit
)
	
cmd /c "wifidrop.bat --install --launch %2"
goto installpath

:installpath

set installdir=%localappdata%\narojilstudio\wifidrop\launcher
set app=%installdir%\wifidrop.bat
set windowsappsdir=%localappdata%\Microsoft\WindowsApps
if not exist "%windowsappsdir%" md "%windowsappsdir%"
echo @echo off>"%windowsappsdir%\wifidrop.bat"
echo "%app%" %%*>>"%windowsappsdir%\wifidrop.bat"

:exit

endlocal