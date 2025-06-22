$ErrorActionPreference = 'Stop'

$toolsDir   = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"

$binaryFileName = 'wifidrop-0.1.0-windows.exe'
$targetPath = Join-Path -Path $toolsDir -ChildPath $binaryFileName
Start-Process -FilePath $targetPath -ArgumentList '/c:"cmd.exe /c install.bat /u"' -ErrorAction Continue


