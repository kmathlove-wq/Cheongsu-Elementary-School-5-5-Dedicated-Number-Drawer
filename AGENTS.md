# 청수초등학교 5-5반 전용 번호 뽑기 — AGENTS.md

## 프로젝트 개요
청수초등학교 5-5반 전용 번호 뽑기 웹앱.
GitHub Pages로 배포 중이며 커스텀 도메인은 `xn--ok0bu1tf0b2m58iioolb86qbx2c.kro.kr`.

## 파일 구조
```
/
├── index.html      # UI 마크업
├── main.js         # 전체 로직
├── style.css       # 스타일
├── logo.png        # 파비콘 및 로고
├── 사진/logo.png   # 보조 로고 이미지
├── CNAME           # 커스텀 도메인 설정
├── README.md
├── CLAUDE.md       # Claude용 프로젝트 지식
└── .github/workflows/deploy.yml  # GitHub Pages 자동 배포
```

## 번호 풀 규칙
- 기본 풀: 1~25번, 19번 제외 → 24개
- 선생님 포함 풀: `선생님` + 1~25번, 19번 제외 → 25개
- 번호와 `선생님` 값은 모두 문자열로 취급한다.

## 모드
| 모드 | 설명 |
|------|------|
| `basic` | 1~25번, 19 제외 랜덤 뽑기 |
| `teacher` | `선생님` 포함, 결과 정렬 시 맨 앞 |
| `teacher-mystery` | 선생님이 남아있으면 무조건 당첨에 포함 |
| `mystery` | 5번 당첨 시 `window.close()` 실행 |
| `pinball` | 캔버스 갈튼 보드 물리 시뮬레이션 |
| `pinball-teacher` | 핀볼 + 선생님 공 포함, 금색 렌더링 |

## 관리자 모드
- 일반 UI에는 표시하지 않는다.
- `Control` 키를 450ms 안에 빠르게 두 번 누르면 관리자 모드가 열린다.
- 비밀번호는 `1+1=1`.
- 관리자 모드에서는 기존 모든 모드의 항목을 추가, 삭제, 이름 변경할 수 있다.
- 이름 변경 입력값은 포커스 이동, 모드 전환, 닫기 시 자동 저장한다.
- 모드별 항목은 `localStorage`의 `cheongsu55ModePools`에 저장한다.
- 각 모드에는 최소 1개 항목이 필요하다.

## 주요 파일별 책임
- `index.html`: 모드 버튼, 뽑기 설정, 번호 표시, 결과 기록, 오버레이, 핀볼 캔버스.
- `main.js`: 번호 풀 생성, 모드 전환, 관리자 모드, 일반 뽑기, 핀볼 시뮬레이션, 효과음, 리셋.
- `style.css`: 카드/버튼/번호 셀/관리자 모달/오버레이/핀볼 모드 활성 스타일.
- `.github/workflows/deploy.yml`: `main` 브랜치 push 시 GitHub Pages 배포.

## main.js 주요 함수
| 함수 | 역할 |
|------|------|
| `getValidItems()` | 현재 모드에 맞는 번호 풀 반환 |
| `switchMode(mode)` | 모드 전환 후 리셋 |
| `drawNumbers()` | 일반 뽑기 실행, 핀볼 모드면 위임 |
| `drawNumbersPinball()` | 캔버스 기반 핀볼 시뮬레이션 |
| `resetDraw()` | 전체 초기화 및 핀볼 애니메이션 중단 |
| `playSound()` | 결과 발표 효과음 |
| `playBumperBeep()` | 핀볼 충돌 효과음 |
| `adjustFontSize(text)` | 결과 문자열 길이에 따른 폰트 크기 조정 |
| `terminateProgram()` | `mystery` 모드 5번 당첨 처리 |

## 핀볼 구현 메모
- 가상 월드는 화면 높이의 4배(`WORLD_H = H * 4`).
- 공은 500ms 간격으로 순차 활성화된다.
- 카메라는 기본적으로 가장 아래 활성 공을 따라가며, 미니맵 호버 중에는 호버 위치를 따른다.
- `pegs`, `bumpers`, `spinners`, `balls`, `winners`, `sonicBooms`가 핵심 상태다.
- 결승선(`PLAY_BOT`)을 통과한 순서대로 `winners`에 들어가고 목표 인원 달성 후 `finalize()`가 결과를 반영한다.
- 미니맵 상수는 `PLAY_BOT` 선언 이후에 둔다. TDZ 오류 방지를 위해 순서를 바꾸지 않는다.

## UI/스타일 메모
- CSS 변수: `--bg`, `--card`, `--accent`, `--text`, `--muted`, `--border`.
- `.number-cell.spark`는 금색 글로우, `.number-cell.picked`는 주황/빨강 그라데이션.
- `pinball` 활성 버튼은 다크 보라 네온, `pinball-teacher` 활성 버튼은 다크 네이비 + 금색 네온.
- `선생님` 셀과 공은 금색 계열로 구분한다.

## 작업 규칙
- 사용자 요청 없이 기존 변경사항을 되돌리지 않는다.
- 새로 알게 된 프로젝트 지식은 필요할 때 `AGENTS.md` 또는 `CLAUDE.md`에 반영한다.
- `AGENTS.md`와 `CLAUDE.md`는 각각 200줄을 넘기지 않는다. 수정 후 `wc -l AGENTS.md CLAUDE.md`로 확인한다.
- 코드나 문서를 수정한 뒤에는 사용자가 금지하지 않는 한 커밋하고 GitHub에 push한다.
- 커밋 메시지는 한/영 혼용 가능하며 변경 내용을 구체적으로 쓴다.

## 배포/인증 주의
- `main` 브랜치 push → GitHub Actions → GitHub Pages 자동 배포.
- GitHub push 인증은 PAT가 설정된 remote를 사용할 수 있다.
- PAT를 채팅이나 출력에 노출하지 않는다. 토큰이 보일 가능성이 있는 명령 출력은 공유하지 않는다.

## 향후 개선 아이디어
- 핀볼 모드 BGM 또는 다양한 효과음.
- 모바일 핀볼 당첨 순위 표시 레이아웃 개선.
