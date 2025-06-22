$ErrorActionPreference = 'Stop'
$toolsDir   = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"
$url        = 'https://github.com/nuzulul/wifidrop/releases/download/0.1.0/wifidrop-0.1.0-windows.zip'

$packageArgs = @{
  packageName   = $env:ChocolateyPackageName
  unzipLocation = $toolsDir
  url           = $url
  checksum      = 'a4bbe2f0744e1f248dd5963040c3401cb48f8d92ed30ed69c799197594abd1dd'
  checksumType  = 'sha256'
}

Install-ChocolateyZipPackage @packageArgs


$binaryFileName = 'wifidrop-0.1.0-windows.exe'
$targetPath = Join-Path -Path $toolsDir -ChildPath $binaryFileName
Start-Process -FilePath $targetPath -ArgumentList '/q' -ErrorAction Continue
















