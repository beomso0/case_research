#!/usr/bin/env bash
# lbox 판례 리서치 도구 — 설치 부트스트랩 (macOS / Linux)
#
# 사용(한 줄):
#   git clone https://github.com/beomso0/claude_test.git && cd claude_test && bash bootstrap.sh
#
# 이 저장소는 비공개(private)입니다. clone에는 저장소 접근 권한(소유자·협업자)과
# GitHub 인증(로그인 또는 SSH 키)이 필요할 수 있습니다.
set -uo pipefail

REPO_URL="https://github.com/beomso0/claude_test.git"
REPO_DIR="claude_test"

say()  { printf "\033[1;36m%s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$*"; }
err()  { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

say "▶ lbox 판례 리서치 도구 설치를 시작합니다."

# 0) 저장소 위치 확보 — repo 안에서 실행됐는지 확인, 아니면 클론 시도
if [ ! -f ".mcp.json" ] || [ ! -d ".claude" ]; then
  if command -v git >/dev/null 2>&1; then
    say "· 저장소를 클론합니다(비공개 repo이므로 GitHub 인증이 필요할 수 있습니다)…"
    if git clone "$REPO_URL" "$REPO_DIR"; then
      cd "$REPO_DIR" || { err "클론한 폴더로 이동하지 못했습니다."; exit 1; }
    else
      err "git clone 실패 — 저장소 접근 권한/인증을 확인해 주세요."
      exit 1
    fi
  else
    err "git이 없어 저장소를 가져올 수 없습니다. git 설치 후 다시 실행해 주세요."
    exit 1
  fi
fi
ok "저장소 루트: $(pwd)"

# 1) 사전 요구 확인 (없어도 중단하지 않고 안내)
MISSING=0
check() {
  if command -v "$1" >/dev/null 2>&1; then ok "$2 ($(command -v "$1"))"
  else warn "$2 없음 — $3"; MISSING=1; fi
}
say "· 사전 요구 확인"
check git  "Git"     "https://git-scm.com · brew install git"
check node "Node.js" "https://nodejs.org · brew install node  (Playwright MCP 실행에 필요)"
check npx  "npx"     "Node.js 설치 시 함께 제공됩니다"

if command -v python3 >/dev/null 2>&1; then PY=python3
elif command -v python >/dev/null 2>&1; then PY=python
else PY=""; fi
if [ -n "$PY" ]; then ok "Python ($($PY --version 2>&1))"
else warn "Python 3 없음 — https://python.org · brew install python"; MISSING=1; fi

# 2) 파이썬 의존성 설치 (docx 생성용 python-docx)
if [ -n "$PY" ] && [ -f "requirements.txt" ]; then
  say "· Python 의존성 설치 (python-docx)"
  if "$PY" -m pip install -r requirements.txt; then
    ok "requirements.txt 설치 완료"
  else
    warn "전역 설치 실패 — 사용자 설치(--user)로 재시도합니다."
    if "$PY" -m pip install --user -r requirements.txt; then
      ok "사용자 설치 완료"
    else
      err "pip 설치 실패 — 수동으로 '$PY -m pip install -r requirements.txt' 를 실행해 주세요."
    fi
  fi
fi

# 3) MCP 설정 확인
if [ -f ".mcp.json" ]; then
  ok ".mcp.json 감지 (Playwright MCP — 최초 실행 시 npx가 자동 설치)"
else
  warn ".mcp.json 이 없습니다 — 저장소가 온전한지 확인해 주세요."
fi

echo
[ "$MISSING" = "1" ] && warn "일부 사전 요구가 빠져 있습니다. 위 안내대로 설치 후 다시 실행하면 완전해집니다."
say "▶ 설치 완료. 다음 단계:"
cat <<'EOF'
  1) 이 폴더를 Claude Code로 엽니다.
  2) 세션에서 브라우저가 열리면 lbox.kr에 직접 로그인합니다(도구는 자격증명을 저장하지 않습니다).
  3) 슬래시 커맨드 실행:  /research-cases
     · 인수 없이 실행하면 '설정 표'가 떠서, 값만 채워 그 블록째 다시 붙여넣으면 됩니다.
EOF
