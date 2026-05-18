# Lovable <-> finance-app sync helper
# Usage: pwsh scripts/sync-lovable.ps1 [diff|files|fetch]

param([string]$Action = "summary")

$ErrorActionPreference = "Stop"

# Lovable repo-н default branch
$LovableBranch = "lovable/fe-design"

# Lovable файлуудаас фокусд авах хэсгүүд (UI-д хамаатай)
$WatchPaths = @(
    "src/routes/",
    "src/components/ui/",
    "src/styles.css",
    "src/lib/utils.ts"
)

function Sync-Fetch {
    Write-Host "📥 Fetching from lovable remote..." -ForegroundColor Cyan
    git fetch lovable
    Write-Host "✓ Fetched. Latest commit:" -ForegroundColor Green
    git log $LovableBranch --oneline -1
}

function Show-Files {
    Write-Host "📁 Files in Lovable repo (watch paths):" -ForegroundColor Cyan
    foreach ($p in $WatchPaths) {
        Write-Host ""
        Write-Host "── $p" -ForegroundColor Yellow
        git ls-tree -r $LovableBranch --name-only -- $p
    }
}

function Show-Diff {
    Write-Host "🔍 Recent commits in $LovableBranch (last 10):" -ForegroundColor Cyan
    git log $LovableBranch --oneline -10

    Write-Host ""
    Write-Host "📊 Files changed in Lovable since last sync (vs HEAD):" -ForegroundColor Cyan
    foreach ($p in $WatchPaths) {
        $changes = git diff --name-only HEAD..$LovableBranch -- $p 2>$null
        if ($changes) {
            Write-Host ""
            Write-Host "── $p" -ForegroundColor Yellow
            $changes | ForEach-Object { Write-Host "  $_" }
        }
    }
}

function Show-Summary {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Lovable Sync Helper"
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  finance-app  ← https://github.com/temka54645/finance-app"
    Write-Host "  lovable      ← https://github.com/temka54645/warm-wealth-haven (branch: fe-design)"
    Write-Host ""
    Write-Host "  Available commands:"
    Write-Host "    pwsh scripts/sync-lovable.ps1 fetch  — Lovable-аас сүүлийн commit pull"
    Write-Host "    pwsh scripts/sync-lovable.ps1 files  — Lovable-н бүх UI файлуудыг харах"
    Write-Host "    pwsh scripts/sync-lovable.ps1 diff   — Lovable-д шинээр орсон зүйлийн жагсаалт"
    Write-Host ""
    Sync-Fetch
}

switch ($Action) {
    "fetch"   { Sync-Fetch }
    "files"   { Show-Files }
    "diff"    { Sync-Fetch; Show-Diff }
    "summary" { Show-Summary }
    default   { Show-Summary }
}
