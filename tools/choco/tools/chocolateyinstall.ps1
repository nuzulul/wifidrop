$ErrorActionPreference = 'Stop'
$toolsDir   = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"
$url        = 'https://github.com/nuzulul/wifidrop/releases/download/0.1.0/wifidrop-0.1.0-windows.exe'

$packageArgs = @{
  packageName   = $env:ChocolateyPackageName
  unzipLocation = $toolsDir
  fileType      = 'EXE'
  url           = $url
  softwareName  = 'WIFIDrop*'
  checksum      = 'fd52b473aa6609cd7755a463018ade33b32f2c723bbddee00d93961634e6f45c'
  checksumType  = 'sha256'
  silentArgs   = '/q'
  validExitCodes= @(0)
}

Install-ChocolateyPackage @packageArgs

















