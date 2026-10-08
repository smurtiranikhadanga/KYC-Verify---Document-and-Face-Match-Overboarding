$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$zipPath = Join-Path $projectRoot "kyc-verify-production.zip"

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

$tempFolder = Join-Path $env:TEMP ("kyc_prod_" + (Get-Random))
New-Item -ItemType Directory -Path $tempFolder -Force | Out-Null

Write-Host "Copying project files to temporary build folder..." -ForegroundColor Cyan

$excludeList = @('node_modules', '.git', '.cache', 'dist', '.vite', 'tasks', 'logs')

Get-ChildItem -Path $projectRoot | ForEach-Object {
    if ($_.Name -notin $excludeList -and $_.Name -notlike "*.zip" -and $_.Name -notlike "*.log") {
        Copy-Item -Path $_.FullName -Destination (Join-Path $tempFolder $_.Name) -Recurse -Force
    }
}

# Recursively strip node_modules, cache and build artifacts in the temp folder
Get-ChildItem -Path $tempFolder -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem -Path $tempFolder -Recurse -Directory -Filter ".cache" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem -Path $tempFolder -Recurse -Directory -Filter ".vite" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem -Path $tempFolder -Recurse -Directory -Filter "dist" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force

Write-Host "Compressing to kyc-verify-production.zip..." -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempFolder, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Remove-Item -Path $tempFolder -Recurse -Force

$zipSize = (Get-Item $zipPath).Length
$zipSizeMB = [math]::Round($zipSize / 1MB, 2)

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "SUCCESS: Packaged deployable production project!" -ForegroundColor Green
Write-Host "Zip location: $zipPath" -ForegroundColor Green
Write-Host "Archive size: $zipSizeMB MB (Limit: 450 MB)" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
