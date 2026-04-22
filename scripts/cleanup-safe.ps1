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

function Remove-Target {
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

Write-Host ""
Write-Host "=== BlueWaste SAFE CLEAN ==="
Write-Host "Project root: $ProjectRoot"
Write-Host "Mode: $(if ($DryRun) { 'DRY-RUN (no files deleted)' } else { 'LIVE CLEANUP' })"
Write-Host ""
Write-Host "This script only removes safe, rebuildable files:"
Write-Host "- Next.js build output (.next)"
Write-Host "- node_modules cache folders (.cache)"
Write-Host "- tsconfig.tsbuildinfo"
Write-Host "- Flutter build folders"
Write-Host ""

$plan = foreach ($target in $SafeTargets) {
    $absolutePath = Join-Path $ProjectRoot $target
    if (Test-Path -LiteralPath $absolutePath) {
        $bytes = Get-PathSizeBytes -AbsolutePath $absolutePath
        [PSCustomObject]@{
            Path   = $target
            Exists = "Yes"
            SizeMB = [math]::Round($bytes / 1MB, 2)
        }
    }
    else {
        [PSCustomObject]@{
            Path   = $target
            Exists = "No"
            SizeMB = 0
        }
    }
}

$plan | Format-Table -AutoSize

$totalMB = [math]::Round((($plan | Where-Object { $_.Exists -eq "Yes" } | Measure-Object -Property SizeMB -Sum).Sum), 2)
if ($null -eq $totalMB) {
    $totalMB = 0
}

Write-Host ""
Write-Host "Estimated removable size: $totalMB MB"
Write-Host ""

foreach ($target in $SafeTargets) {
    Remove-Target -RelativePath $target -IsDryRun:$DryRun
}

Write-Host ""
Write-Host "SAFE CLEAN finished."
Write-Host ""
Write-Host "Restore if needed:"
Write-Host "1) npm install"
Write-Host "2) npm run web:dev (or npm run web:build)"
Write-Host "3) cd mobile_flutter ; flutter pub get"
Write-Host "4) Run Flutter again to regenerate build output"
