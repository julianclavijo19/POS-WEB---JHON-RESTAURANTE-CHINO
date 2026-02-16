Get-Printer | ForEach-Object { $_.Name }
$def = (Get-CimInstance Win32_Printer -Filter "Default=$true").Name
Write-Host "---DEFAULT---$def"
