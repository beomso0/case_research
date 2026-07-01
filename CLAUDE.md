# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요
변호사 실무를 지원하는 **Claude Code 기반 법률 리서치·작성 도구**. 전통적 코드베이스가 아니라, `.claude/` 의 서브에이전트와 `.mcp.json` 의 MCP 서버로 구동되는 **워크플로 프로젝트**다. 별도의 빌드/린트/테스트 단계는 없다. 모든 산출물과 대화는 한국어로 한다.

## 핵심 데이터 흐름 (수집 → 리서치 → 작성)
여러 파일을 함께 봐야 이해되는 큰 그림. 메인 세션이 아래 3개 전문 에이전트를 슬래시 커맨드 또는 직접 지시로 오케스트레이션한다.

1. **수집(Collect)** — `case-collector` ([.claude/agents/case-collector.md](.claude/agents/case-collector.md))
   Playwright MCP로 브라우저를 구동해 lbox.co.kr 등 **로그인이 필요한** 판례 사이트에서 판례를 검색·수집 → `data/cases/{사건번호}.md` 저장. 일반 `WebFetch` 로는 접근 불가하므로 반드시 브라우저를 쓴다.
2. **리서치(Research)** — `legal-researcher` ([.claude/agents/legal-researcher.md](.claude/agents/legal-researcher.md))
   `korea-law` MCP(법령) + `data/cases/`(수집 판례)를 종합해 쟁점별 검토 메모 → `data/research/` 저장.
3. **작성(Write)** — `legal-writer` ([.claude/agents/legal-writer.md](.claude/agents/legal-writer.md))
   `data/research/` 의 메모를 근거로 의견서·준비서면·내부 메모 초안 → `output/` 저장.

슬래시 커맨드: `/collect-cases <검색어>` → 1단계, `/research <쟁점>` → 2단계.

## 디렉터리 규약
- `.claude/agents/` — 3개 전문 에이전트(역할·도구·출력 형식 정의)
- `.claude/commands/` — `/collect-cases`, `/research`
- `data/` — 작업 자료(`cases/` 수집 판례, `statutes/` 법령, `research/` 검토 메모). **gitignore 됨**: 개인 계정으로 받은 자료·저작물이라 커밋하지 않는다.
- `output/` — 최종 산출물. gitignore 됨.
- `.browser-profile/` — 브라우저 로그인 세션(생성 시). **절대 커밋 금지.**

## 셋업 / 자주 쓰는 명령
- MCP 상태·인증 확인: 세션에서 `/mcp` · 설치 목록: `claude mcp list`
- **Playwright MCP**는 `.mcp.json` 에 설정됨 — 최초 실행 시 `npx` 가 자동 설치, 로그인은 영구 프로필에 저장되어 재사용됨.
- **korea-law MCP는 아직 미설정.** 사용자의 git repo를 클론해 연결해야 하며, 설정 전에는 리서치 단계의 법령 조회가 동작하지 않는다. 절차: [docs/setup.md](docs/setup.md).

## 중요 제약
- **판례 사이트 수집은 로그인 필수.** `case-collector` 는 시작 시 로그인 상태를 먼저 확인하고, 로그인이 안 되어 있으면 **멈추고 사용자에게 직접 로그인을 요청**한다. 자격증명을 입력·저장·추측하지 않는다.
- **인용 정확성.** 법령 조문·사건번호·판시사항을 지어내지 않는다. 불확실하면 `〔확인 필요〕` 로 표시하고 출처를 남긴다. `legal-writer` 는 리서치 메모에 있는 근거만 인용한다.
- **수집 자료 취급.** 사용자 본인 계정의 권한 범위에서만 수집하고, 대상 사이트 이용약관을 준수하며, 요청 간격을 두어 과도한 부하를 피한다. 수집물은 외부에 커밋·공유하지 않는다.

## 현재 상태
초기 뼈대(scaffold) 단계. 코드 모듈은 아직 없고, 워크플로는 위 에이전트·MCP·커맨드로 구성된다. 기능은 사용자와 대화하며 점진적으로 확장한다.
