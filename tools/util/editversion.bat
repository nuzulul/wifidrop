@echo off
REM %1=Version (use quotes if there are spaces in version)

set ReplaceLine=%2
set InFile=%3
set TempFile=TempTest.txt
if exist "%TempFile%" del "%TempFile%"

if "%~1"=="" (
   color CF
   echo.This program must be called with an argument!
   pause
   goto :eof
   )

setlocal enabledelayedexpansion
set /A Cnt=1
for /F "tokens=*" %%a in (%InFile%) do (
   echo.%%a>> "%TempFile%"
   set /A Cnt+=1
   if !Cnt! GEQ %ReplaceLine% GOTO :ExitLoop
   )
:ExitLoop
endlocal

echo.Version: %~1>> "%TempFile%"
more +%ReplaceLine% < "%InFile%">> "%TempFile%"
copy /y "%TempFile%" "%InFile%"
del "%TempFile%"
goto :eof