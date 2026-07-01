# 셋업 가이드

이 프로젝트는 코드 빌드가 없다. **① Python 의존성 설치 → ② 브라우저 MCP 연결 → ③ lbox 로그인** 이면 바로 쓸 수 있다.

## 0. 사전 준비
- **Node.js** ([nodejs.org](https://nodejs.org)) — `node -v`, `npx -v` 확인. Playwright MCP가 `npx` 로 자동 설치된다.
- **Python 3** + pip — `python --version` 확인. 최종 산출물(docx) 생성에 쓴다.
- Claude Code 세션에서 이 폴더를 연다.

## 1. Python 의존성 설치 (docx 생성용)
```bash
pip install -r requirements.txt
```
(`python-docx` 하나. 없으면 Phase3에서 최종 docx를 못 만든다.)

## 2. 브라우저(Playwright) MCP — 판례 수집용
- `.mcp.json` 에 `playwright` 서버가 설정되어 있다(영구 로그인 프로필 사용). 최초 사용 시 `npx` 가 패키지를 받아온다.
- 설정 형태(클론 후 이 형태인지 확인 — 아니면 아래로 교정):
  ```json
  {
    "mcpServers": {
      "playwright": {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest", "--user-data-dir", "./.browser-profile"]
      }
    }
  }
  ```
  `--user-data-dir ./.browser-profile` 덕분에 **한 번 로그인하면 세션이 프로필에 저장돼 재사용**된다(재로그인·본인인증 최소화). `.browser-profile/` 은 쿠키가 담기므로 `.gitignore` 에 이미 제외돼 있다.
- 세션에서 `/mcp` 를 입력해 `playwright` 가 **connected** 인지 확인한다.

## 3. lbox 로그인 (사람이 직접)
- `/research-cases <검색어>` 로 시작하면 브라우저가 열린다. 로그인 페이지가 나오면 **본인이 직접** lbox.kr 계정으로 로그인한 뒤 진행한다.
- 도구는 **자격증명을 입력·저장·추측하지 않는다.** 본인인증(휴대폰 인증번호) 팝업이 뜨면 멈추고 알린다 — 인증은 사람이 한다.

## 4. 동작 확인
1. `/mcp` → `playwright` connected 확인.
2. `/research-cases 준강간` 실행 → 시작 설정(사실관계·검색설정·상위N·유용성방향성)을 물으면 답한다 → 판례가 `data/cases/<슬러그>/` 에 쌓이고, 끝에 `output/<슬러그>_판례리서치_최종.docx` 가 생성되는지 확인.
   - 입력값·기본값·방식은 [README.md](../README.md) 참고.

## 자주 쓰는 명령
- `/mcp` — MCP 서버 상태/인증 확인
- `claude mcp list` — 설치된 MCP 목록
- `pip install -r requirements.txt` — Python 의존성(docx) 설치
