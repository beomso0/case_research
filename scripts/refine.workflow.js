// 골드기준 정밀 재평가 워크플로 (case-researcher Phase3 전단계)
// 후보풀(_candidates.json)을 '유용성 방향성(GOLD)'으로 재채점 + 사실관계/설시 bold 마커 산출 → refined/*.json
// 새 리서치: 아래 SLUG 와 GOLD 만 교체. MODEL_REFINE 은 티어링 설계값 — 교체 대상 아님.
// (이 단계는 최종 랭킹·bold를 결정하는 판단 집약 단계 + 물량이 적어(~60건) 절감 실익이 없으므로,
//  세션 모델과 무관하게 상위 모델로 명시 고정한다.)
export const meta = {
  name: 'refine-top-candidates',
  description: '부합 후보를 유용성 방향성(골드기준)으로 정밀 재평가(유용성 점수 + 사실관계/설시 bold 마킹)',
  phases: [{ title: 'Prep' }, { title: 'Refine' }],
}
const SLUG = '결과'   // ← 교체
const DIR = 'data/cases/' + SLUG
const MODEL_REFINE = ['fable', 'opus']   // 최종 선별 품질 고정 — 1순위 fable, 이용 불가 시 opus 폴백 (하향 금지)

// 모델 폴백: 목록의 앞 모델부터 시도, 그 모델이 죽으면(null) 다음 모델로. 전부 실패면 null.
async function tieredAgent(prompt, opts, models) {
  const list = Array.isArray(models) ? models : [models]
  for (let i = 0; i < list.length; i++) {
    const r = await agent(prompt, { ...opts, model: list[i] })
    if (r != null) return r
    if (i + 1 < list.length) log(`${opts.label || 'agent'}: 모델 ${list[i]} 실패 → ${list[i + 1]} 폴백`)
  }
  return null
}
const GOLD = "유용성 방향성(가장 유용한 판례의 조건을 구체적으로 기술). 예: 피고인에게 다른 불리한 정황이 있음에도, 여러 정황을 근거로 법원이 특정 요건을 인정할 수 없다고 설시하여 무죄로 본 판례일수록 유용하다."   // ← 교체

const SCHEMA = { type: 'object', properties: {
  analyzed: { type: 'number' },
  top: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, fit: { type: 'number' } }, required: ['file', 'fit'] } },
}, required: ['analyzed', 'top'] }

phase('Prep')
const prep = await agent(
  `${DIR}/_candidates.json 을 Read해서 각 항목 file(basename) 배열만 반환: {"files":[...]}`,
  { schema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string' } } }, required: ['files'] }, phase: 'Prep', label: 'refine:list' }
)
const files = (prep && prep.files) || []
log(`정밀 재평가 대상: ${files.length}건`)
const B = 6, batches = []
for (let i = 0; i < files.length; i += B) batches.push(files.slice(i, i + B))

phase('Refine')
const STYLE = "문체·인용 표기(최종 docx 산출용, 둘 다 준수):\n(1) 개조식: 사실관계·설시·비고의 서술문은 **'~음/~함' 개조식 종결**로 쓴다(예: \"…라고 판단하였음\", \"…을 인정하지 아니하였음\", \"…라고 설시함\"). '~하였다/~이다/~한다' 등 평서형 종결 금지.\n(2) 직접 인용 표기: 판결 원문에서 **글자 그대로 옮긴 문구는 반드시 큰따옴표(\"…\")로 감싼다**(피해자·피고인·법원이 쓴 표현을 그대로 인용한 부분). 큰따옴표 안의 문구는 **원문 그대로** 두고 개조식으로 바꾸지 않는다 — 개조식은 큰따옴표 밖의 요약·서술에만 적용한다. 이렇게 해서 '원문 직접 인용'과 '요약 서술'이 시각적으로 구분되게 한다."
const summaries = await parallel(batches.map((b, bi) => () =>
  tieredAgent(
    `${GOLD}\n\n${STYLE}\n\n너는 위 유용성 방향성으로 판례의 '유용성'을 정밀 평가하는 법률가다. 아래 파일을 각각 ${DIR}/raw/<basename>.md 로 Read해(원문 그대로) 분석하라:\n${JSON.stringify(b)}\n\n각 건: file / 판례번호('법원 YYYY. M. D. 선고 사건번호 판결') / court('대법원'→"대법", '고등법원'→"고법", 그 외→"지법") / 확정여부('상•하위 판결' 라벨 그대로) / 유무죄 / fit(0~100: 위 유용성 방향성에 얼마나 정확히 부합하는가) / 사실관계(주요 사실 2~4문장, **위 문체 규칙 적용**; **핵심 사실만 \`**...**\` bold**) / 설시(법원의 특징적 판단 2~4문장 발췌, **위 문체 규칙 적용**; **특징적 판단문만 \`**...**\` bold**, '증명 부족/무죄로 한다' 같은 전형 문구는 bold 금지) / 비고(활용 방향 1~2줄, **위 문체 규칙 적용**) / reason(1줄).\n결과 rows를 ${DIR}/refined/refined_b${bi + 1}.json 에 Write({"batch":${bi + 1},"rows":[...]}). 요약만 반환: {analyzed, top:[{file,fit}]}. raw 없으면 fit=0.`,
    { schema: SCHEMA, label: `refine:b${bi + 1}`, phase: 'Refine' }, MODEL_REFINE
  ).then(r => r || { analyzed: 0, top: [] })
))
const A = summaries.filter(Boolean).reduce((a, s) => a + (s.analyzed || 0), 0)
log(`정밀 재평가 완료: ${A}건`)
return { analyzed: A }
