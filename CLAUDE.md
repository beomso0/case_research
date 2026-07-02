# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요
lbox.kr(로그인 필요·유료 판례 DB)에서 특정 쟁점의 판례를 **대량 수집 → 병렬 분석 → 유용성 순위 정리(Word docx)** 하는 Claude Code 워크플로 도구. 전통적 코드베이스가 아니라 `.claude/` 의 서브에이전트·커맨드와 `.mcp.json` 의 MCP 서버로 구동된다. 빌드/린트/테스트 단계는 없다(docx 생성에 python-docx만 사용). **모든 산출물·대화는 한국어.**

핵심은 **에이전트 하나 + 커맨드 하나**다:
- **에이전트**: `case-researcher` ([.claude/agents/case-researcher.md](.claude/agents/case-researcher.md)) — 이 도구의 정본(SSOT). 구동 규칙·UI·포맷이 전부 여기에 있다.
- **커맨드**: `/research-cases` ([.claude/commands/research-cases.md](.claude/commands/research-cases.md)) — 메인 세션이 시작 설정을 확정하고 case-researcher를 오케스트레이션.

## 핵심 흐름 (Phase 1 → 2 → 3)
메인 세션이 시작 시 입력(키워드·사실관계·검색설정·**상위 N·유용성 방향성**)을 확정한 뒤 case-researcher를 돌린다.
1. **Phase1 트리아지** — 검색결과를 끝까지·모든 심급 캡처해 부합 후보 인벤토리(`data/cases/{슬러그}/_worklist.md`). false-positive 우호(조금이라도 관련이면 통과/보류).
2. **Phase2 수집·분석** — 각 판례 `/case/{법원}/{사건번호}` 직접링크 → `browser_evaluate(filename=…raw/{사건번호}.md)` 로 **원문 파일 덤프**(모델 토큰 0). 저장된 원문을 **오프라인 병렬 워크플로**로 정독·유사성 판정. **수집(직렬)과 분석(병렬)을 겹쳐** 돌린다.
3. **Phase3 최종 docx** — 부합건 중 **유용성 방향성으로 정밀 재평가** → 상위 N을 `.claude/style_case_research.docx` 템플릿 표로. **유용성순 정렬(방향성 부합도→확정→심급), 판례번호 lbox 하이퍼링크, 사실관계·설시 bold.** 선별된 상위 N건은 **상급심 확정내용 검증**(§3-2b)을 거친다 — "사건 확정" ≠ "인용할 판시의 확정"이므로, 인용부가 상급심서 파기·변경 없이 그대로 확정됐는지 상급심 원문으로 확인해 확정여부·정렬에 반영(파기·변경 시 강등·교체·제외). → `output/{슬러그}_판례리서치_최종.docx`.

## 핵심 운영 규칙 (속도·안정 — 실전 검증, SSOT=에이전트 정의)
- **원문은 모델 토큰으로 읽지 않는다**: 목록 카드·전문 인지는 `browser_evaluate` 읽기, 원문은 `filename=` 로 파일에 바로 덤프.
- **반복·재렌더 요소는 `role=`/텍스트 셀렉터로**(고정 ref 재사용·재시도 루프 금지). **페이지 넘김은 숫자버튼**(‘다음으로 이동’은 +5 그룹점프이므로 창 넘기기 전용 — 안 지키면 페이지 건너뜀).
- **단일 브라우저 = 단일 에이전트**: 서브에이전트는 다른 에이전트를 스폰하지 않는다. 병렬(수집∥분석)은 **메인 세션**이 워크플로/에이전트를 동시에 띄워 오케스트레이션한다.
- **상세 URL 패턴**: `/case/{법원(공백제거)}/{사건번호}`(검증됨). 카드 클릭은 인페이지 우측 패널(주소창 불변). 페이싱·차단회피 정본: [docs/lbox-pacing-and-verification.md](docs/lbox-pacing-and-verification.md).
- 파이프라인 스크립트(분석 워크플로·docx 빌더): [scripts/](scripts/).

## 디렉터리 규약
- `.claude/agents/case-researcher.md` — 유일한 에이전트(정본).
- `.claude/commands/research-cases.md` — `/research-cases` 커맨드.
- `.claude/style_case_research.docx` — 최종 docx **템플릿**(표 스타일 정본; 커밋됨).
- `scripts/` — 분석 워크플로·docx 빌더(재사용 템플릿; 커밋됨). requirements: python-docx.
- `data/` — 작업 자료(`cases/{슬러그}/raw`·`analysis`·`refined`·`_worklist.md` 등). **gitignore**: 개인 계정 수집물·저작물이라 커밋 금지.
- `output/` — 최종 docx. **gitignore.**
- `.browser-profile/` — 브라우저 로그인 세션. **절대 커밋 금지**(gitignore).

## 셋업 / 자주 쓰는 명령
- MCP 상태: 세션에서 `/mcp` · 설치 목록: `claude mcp list`. 상세: [docs/setup.md](docs/setup.md).
- **Playwright MCP**(`.mcp.json`) — 최초 실행 시 `npx` 자동 설치. 영구 프로필(`--user-data-dir ./.browser-profile`)로 로그인 재사용.
- **python-docx** — Phase3 docx 생성용. `pip install -r requirements.txt`.

## 중요 제약
- **로그인은 사람만.** case-researcher는 시작 시 로그인 상태를 확인하고, 안 돼 있으면 **멈추고 사용자에게 직접 로그인 요청**. **자격증명을 입력·저장·추측하지 않는다.** 본인인증 팝업 시 멈추고 보고.
- **인용 정확성.** 사건번호·법조문·판시·확정여부는 화면 문자열만 기록(지어내기 금지). 불확실하면 `〔확인 필요〕` + 출처. docx 표는 원문 발췌에서만 만든다.
- **완전성 한계 명시.** 빠른탐색(상위 N페이지)·정렬=관련도순으로 일부만 볼 땐 "누락 0 보장 불가"를 보고. 전수는 완전성 모드 + 결정적 정렬.
- **약관 준수·본인 계정 범위.** 요청 간격을 두고, 차단 징후(캡차/403/본인인증) 시 즉시 중단·보고. 수집물은 외부에 커밋·공유 안 함.

## 현재 상태
`case-researcher` + `/research-cases` 파이프라인이 실제 리서치(준강간 무죄 하급심 328건 수집·분석 → 상위 30 docx)로 검증됨. 기능은 사용자와 대화하며 확장한다.
