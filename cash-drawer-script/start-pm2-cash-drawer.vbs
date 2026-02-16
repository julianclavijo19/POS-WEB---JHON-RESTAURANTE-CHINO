Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "cmd /c cd /d """ & scriptDir & """ && start-pm2-cash-drawer.bat", 0, False
