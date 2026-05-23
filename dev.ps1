#Requires -Version 5.1
<#
.SYNOPSIS
    Windows dev helper - mirrors the Makefile targets for PowerShell users.

.DESCRIPTION
    Usage:  .\dev.ps1 [target]

    Targets:
      help          Show this help (default)
      setup         Copy .env.example -> .env (if absent) and npm install
      install       npm install
      dev           Vite dev server only (http://localhost:1420)
      dev-multi     Vite dev server + two isolated browser windows for realtime testing
      tauri-dev     Vite + native Tauri desktop window
      build         Type-check and build frontend to dist/
      check-srd     Diff rules constants against the parsed SRD tables
      tauri-build   Build distributable Windows desktop app
      android-init  Generate Android project scaffold (run once)
      android-dev   Start Tauri Android dev session
      android-build Build Android APK / AAB
      clean         Remove build artifacts (dist/, src\tauri\target\)
      db-push       Deploy migrations to Supabase
      db-push-dry   Preview migrations (no changes made)
#>

param(
    [string]$Target = "help"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Show-Help {
    $cyan  = 'Cyan'
    $white = 'White'
    $bold  = 'Yellow'

    Write-Host ""
    Write-Host "Usage:" -ForegroundColor $white
    Write-Host "  .\dev.ps1 " -NoNewline -ForegroundColor $white
    Write-Host "<target>" -ForegroundColor $cyan
    Write-Host ""

    Write-Host "Setup" -ForegroundColor $bold
    Write-Host ("  {0,-22} {1}" -f "setup", "Copy .env.example -> .env (if absent) and run npm install")
    Write-Host ("  {0,-22} {1}" -f "install", "Install Node dependencies")
    Write-Host ""

    Write-Host "Local development  (requires Node, Rust, and WebView2 on the host)" -ForegroundColor $bold
    Write-Host ("  {0,-22} {1}" -f "dev", "Start Vite dev server only  --  frontend HMR at http://localhost:1420")
    Write-Host ("  {0,-22} {1}" -f "dev-multi", "Vite + two isolated browser windows for realtime/multi-user testing")
    Write-Host ("  {0,-22} {1}" -f "tauri-dev", "Start full Tauri app  --  Vite dev server + native desktop window")
    Write-Host ("  {0,-22} {1}" -f "build", "Type-check and build frontend to dist/")
    Write-Host ("  {0,-22} {1}" -f "check-srd", "Diff rules constants against the parsed SRD tables (needs .env credentials)")
    Write-Host ("  {0,-22} {1}" -f "tauri-build", "Build distributable Windows desktop installer")
    Write-Host ""

    Write-Host "Android  (requires Android SDK + NDK configured on the host)" -ForegroundColor $bold
    Write-Host ("  {0,-22} {1}" -f "android-init", "Generate Android project scaffold in src/tauri/gen/  (run once)")
    Write-Host ("  {0,-22} {1}" -f "android-dev", "Start Tauri Android dev session")
    Write-Host ("  {0,-22} {1}" -f "android-build", "Build Android APK / AAB")
    Write-Host ""

    Write-Host "Database" -ForegroundColor $bold
    Write-Host ("  {0,-22} {1}" -f "db-push", "Deploy pending migrations to Supabase  (needs .env credentials)")
    Write-Host ("  {0,-22} {1}" -f "db-push-dry", "Preview which migrations would be applied  (no changes made)")
    Write-Host ""

    Write-Host "Cleanup" -ForegroundColor $bold
    Write-Host ("  {0,-22} {1}" -f "clean", "Remove build artifacts  (dist/ and src\tauri\target\)")
    Write-Host ("  {0,-22} {1}" -f "help", "Show this help  (default when no target given)")
    Write-Host ""
}

function Invoke-Setup {
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env - fill in your Supabase credentials before continuing." -ForegroundColor Yellow
    }
    npm install
}

function Invoke-Install { npm install }

function Invoke-Dev { npm run dev }

function Invoke-DevMulti {
    $url  = "http://localhost:1420"
    $cwd  = (Get-Location).Path
    $tmp  = [System.IO.Path]::GetTempPath()
    $p1   = Join-Path $tmp "cos-dev-profile-1"
    $p2   = Join-Path $tmp "cos-dev-profile-2"

    # Start Vite in a separate terminal window so its output is visible
    Write-Host "Starting Vite dev server in a new window..." -ForegroundColor Cyan
    $psCmd = "cd '$cwd'; npm run dev"
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", $psCmd)

    Write-Host "Waiting for Vite to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # Find Chrome or Edge
    $chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    $edge   = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    $browser = if (Test-Path $chrome) { $chrome } elseif (Test-Path $edge) { $edge } else { $null }

    $flag1 = '--user-data-dir="' + $p1 + '"'
    $flag2 = '--user-data-dir="' + $p2 + '"'

    if ($null -eq $browser) {
        Write-Host ""
        Write-Host "Chrome / Edge not found on expected paths." -ForegroundColor Yellow
        Write-Host "Open two browser windows manually with isolated profiles:" -ForegroundColor Yellow
        Write-Host "  chrome.exe $flag1 --new-window $url" -ForegroundColor Gray
        Write-Host "  chrome.exe $flag2 --new-window $url" -ForegroundColor Gray
        return
    }

    Write-Host "Opening two isolated browser windows..." -ForegroundColor Cyan
    Start-Process $browser -ArgumentList @($flag1, "--new-window", $url)
    Start-Sleep -Seconds 1
    Start-Process $browser -ArgumentList @($flag2, "--new-window", $url)

    Write-Host ""
    Write-Host "Two browser windows opened - log in as different accounts to test realtime sync." -ForegroundColor Green
    Write-Host "Vite is running in the other terminal." -ForegroundColor Green
    Write-Host "Realtime Debug overlay (top-right corner) shows live channel states and events." -ForegroundColor Cyan
}

function Invoke-TauriDev { npm run "tauri:dev" }

function Invoke-Build { npm run build }

function Invoke-CheckSrd { npm run "check:srd" }

function Invoke-TauriBuild { npm run "tauri:build" }

function Invoke-AndroidInit { npm run "tauri:android:init" }

function Invoke-AndroidDev { npm run "tauri:android:dev" }

function Invoke-AndroidBuild { npm run "tauri:android:build" }

function Invoke-Clean {
    foreach ($path in @("dist", "src\tauri\target")) {
        if (Test-Path $path) {
            Remove-Item -Recurse -Force $path
            Write-Host "Removed $path" -ForegroundColor Cyan
        }
    }
}

function Get-EnvVars {
    $vars = @{}
    foreach ($line in Get-Content ".env") {
        if ($line -match '^\s*([^#=]+)=(.*)$') {
            $vars[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }
    return $vars
}

function Build-DbUrl([hashtable]$env) {
    $pwd = [Uri]::EscapeDataString($env["SUPABASE_DB_PASSWORD"])
    return $env["SUPABASE_DB_URL"] -replace '\[YOUR-PASSWORD\]', $pwd
}

function Invoke-DbPush {
    $env = Get-EnvVars
    $url = Build-DbUrl $env
    npx supabase db push --db-url $url
}

function Invoke-DbPushDry {
    $env = Get-EnvVars
    $url = Build-DbUrl $env
    npx supabase db push --db-url $url --dry-run
}

switch ($Target.ToLower()) {
    "help"          { Show-Help }
    "setup"         { Invoke-Setup }
    "install"       { Invoke-Install }
    "dev"           { Invoke-Dev }
    "dev-multi"     { Invoke-DevMulti }
    "tauri-dev"     { Invoke-TauriDev }
    "build"         { Invoke-Build }
    "check-srd"     { Invoke-CheckSrd }
    "tauri-build"   { Invoke-TauriBuild }
    "android-init"  { Invoke-AndroidInit }
    "android-dev"   { Invoke-AndroidDev }
    "android-build" { Invoke-AndroidBuild }
    "clean"         { Invoke-Clean }
    "db-push"       { Invoke-DbPush }
    "db-push-dry"   { Invoke-DbPushDry }
    default {
        Write-Host "Unknown target: $Target" -ForegroundColor Red
        Write-Host "Run '.\dev.ps1 help' for available targets."
        exit 1
    }
}
