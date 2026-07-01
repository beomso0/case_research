# 셋업 가이드

이 프로젝트는 코드 빌드가 없고, **MCP 서버 연결 + 브라우저 로그인**만 준비하면 바로 쓸 수 있다.

## 0. 사전 준비
- [Node.js](https://nodejs.org) 설치 (`node -v`, `npx -v` 확인). Playwright MCP가 `npx` 로 자동 설치된다.
- Claude Code 세션에서 이 폴더를 연다.

## 1. 브라우저(Playwright) MCP — 판례 수집용
- `.mcp.json` 에 이미 `playwright` 서버가 설정되어 있다. 최초 사용 시 `npx` 가 패키지를 받아온다.
- 세션에서 `/mcp` 를 입력해 `playwright` 가 **connected** 인지 확인한다.
- **로그인 영속화**: 기본적으로 영구 브라우저 프로필을 쓰므로, 한 번 로그인해 두면 세션이 유지된다. 프로필을 이 프로젝트 안에 고정하려면 `.mcp.json` 의 args 에 경로를 추가한다(쿠키가 저장되니 `.gitignore` 에 이미 제외됨):
  ```json
  "args": ["-y", "@playwright/mcp@latest", "--user-data-dir", "./.browser-profile"]
  ```
- **첫 로그인**: `/collect-cases` 로 수집을 시작하면 브라우저가 열린다. 로그인 페이지가 나오면 **사람이 직접** lbox.co.kr 계정으로 로그인한 뒤 진행한다. (에이전트는 자격증명을 입력하지 않는다.)

> 대안: Claude Code 내장 Chrome 연동(`/config chrome=true`)을 쓸 수도 있다. 다만 세분화된 자동 수집에는 Playwright MCP가 더 적합하다.

## 2. korea-law(한국 법령) MCP — 리서치용  ⚠️ 아직 미설정
사용자의 git repo로 공유된 법령 MCP를 연결해야 한다. 시작 시 오류가 나지 않도록 `.mcp.json` 에는 기본 포함하지 않았으니, 아래 중 하나로 추가한다.

**방법 A — CLI 한 줄 (권장):**
```bash
# 먼저 MCP repo를 원하는 곳에 클론
git clone <법령-MCP-저장소-URL> ~/mcp/korea-law

# Node 기반인 경우 예시:
claude mcp add korea-law -s project -- node ~/mcp/korea-law/dist/index.js
# Python 기반인 경우 예시:
claude mcp add korea-law -s project -- uv --directory ~/mcp/korea-law run server
```
`-s project` 로 추가하면 이 프로젝트의 `.mcp.json` 에 기록되어 팀과 공유된다.

**방법 B — `.mcp.json` 직접 편집:** `mcpServers` 에 항목 추가
```json
"korea-law": {
  "command": "node",
  "args": ["/절대경로/korea-law/dist/index.js"]
}
```
> 정확한 `command`/`args` 와 필요한 환경변수(API 키 등)는 해당 MCP repo의 README를 따른다. 키가 필요하면 `.env` 에 두고 커밋하지 않는다.

추가 후 `/mcp` 로 `korea-law` 가 connected 인지 확인한다.

## 3. 동작 확인
1. `/mcp` → `playwright`(필요 시 `korea-law`) connected 확인
2. `/collect-cases 손해배상 위자료 산정` → 로그인 후 판례가 `data/cases/` 에 쌓이는지 확인
3. `/research 위자료 산정 기준` → `data/research/` 에 메모 생성 확인

## 자주 쓰는 명령
- `/mcp` — MCP 서버 상태/인증 확인
- `claude mcp list` — 설치된 MCP 목록
- `claude mcp remove <이름>` — 제거
