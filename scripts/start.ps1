# ─────────────────────────────────────────────────────────────
# blog-studio local development startup script (Windows)
# Usage: .\scripts\start.ps1
# ─────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"

$Root     = (Split-Path $PSScriptRoot -Parent)
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

function Log($msg)  { Write-Host "[blog-studio] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[warn] $msg" -ForegroundColor Yellow }
function Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }

# ── Pre-flight checks ─────────────────────────────────────────
if (-not (Get-Command go   -ErrorAction SilentlyContinue)) { Warn "Go not found. Install from https://go.dev/dl/"; exit 1 }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Warn "Node.js not found. Install from https://nodejs.org/"; exit 1 }
if (-not (Get-Command npm  -ErrorAction SilentlyContinue)) { Warn "npm not found."; exit 1 }

Info "Go $(go version)"
Info "Node $(node --version)"

# ── Env file ─────────────────────────────────────────────────
$envFile    = Join-Path $Root ".env"
$envExample = Join-Path $Root ".env.example"
if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Warn ".env not found — copied from .env.example. Edit it before production use."
}

# Parse .env into environment
Get-Content $envFile | Where-Object { $_ -match "^\s*[^#]\w+=.*" } | ForEach-Object {
    $parts = $_ -split "=", 2
    [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim())
}

$Port = if ($env:PORT) { $env:PORT } else { "8080" }

# ── Directories ───────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path "$Root\data","$Root\uploads" | Out-Null

# ── Backend ───────────────────────────────────────────────────
Log "Installing Go dependencies..."
Set-Location $Backend
go mod tidy

$env:DB_PATH    = "$Root\data\blog.db"
$env:UPLOAD_DIR = "$Root\uploads"

Log "Starting Go backend on :$Port..."
$backendJob = Start-Job -ScriptBlock {
    param($dir, $envVars)
    Set-Location $dir
    foreach ($kv in $envVars.GetEnumerator()) {
        [System.Environment]::SetEnvironmentVariable($kv.Key, $kv.Value)
    }
    go run .
} -ArgumentList $Backend, @{
    PORT           = $Port
    DB_PATH        = "$Root\data\blog.db"
    UPLOAD_DIR     = "$Root\uploads"
    JWT_SECRET     = $env:JWT_SECRET
    ADMIN_USERNAME = $env:ADMIN_USERNAME
    ADMIN_PASSWORD = $env:ADMIN_PASSWORD
}

Start-Sleep -Seconds 3

# ── Frontend ──────────────────────────────────────────────────
# Remove stale [slug] directory (routing is handled by [id])
$staleSlug = Join-Path $Frontend "src\app\admin\posts\[slug]"
if (Test-Path $staleSlug) { Remove-Item $staleSlug -Recurse -Force }

Log "Installing npm dependencies..."
Set-Location $Frontend
npm install --prefer-offline --no-audit --no-fund 2>&1 | Select-Object -Last 5

Log "Starting Next.js frontend on :3000..."
$env:NEXT_PUBLIC_API_URL = "http://localhost:$Port"
$frontendJob = Start-Job -ScriptBlock {
    param($dir, $apiUrl)
    Set-Location $dir
    $env:NEXT_PUBLIC_API_URL = $apiUrl
    npm run dev
} -ArgumentList $Frontend, "http://localhost:$Port"

# ── Summary ───────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  Blog Studio is running!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "  📖 Blog:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "  🔧 Admin:  http://localhost:3000/admin" -ForegroundColor Cyan
Write-Host "  🚀 API:    http://localhost:$Port/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "  默认账号: $($env:ADMIN_USERNAME) / $($env:ADMIN_PASSWORD)"
Write-Host ""
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Yellow

try {
    while ($true) {
        Receive-Job $backendJob  -Keep | Write-Host -ForegroundColor Gray
        Receive-Job $frontendJob -Keep | Write-Host -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
} finally {
    Stop-Job $backendJob,$frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob,$frontendJob -ErrorAction SilentlyContinue
    Log "Stopped."
}
