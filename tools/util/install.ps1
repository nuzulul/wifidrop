Import-Module BitsTransfer;
$targetPath = Join-Path -Path $env:temp -ChildPath 'wifidrop\install.bat';
Start-BitsTransfer 'https://raw.githubusercontent.com/nuzulul/wifidrop/main/tools/util/install.bat' $targetPath;
Start-Process -FilePath $targetPath -ArgumentList '/s' -ErrorAction Continue
















