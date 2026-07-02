# scripts/ — 판례 리서치 파이프라인 (case-researcher Phase2·3)

수백 건 규모의 판례를 **빠르게** 수집·분석·정리하기 위해 실전 검증된 스크립트/워크플로 모음. 정본 절차는 `.claude/agents/case-researcher.md`(§속도·효율 규칙, §Phase1~3). 여기는 그 구현.

## 핵심 원칙 (속도)
- **원문은 모델 토큰으로 읽지 않는다.** `browser_evaluate(()=>main.innerText, filename="data/cases/<슬러그>/raw/<사건번호>.md")` 로 파일에 바로 덤프.
- **수집(직렬, 단일 브라우저) ∥ 분석(오프라인 병렬 워크플로)** 을 겹쳐 돌린다. 메인 세션이 오케스트레이션(서브에이전트는 다른 에이전트를 스폰하지 않음).
- 목록 인지·페이지 넘김·필터는 `role=`/숫자버튼 셀렉터(§case-researcher 속도규칙).

## 파이프라인 순서
1. **Phase1 트리아지** → `data/cases/<슬러그>/_worklist.md` (부합 후보 인벤토리) → 후보 URL 매니페스트 `_manifest.json`(법원+사건번호로 `/case/` URL 구성).
2. **Phase2 수집(청크별, 직렬)**: 각 `/case/` 직접링크 → `browser_evaluate(filename=...)` 로 `raw/<사건번호>.md` 덤프.
3. **Phase2 분석(병렬)**: `analyze.workflow.js` — 아직 분석 안 된 raw를 자동 식별해 여러 에이전트가 나눠 정독 → `analysis/*.json`(부합/점수/발췌). 다음 청크 수집과 **동시** 실행. **모델 티어링**: 1차 분석=sonnet(물량·저비용) → **재심 밴드**(1차가 match=false로 제외했지만 score≥20인 경계 건)를 fable(이용 불가 시 opus 폴백)이 재정독해 뒤집힌 건만 `analysis/review_*.json`에 저장(놓침 방지 안전망). ⚠ 부합건 취합(`_candidates.json` 등) 시 **같은 file의 review 행이 pending 행보다 우선**한다.
4. **Phase3 정밀 재평가**: 전 부합건 상위 후보(예 60)만 `refine.workflow.js` 로 골드기준(유용성 방향성) 재채점 + 사실관계/설시 **bold 마커** → `refined/*.json`. **모델 = fable, 이용 불가 시 opus 자동 폴백**(`tieredAgent` 헬퍼 — 최종 랭킹·bold를 결정하는 판단 집약 단계, ~60건 소량이라 절감 실익 없음). **문체 = 사실관계·설시·비고를 '~음/~함' 개조식**으로 산출하되, **원문 직접 인용 문구는 큰따옴표("")로 감싸** 요약과 구분(큰따옴표 안은 원문 그대로).
5. **Phase3 docx**: `build_docx.py <슬러그> <상위N>` — 유용성순(부합도→확정→심급) 상위 N 최종본(판례번호 하이퍼링크 + bold) + 전체 백업본 + `_final_ranking.json`.

## 파일
- `build_docx.py` — docx 빌더(하이퍼링크·bold·유용성 정렬). `python scripts/build_docx.py <슬러그> [상위N]`
- `analyze.workflow.js` — 병렬 유사성 분석 워크플로 템플릿(상단 `SLUG`·`FACT` 교체).
- `refine.workflow.js` — 골드기준 정밀 재평가 워크플로 템플릿(상단 `SLUG`·`GOLD` 교체).

> 워크플로는 Claude Code Workflow 도구로 실행(메인 세션/에이전트). 새 리서치는 각 파일 상단 `SLUG`(리서치 슬러그)와 `FACT`/`GOLD`(사실관계·유용성 방향성) 상수만 교체하면 된다. **`MODEL_*` 상수는 모델 티어링 설계값이므로 교체 대상이 아니다**(분석=sonnet+fable 재심 / 재평가=fable — 근거는 `/research-cases` 커맨드의 [모델 배정] 절). 검증: 2026-07-02 오프라인 A/B — 준강간 리서치 기존 raw 표본 50건(부합 35·무관 15)을 sonnet으로 재판정한 결과 **놓침율(기존 부합→sonnet 무관) 0%**, 역방향(기존 무관→sonnet 부합) 10건은 전부 score 15~38의 저점수라 후보 컷(상위 60)·refine(fable) 재채점이 흡수. 참고: Sonnet 5 인트로 가격($2/$10 per MTok)은 2026-08-31 종료 예정.
