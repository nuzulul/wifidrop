# WIFIDrop
Import-Module BitsTransfer;
$targetPath = Join-Path -Path $env:temp -ChildPath 'wifidrop\install.bat';
Start-BitsTransfer 'https://raw.githubusercontent.com/nuzulul/wifidrop/main/tools/util/install.bat' $targetPath
Start-Process -FilePath 'cmd.exe' -ArgumentList "/c '@echo off & mode con cols=60 lines=20 & title WIFIDrop & $targetPath /s'" -ErrorAction Continue;