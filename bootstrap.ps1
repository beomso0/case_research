# lbox 판례 리서치 도구 — 설치 부트스트랩 (Windows PowerShell)
#
# 사용(한 줄):
#   git clone https://github.com/beomso0/claude_test.git; cd claude_test; ./bootstrap.ps1
#
# 이 저장소는 비공개(private)입니다. clone에는 저장소 접근 권한(소유자·협업자)과
# GitHub 인증(로그인 또는 SSH 키)이 필요할 수 있습니다.

function Say ($m) { Write-Host $m -ForegroundColor Cyan }
function Ok  ($m) { Write-Host "OK  $m" -ForegroundColor Green }
function Warn($m) { Write-Host "!   $m" -ForegroundColor Yellow }
function Err ($m) { Write-Host "X   $m" -ForegroundColor Red }

$RepoUrl = "https://github.com/beomso0/claude_test.git"
$RepoDir = "claude_test"

Say "▶ lbox 판례 리서치 도구 설치를 시작합니다."

# 0) 저장소 위치 확보 — repo 안에서 실행됐는지 확인, 아니면 클론 시도
if (-not (Test-Path ".mcp.json") -or -not (Test-Path ".claude")) {
  if (Get-Command git -ErrorAction SilentlyContinue) {
    Say "· 저장소를 클론합니다(비공개 repo이므로 GitHub 인증이 필요할 수 있습니다)…"
    git clone $RepoUrl $RepoDir
    if ($LASTEXITCODE -ne 0) { Err "git clone 실패 — 저장소 접근 권한/인증을 확인해 주세요."; exit 1 }
    Set-Location $RepoDir
  } else {
    Err "git이 없어 저장소를 가져올 수 없습니다. git 설치 후 다시 실행해 주세요."
    exit 1
  }
}
Ok "저장소 루트: $(Get-Location)"

# 1) 사전 요구 확인 (없어도 중단하지 않고 안내)
$missing = $false
function Check ($cmd, $name, $hint) {
  if (Get-Command $cmd -ErrorAction SilentlyContinue) { Ok $name }
  else { Warn "$name 없음 — $hint"; $script:missing = $true }
}
Say "· 사전 요구 확인"
Check "git"  "Git"     "https://git-scm.com · winget install Git.Git"
Check "node" "Node.js" "https://nodejs.org · winget install OpenJS.NodeJS  (Playwright MCP 실행에 필요)"
Check "npx"  "npx"     "Node.js 설치 시 함께 제공됩니다"

$py = $null
if     (Get-Command python  -ErrorAction SilentlyContinue) { $py = "python" }
elseif (Get-Command python3 -ErrorAction SilentlyContinue) { $py = "python3" }
if ($py) { Ok "Python ($(& $py --version 2>&1))" }
else { Warn "Python 3 없음 — https://python.org · winget install Python.Python.3"; $missing = $true }

# 2) 파이썬 의존성 설치 (docx 생성용 python-docx)
if ($py -and (Test-Path "requirements.txt")) {
  Say "· Python 의존성 설치 (python-docx)"
  & $py -m pip install -r requirements.txt
  if ($LASTEXITCODE -ne 0) {
    Warn "전역 설치 실패 — 사용자 설치(--user)로 재시도합니다."
    & $py -m pip install --user -r requirements.txt
    if ($LASTEXITCODE -ne 0) { Err "pip 설치 실패 — '$py -m pip install -r requirements.txt' 를 수동 실행해 주세요." }
    else { Ok "사용자 설치 완료" }
  } else { Ok "requirements.txt 설치 완료" }
}

# 3) MCP 설정 확인
if (Test-Path ".mcp.json") { Ok ".mcp.json 감지 (Playwright MCP — 최초 실행 시 npx가 자동 설치)" }
else { Warn ".mcp.json 이 없습니다 — 저장소가 온전한지 확인해 주세요." }

Write-Host ""
if ($missing) { Warn "일부 사전 요구가 빠져 있습니다. 위 안내대로 설치 후 다시 실행하면 완전해집니다." }
Say "▶ 설치 완료. 다음 단계:"
@"
  1) 이 폴더를 Claude Code로 엽니다.
  2) 세션에서 브라우저가 열리면 lbox.kr에 직접 로그인합니다(도구는 자격증명을 저장하지 않습니다).
  3) 슬래시 커맨드 실행:  /research-cases
     · 인수 없이 실행하면 '설정 표'가 떠서, 값만 채워 그 블록째 다시 붙여넣으면 됩니다.
"@ | Write-Host
