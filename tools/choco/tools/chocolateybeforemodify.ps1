$ErrorActionPreference = 'Stop'
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c wifidrop --uninstall' -ErrorAction Continue


