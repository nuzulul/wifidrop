[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles
[Strings]
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=wifidrop.exe
FriendlyName=WIFIDrop
AppLaunched=cmd /V:ON /c "@echo off & mode con cols=60 lines=20 & title WIFIDrop & install.bat /s"
PostInstallCmd=<None>
AdminQuietInstCmd=cmd /V:ON /c "@echo off & mode con cols=60 lines=20 & title WIFIDrop & install.bat /q"
UserQuietInstCmd=cmd /V:ON /c "@echo off & mode con cols=60 lines=20 & title WIFIDrop & install.bat /q"
FILE0="install.bat"
[SourceFiles]
SourceFiles0=.\
[SourceFiles0]
%FILE0%=
