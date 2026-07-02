// 병렬 유사성 분석 워크플로 (case-researcher Phase2 분석 단계)
// 새 리서치: 아래 SLUG 와 FACT(대상 사실관계) 만 교체. MODEL_* 상수는 티어링 설계값 — 교체 대상 아님.
// 실행: Workflow 도구로 이 스크립트를 돌린다(메인 세션). raw 중 '아직 분석 안 된' 것을 자동 식별해 병렬 정독.
// 모델 티어링: 1차 분석=sonnet(물량·저비용) → 재심 밴드=fable(1차가 제외했지만 score>=20인 경계 건만 상위 모델이 재정독).
// 같은 file에 pending 행(match=false)과 review 행(match=true)이 공존하면 review 행이 우선한다(후속 취합 시 주의).
export const meta = {
  name: 'analyze-cases-pending',
  description: '아직 분석 안 된 raw 원문을 자동 식별해 유사성 분석(sonnet) 후 경계 건은 상위 모델로 재심(부합만 저장)',
  phases: [
    { title: 'Prep' },
    { title: 'Analyze', detail: '1차 분석 (sonnet)' },
    { title: 'Review', detail: '경계 건 재심 (fable)' },
  ],
}
function resolveLabel(a) {
  if (typeof a === 'string') { try { const o = JSON.parse(a); return (o && (o.label || o.run)) || a } catch (e) { return a } }
  if (a && typeof a === 'object') return a.label || a.run || 'run'
  return String(a || 'run')
}
const RUN = resolveLabel(args)
const SLUG = '결과'   // ← 교체: 리서치 슬러그
const DIR = 'data/cases/' + SLUG
const FACT = "대상 사실관계: (여기에 찾는 판례의 사실관계·쟁점을 1~3문장으로 기술)"   // ← 교체

const MODEL_ANALYZE = 'sonnet'        // 물량 단계 — 아래 재심 밴드가 놓침(false negative) 안전망
const MODEL_REVIEW = ['fable', 'opus'] // 경계 건 재판정(최종 게이트) — 1순위 fable, 이용 불가 시 opus 폴백
const REVIEW_MIN_SCORE = 20           // 1차 match=false && score>=이 값 → 재심 대상

// 모델 폴백: 목록의 앞 모델부터 시도, 그 모델이 죽으면(null) 다음 모델로. 전부 실패면 null.
// (fable이 이용 불가한 환경/계정에서 opus로 자동 대체하기 위한 헬퍼)
async function tieredAgent(prompt, opts, models) {
  const list = Array.isArray(models) ? models : [models]
  for (let i = 0; i < list.length; i++) {
    const r = await agent(prompt, { ...opts, model: list[i] })
    if (r != null) return r
    if (i + 1 < list.length) log(`${opts.label || 'agent'}: 모델 ${list[i]} 실패 → ${list[i + 1]} 폴백`)
  }
  return null
}

const SCHEMA = { type: 'object', properties: {
  analyzed: { type: 'number' }, matched: { type: 'number' },
  top: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, score: { type: 'number' }, match: { type: 'boolean' } }, required: ['file', 'score', 'match'] } },
}, required: ['analyzed', 'matched', 'top'] }
const FILES_SCHEMA = { type: 'object', properties: { files: { type: 'array', items: { type: 'string' } } }, required: ['files'] }

// 놓침 방지 지침(§2-2 Rubric의 false-positive 우호 원칙) — 1차·재심 프롬프트 공통
const FN_GUARD = "match=false(무관) 판정은 **명백히 무관할 때만** 한다(죄명·법조·행위태양·쟁점법리·사실요소 어디도 겹치지 않고 단순 동음이의 매칭이 명백한 경우). 애매하면 match=true로 남겨라 — 놓침(false negative)이 잘못 포함보다 나쁘다(잘못 포함은 후단 정밀 재평가가 거른다)."

phase('Prep')
const prep = await agent(
  `분석의 '아직 분석 안 된 원문(pending)' 목록을 만들어라.\n1) ${DIR}/raw/ 의 *.md basename 전부(Glob, .md 제거).\n2) ${DIR}/analysis/ 의 *.json 을 모두 Read해 각 rows의 file(없으면 casenum/판례번호, .md 제거)을 모아 '이미 분석된' 집합.\n3) pending = (1)-(2). {"files":[...]} 반환. 깨진 json은 건너뛴다.`,
  { schema: FILES_SCHEMA, phase: 'Prep', label: `pending:${RUN}` }
)
const files = (prep && prep.files) || []
log(`pending 분석 대상: ${files.length}건 (run ${RUN})`)
const B = 8, batches = []
for (let i = 0; i < files.length; i += B) batches.push(files.slice(i, i + B))

phase('Analyze')
const summaries = await parallel(batches.map((b, bi) => () =>
  agent(
    `${FACT}\n\n너는 판례를 정독해 위 대상 사실관계와의 유사성을 판정하는 법률 분석가다. ${FN_GUARD}\n아래 파일을 각각 ${DIR}/raw/<basename>.md 로 Read해(원문 그대로, 지어내기 금지) 분석하라:\n${JSON.stringify(b)}\n\n각 건: file(basename) / match(bool: 대상 사실관계에 부합?) / score(0~100 유사도) / 판례번호('법원 YYYY. M. D. 선고 사건번호 판결') / 유무죄('무죄' 또는 '일부유죄·일부무죄(유죄:…/무죄:…)') / 확정여부('상•하위 판결' 라벨 그대로) / 내용_무죄부분(부합 무죄 판시 핵심 발췌, 인용 2~5문장) / 내용_유죄부분(일부무죄면 유죄부분, 아니면 "") / 비고(활용 방향 1~2줄) / reason(1줄).\n결과 rows를 ${DIR}/analysis/pending_${RUN}_b${bi + 1}.json 에 Write({"run":"${RUN}","batch":${bi + 1},"rows":[...]}). 요약만 반환: {analyzed, matched, top:[{file,score,match}]}. raw 없으면 match=false score=0.`,
    { schema: SCHEMA, label: `analyze:${RUN}b${bi + 1}`, phase: 'Analyze', model: MODEL_ANALYZE }
  ).then(r => r || { analyzed: 0, matched: 0, top: [] })
))
const A = summaries.filter(Boolean).reduce((a, s) => a + (s.analyzed || 0), 0)
const M = summaries.filter(Boolean).reduce((a, s) => a + (s.matched || 0), 0)
log(`run ${RUN}: 1차 분석 ${A} · 부합 ${M}`)

// 재심 밴드: 1차(sonnet)가 제외했지만 score>=REVIEW_MIN_SCORE 인 경계 건을 상위 모델이 재정독
phase('Review')
const rev = await agent(
  `${DIR}/analysis/ 에서 파일명이 pending_${RUN}_b*.json 인 파일만 모두 Read해, rows 중 match가 false이고 score>=${REVIEW_MIN_SCORE} 인 행의 file(basename, .md 제거) 목록을 중복 없이 반환하라: {"files":[...]}. 깨진 json은 건너뛴다.`,
  { schema: FILES_SCHEMA, phase: 'Review', label: `review:list:${RUN}` }
)
const borderline = (rev && rev.files) || []
log(`재심(경계 건) 대상: ${borderline.length}건`)
let RA = 0, RM = 0
if (borderline.length) {
  const RB = 6, rbatches = []
  for (let i = 0; i < borderline.length; i += RB) rbatches.push(borderline.slice(i, i + RB))
  const rsum = await parallel(rbatches.map((b, bi) => () =>
    tieredAgent(
      `${FACT}\n\n너는 재심 법률가다. 1차 분석(하위 모델)이 '무관(match=false)'으로 제외했지만 유사도 점수가 0이 아니었던 경계 판례들이다. 선입견 없이 처음부터 다시 판정하라. ${FN_GUARD}\n아래 파일을 각각 ${DIR}/raw/<basename>.md 로 Read해(원문 그대로, 지어내기 금지) 분석하라:\n${JSON.stringify(b)}\n\n각 건 필드는 1차 분석과 동일: file / match / score / 판례번호 / 유무죄 / 확정여부 / 내용_무죄부분 / 내용_유죄부분 / 비고 / reason.\n**match=true로 뒤집힌 행만** rows에 담아 ${DIR}/analysis/review_${RUN}_b${bi + 1}.json 에 Write({"run":"${RUN}","review":true,"batch":${bi + 1},"rows":[...]}) — 전부 여전히 무관이면 rows는 빈 배열로 저장. 요약만 반환: {analyzed, matched, top:[{file,score,match}]}.`,
      { schema: SCHEMA, label: `review:${RUN}b${bi + 1}`, phase: 'Review' }, MODEL_REVIEW
    ).then(r => r || { analyzed: 0, matched: 0, top: [] })
  ))
  RA = rsum.filter(Boolean).reduce((a, s) => a + (s.analyzed || 0), 0)
  RM = rsum.filter(Boolean).reduce((a, s) => a + (s.matched || 0), 0)
  log(`재심 완료: ${RA}건 중 ${RM}건 부합으로 정정(구제)`)
}
return { run: RUN, analyzed: A, matched: M, reviewed: RA, rescued: RM }
