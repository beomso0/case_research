// 병렬 유사성 분석 워크플로 (case-researcher Phase2 분석 단계)
// 새 리서치: 아래 SLUG 와 FACT(대상 사실관계) 만 교체.
// 실행: Workflow 도구로 이 스크립트를 돌린다(메인 세션). raw 중 '아직 분석 안 된' 것을 자동 식별해 병렬 정독.
export const meta = {
  name: 'analyze-cases-pending',
  description: '아직 분석 안 된 raw 원문을 자동 식별해 대상 사실관계와의 유사성 분석(부합만 저장)',
  phases: [{ title: 'Prep' }, { title: 'Analyze' }],
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

const SCHEMA = { type: 'object', properties: {
  analyzed: { type: 'number' }, matched: { type: 'number' },
  top: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, score: { type: 'number' }, match: { type: 'boolean' } }, required: ['file', 'score', 'match'] } },
}, required: ['analyzed', 'matched', 'top'] }

phase('Prep')
const prep = await agent(
  `분석의 '아직 분석 안 된 원문(pending)' 목록을 만들어라.\n1) ${DIR}/raw/ 의 *.md basename 전부(Glob, .md 제거).\n2) ${DIR}/analysis/ 의 *.json 을 모두 Read해 각 rows의 file(없으면 casenum/판례번호, .md 제거)을 모아 '이미 분석된' 집합.\n3) pending = (1)-(2). {"files":[...]} 반환. 깨진 json은 건너뛴다.`,
  { schema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string' } } }, required: ['files'] }, phase: 'Prep', label: `pending:${RUN}` }
)
const files = (prep && prep.files) || []
log(`pending 분석 대상: ${files.length}건 (run ${RUN})`)
const B = 8, batches = []
for (let i = 0; i < files.length; i += B) batches.push(files.slice(i, i + B))

phase('Analyze')
const summaries = await parallel(batches.map((b, bi) => () =>
  agent(
    `${FACT}\n\n너는 판례를 정독해 위 대상 사실관계와의 유사성을 판정하는 법률 분석가다. 아래 파일을 각각 ${DIR}/raw/<basename>.md 로 Read해(원문 그대로, 지어내기 금지) 분석하라:\n${JSON.stringify(b)}\n\n각 건: file(basename) / match(bool: 대상 사실관계에 부합?) / score(0~100 유사도) / 판례번호('법원 YYYY. M. D. 선고 사건번호 판결') / 유무죄('무죄' 또는 '일부유죄·일부무죄(유죄:…/무죄:…)') / 확정여부('상•하위 판결' 라벨 그대로) / 내용_무죄부분(부합 무죄 판시 핵심 발췌, 인용 2~5문장) / 내용_유죄부분(일부무죄면 유죄부분, 아니면 "") / 비고(활용 방향 1~2줄) / reason(1줄).\n결과 rows를 ${DIR}/analysis/pending_${RUN}_b${bi + 1}.json 에 Write({"run":"${RUN}","batch":${bi + 1},"rows":[...]}). 요약만 반환: {analyzed, matched, top:[{file,score,match}]}. raw 없으면 match=false score=0.`,
    { schema: SCHEMA, label: `analyze:${RUN}b${bi + 1}`, phase: 'Analyze' }
  ).then(r => r || { analyzed: 0, matched: 0, top: [] })
))
const A = summaries.filter(Boolean).reduce((a, s) => a + (s.analyzed || 0), 0)
const M = summaries.filter(Boolean).reduce((a, s) => a + (s.matched || 0), 0)
log(`run ${RUN}: 분석 ${A} · 부합 ${M}`)
return { run: RUN, analyzed: A, matched: M }
