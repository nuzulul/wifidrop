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
AppLaunched=cmd /c "@echo off & mode con cols=60 lines=20 & title WIFIDrop & wifidrop.bat --install --launch"
PostInstallCmd=<None>
AdminQuietInstCmd=cmd /c "@echo off & mode con cols=60 lines=20 & title WIFIDrop & wifidrop.bat --install --quiet"
UserQuietInstCmd=cmd /c "@echo off & mode con cols=60 lines=20 & title WIFIDrop & wifidrop.bat --install --quiet"
FILE0="wifidrop.bat"
FILE1="wifidrop.ico"
FILE2="wifidrop.txt"
FILE3="README.md"
[SourceFiles]
SourceFiles0=.\
SourceFiles1=.\..\..\
[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
[SourceFiles1]
%FILE3%=
