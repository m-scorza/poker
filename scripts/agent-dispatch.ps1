[CmdletBinding()]
param(
  [string]$Task,
  [string]$Worker,
  [switch]$Execute,
  [switch]$List
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$SpoolPath = Join-Path $RepoRoot '.agents\state\task_spool.json'
$WorkersPath = Join-Path $RepoRoot '.agents\workers.json'
$RunsDir = Join-Path $RepoRoot '.agents\runs'

function Read-Json($Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing required file: $Path"
  }
  return Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
}

function Task-Id($TaskObject) {
  if ($TaskObject.task_id) { return [string]$TaskObject.task_id }
  if ($TaskObject.id) { return [string]$TaskObject.id }
  return ''
}

function As-Array($Value) {
  if ($null -eq $Value) { return @() }
  if ($Value -is [array]) { return $Value }
  return @($Value)
}

function Render-List($Title, $Items) {
  $lines = @(As-Array $Items | ForEach-Object { "- $_" })
  if ($lines.Count -eq 0) { $lines = @("- None declared.") }
  return "$Title`n$($lines -join "`n")"
}

function Render-Checks($Checks) {
  $rows = @(As-Array $Checks | ForEach-Object {
    if ($_.name -and $_.command) { "- $($_.name): $($_.command)" } else { "- $_" }
  })
  if ($rows.Count -eq 0) { $rows = @("- No required checks declared; choose the narrowest useful verification and record it.") }
  return $rows -join "`n"
}

function Build-Prompt($TaskObject, $WorkerName) {
  $taskId = Task-Id $TaskObject
  $allowed = Render-List 'Allowed implementation files:' $TaskObject.allowed_files
  $protocol = Render-List 'Allowed protocol files:' $TaskObject.protocol_files
  $generated = Render-List 'Allowed generated files:' $TaskObject.generated_files
  $sourceRefs = Render-List 'Source references to verify first:' $TaskObject.source_refs
  $checks = Render-Checks $TaskObject.required_checks

  return @"
You are executing $taskId as worker "$WorkerName".

Read first:
1. AGENTS.md
2. docs/agents/TWO_AGENT_BOARD.md
3. docs/agents/TASK_PROTOCOL.md
4. docs/agents/AGENT_HANDOFF.md
5. Task-specific source references below

Task title:
$($TaskObject.title)

Task goal:
$($TaskObject.goal)

Branch contract:
$($TaskObject.branch)

$allowed

$protocol

$generated

$sourceRefs

Required checks:
$checks

Workflow:
1. Verify current branch and dirty state before editing.
2. Claim with: node scripts/agent-kernel.cjs claim --task $taskId --agent $WorkerName
3. Edit only the declared scope.
4. Write evidence to .agents/state/evidence-$taskId.json.
5. Validate evidence before completion.
6. Update docs/agents/AGENT_HANDOFF.md before completion if it is in protocol_files.
7. Complete with agent-kernel complete.
8. Stop without further file edits after completion.
"@
}

$spool = Read-Json $SpoolPath
$workersConfig = Read-Json $WorkersPath
$tasks = @(As-Array $spool.tasks)

if ($List) {
  $tasks | ForEach-Object {
    $taskId = Task-Id $_
    "{0} [{1}] worker={2} branch={3} :: {4}" -f $taskId, $_.status, $_.target_agent, $_.branch, $_.title
  }
  exit 0
}

if ($Task) {
  $selected = $tasks | Where-Object { (Task-Id $_) -eq $Task } | Select-Object -First 1
} else {
  $selected = $tasks | Where-Object { $_.status -eq 'pending' } | Select-Object -First 1
}

if (-not $selected) {
  throw "No matching task found. Use -List to inspect the spool."
}

$taskId = Task-Id $selected
$workerName = if ($Worker) { $Worker } elseif ($selected.target_agent) { [string]$selected.target_agent } else { [string]$workersConfig.default_worker }
$workerDef = $workersConfig.workers.$workerName
if (-not $workerDef) {
  throw "Worker '$workerName' is not defined in .agents/workers.json"
}

$prompt = Build-Prompt $selected $workerName
$workspace = [string]$RepoRoot
$argsExpanded = @(As-Array $workerDef.args | ForEach-Object {
  ([string]$_).Replace('{{prompt}}', $prompt).Replace('{{workspace}}', $workspace).Replace('{{task_id}}', $taskId)
})

Write-Output "Task:   $taskId"
Write-Output "Status: $($selected.status)"
Write-Output "Worker: $workerName ($($workerDef.kind))"
Write-Output "Branch: $($selected.branch)"

if ($workerDef.kind -eq 'manual') {
  Write-Output ''
  Write-Output 'Manual worker selected. Prompt:'
  Write-Output $prompt
  exit 0
}

$displayArgs = @($argsExpanded | ForEach-Object {
  if ($_ -eq $prompt) { '<prompt>' }
  elseif ($_.Length -gt 120) { "$($_.Substring(0, 117))..." }
  else { $_ }
})

Write-Output "Command: $($workerDef.command) $($displayArgs -join ' ')"

if (-not $Execute) {
  Write-Output ''
  Write-Output 'Dry run only. Re-run with -Execute to launch the worker and write a log under .agents/runs/.'
  exit 0
}

New-Item -ItemType Directory -Force -Path $RunsDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$logPath = Join-Path $RunsDir "$stamp-$taskId-$workerName.log"

"# agent-dispatch $stamp" | Set-Content -LiteralPath $logPath
"Task: $taskId" | Add-Content -LiteralPath $logPath
"Worker: $workerName" | Add-Content -LiteralPath $logPath
"Command: $($workerDef.command) $($argsExpanded -join ' ')" | Add-Content -LiteralPath $logPath
'' | Add-Content -LiteralPath $logPath

& $workerDef.command @argsExpanded 2>&1 | Tee-Object -FilePath $logPath -Append
exit $LASTEXITCODE
