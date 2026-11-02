[CmdletBinding()]
param(
    [ValidateSet('local', 'production-smoke')]
    [string]$Mode = 'local',
    [string]$BaseUrl = 'http://127.0.0.1:3000',
    [string]$SqlMapPath,
    [string[]]$Target,
    [switch]$ValidateOnly,
    [switch]$DryRun,
    [switch]$IsolatedPreview,
    [string[]]$AllowHost,
    [string]$ProductionOptIn,
    [ValidateRange(1, 12)]
    [int]$RequestBudget = 12
)

$ErrorActionPreference = 'Stop'
$runner = Join-Path $PSScriptRoot 'runner.py'
$arguments = @($runner, '--mode', $Mode, '--base-url', $BaseUrl, '--request-budget', $RequestBudget)

if ($SqlMapPath) { $arguments += @('--sqlmap-path', $SqlMapPath) }
foreach ($targetId in $Target) { $arguments += @('--target', $targetId) }
foreach ($hostName in $AllowHost) { $arguments += @('--allow-host', $hostName) }
if ($ValidateOnly) { $arguments += '--validate-only' }
if ($DryRun) { $arguments += '--dry-run' }
if ($IsolatedPreview) { $arguments += '--isolated-preview' }
if ($ProductionOptIn) { $arguments += @('--production-opt-in', $ProductionOptIn) }

& python @arguments
exit $LASTEXITCODE
