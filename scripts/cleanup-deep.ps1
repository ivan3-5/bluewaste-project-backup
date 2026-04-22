param(
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$SafeTargets = @(
    "web/.next",
    "node_modules/.cache",
    "backend/node_modules/.cache",
    "web/node_modules/.cache",
    "web/tsconfig.tsbuildinfo",
    "mobile_flutter/build",
    "mobile_flutter/.dart_tool",
    "mobile_flutter/android/.gradle"
)

$LargeTargets = @(
    "node_modules",
    "backend/node_modules",
    "web/node_modules",
    ".venv"
)

function Get-PathSizeBytes {
    param(
        [Parameter(Mandatory = $true)]
        [string]$AbsolutePath
    )

    if (-not (Test-Path -LiteralPath $AbsolutePath)) {
        return 0
    }

    $item = Get-Item -LiteralPath $AbsolutePath -Force
    if ($item.PSIsContainer) {
        $measure = Get-ChildItem -LiteralPath $AbsolutePath -Recurse -File -Force -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum
        if ($null -eq $measure) {
            return 0
        }

        $sumProperty = $measure.PSObject.Properties["Sum"]
        if ($null -eq $sumProperty -or $null -eq $sumProperty.Value) {
            return 0
        }

        return [int64]$sumProperty.Value
    }

    return [int64]$item.Length
}

function Delete-Path {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath,

        [Parameter(Mandatory = $true)]
        [switch]$IsDryRun
    )

    $absolutePath = Join-Path $ProjectRoot $RelativePath
    if (-not (Test-Path -LiteralPath $absolutePath)) {
        Write-Host "[SKIP] Not found: $RelativePath"
        return
    }

    if ($IsDryRun) {
        Write-Host "[DRY-RUN] Would delete: $RelativePath"
        return
    }

    try {
        Remove-Item -LiteralPath $absolutePath -Recurse -Force -ErrorAction Stop
    }
    catch {
        Write-Host "[WARN] Initial delete failed for: $RelativePath"
        Write-Host "       Reason: $($_.Exception.Message)"
        Remove-Item -LiteralPath $absolutePath -Recurse -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path -LiteralPath $absolutePath) {
        Write-Host "[WARN] Could not fully delete: $RelativePath"
        Write-Host "       Some files may be locked by a running process."
    }
    else {
        Write-Host "[OK] Deleted: $RelativePath"
    }
}

function Confirm-And-DeleteLargePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath,

        [Parameter(Mandatory = $true)]
        [switch]$IsDryRun
    )

    $absolutePath = Join-Path $ProjectRoot $RelativePath
    if (-not (Test-Path -LiteralPath $absolutePath)) {
        Write-Host "[SKIP] Not found: $RelativePath"
        return
    }

    $sizeMB = [math]::Round((Get-PathSizeBytes -AbsolutePath $absolutePath) / 1MB, 2)
    Write-Host ""
    Write-Host "Large target detected: $RelativePath (~$sizeMB MB)"
    $answer = Read-Host "Type YES to delete this folder (anything else = skip)"

    if ($answer -ne "YES") {
        Write-Host "[SKIP] Kept: $RelativePath"
        return
    }

    if ($IsDryRun) {
        Write-Host "[DRY-RUN] Would delete after confirmation: $RelativePath"
        return
    }

    try {
        Remove-Item -LiteralPath $absolutePath -Recurse -Force -ErrorAction Stop
    }
    catch {
        Write-Host "[WARN] Initial delete failed for: $RelativePath"
        Write-Host "       Reason: $($_.Exception.Message)"
        Remove-Item -LiteralPath $absolutePath -Recurse -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path -LiteralPath $absolutePath) {
        Write-Host "[WARN] Could not fully delete: $RelativePath"
        Write-Host "       Some files may be locked by a running process."
    }
    else {
        Write-Host "[OK] Deleted large folder: $RelativePath"
    }
}

Write-Host ""
Write-Host "=== BlueWaste DEEP CLEAN ==="
Write-Host "Project root: $ProjectRoot"
Write-Host "Mode: $(if ($DryRun) { 'DRY-RUN (no files deleted)' } else { 'LIVE CLEANUP' })"
Write-Host ""
Write-Host "Step 1: Safe cleanup (always safe/rebuildable)."
Write-Host "Step 2: Optional large-folder cleanup with confirmation prompts."
Write-Host ""

Write-Host "Safe cleanup targets:"
foreach ($target in $SafeTargets) {
    $absolutePath = Join-Path $ProjectRoot $target
    if (Test-Path -LiteralPath $absolutePath) {
        $sizeMB = [math]::Round((Get-PathSizeBytes -AbsolutePath $absolutePath) / 1MB, 2)
        Write-Host "- $target (~$sizeMB MB)"
    }
    else {
        Write-Host "- $target (not found)"
    }
}

Write-Host ""
Write-Host "Running safe cleanup now..."
foreach ($target in $SafeTargets) {
    Delete-Path -RelativePath $target -IsDryRun:$DryRun
}

Write-Host ""
Write-Host "Now optional deep cleanup for large folders:"
Write-Host "- node_modules"
Write-Host "- backend/node_modules"
Write-Host "- web/node_modules"
Write-Host "- .venv"
Write-Host ""

foreach ($target in $LargeTargets) {
    Confirm-And-DeleteLargePath -RelativePath $target -IsDryRun:$DryRun
}

Write-Host ""
Write-Host "DEEP CLEAN finished."
Write-Host ""
Write-Host "Restore if needed:"
Write-Host "1) npm install"
Write-Host "2) npm run web:dev (or npm run web:build)"
Write-Host "3) cd backend ; npm install"
Write-Host "4) cd web ; npm install"
Write-Host "5) cd mobile_flutter ; flutter pub get"
Write-Host "6) Recreate Python env only if .venv was deleted"
