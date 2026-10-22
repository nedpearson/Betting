$wshell = New-Object -ComObject WScript.Shell
$kalshi = $wshell.AppActivate("Kalshi")
$chrome = $wshell.AppActivate("Google Chrome")
Write-Output "Kalshi: $kalshi"
Write-Output "Chrome: $chrome"
