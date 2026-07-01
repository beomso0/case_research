# 법률 리서치·작성 도구 (Claude Code)

변호사 실무를 지원하는 Claude Code 워크플로 프로젝트. **판례 수집 → 법령·판례 리서치 → 서면 작성**을 전문 에이전트로 자동화한다.

## 빠른 시작
1. 셋업: [docs/setup.md](docs/setup.md) 를 따라 MCP를 연결한다.
   - 브라우저(Playwright) MCP — 판례 수집용 (기본 포함)
   - korea-law MCP — 법령 조회용 (사용자가 직접 연결)
2. `/mcp` 로 서버가 connected 인지 확인한다.
3. 사용:
   - `/collect-cases <검색어>` — 로그인 후 판례 수집 → `data/cases/`
   - `/research <쟁점>` — 법령+판례 검토 메모 → `data/research/`
   - "위 리서치로 의견서 초안 써줘" — 서면 초안 → `output/`

## 구조
| 경로 | 역할 |
|---|---|
| `.claude/agents/` | 수집·리서치·작성 전문 에이전트 |
| `.claude/commands/` | `/collect-cases`, `/research` |
| `data/` | 수집 판례·법령·리서치 메모 (git 제외) |
| `output/` | 서면 등 최종 산출물 (git 제외) |

자세한 동작 원리는 [CLAUDE.md](CLAUDE.md) 참고.

## 주의
- 판례 사이트 수집은 **본인 계정 로그인**이 필요하며, 로그인은 사람이 직접 한다.
- 수집 자료·산출물은 개인 자료이므로 git에 커밋되지 않도록 설정되어 있다.
- 생성된 서면은 **초안**이며 변호사의 검토·책임 하에 사용한다.
