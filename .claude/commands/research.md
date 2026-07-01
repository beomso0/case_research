---
description: 주어진 법적 쟁점을 법령(korea-law MCP)과 수집된 판례로 조사해 data/research/ 에 검토 메모 작성
argument-hint: <조사할 법적 쟁점>
---

`legal-researcher` 서브에이전트를 실행해 다음 쟁점을 조사하라.

- 쟁점: $ARGUMENTS
- `korea-law` MCP(법령)와 `data/cases/`(수집 판례)를 함께 활용할 것.
- 관련 판례가 부족하면 `/collect-cases` 로 추가 수집이 필요하다고 사용자에게 제안할 것.
- 결과를 `data/research/` 에 구조화된 메모로 저장하고 핵심을 요약 보고할 것.
