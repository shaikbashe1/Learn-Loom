$envFile = "C:\Users\dell\Learn-Loom\.env"
Get-Content $envFile | Where-Object { $_ -match "^(VITE_[A-Z_]+)=(.*)$" } | ForEach-Object {
    $key = $Matches[1]
    $value = $Matches[2]
    Write-Host "Adding $key to production..."
    # Vercel env rm requires confirmation, so we just add it (it will prompt if exists, but usually we just pipe to add)
    # Actually, if it exists, `vercel env add` fails. So we rm it first forcefully.
    npx.cmd vercel env rm $key production -y 2>$null
    $value | npx.cmd vercel env add $key production
}
Write-Host "Environment variables pushed."
