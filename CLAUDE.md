# 청수초등학교 5-5반 전용 번호 뽑기 — CLAUDE.md

## 프로젝트 개요
청수초등학교 5-5반 전용 번호 뽑기 웹앱.
GitHub Pages로 배포 중. 커스텀 도메인: `xn--ok0bu1tf0b2m58iioolb86qbx2c.kro.kr`

---

## 파일 구조
```
/
├── index.html      # UI 마크업
├── main.js         # 전체 로직 (구 Java.js에서 이름 변경됨)
├── style.css       # 스타일
├── logo.png        # 파비콘 및 로고
├── CNAME           # 커스텀 도메인 설정
└── .github/workflows/deploy.yml  # GitHub Pages 자동 배포
```

> **주의:** 깃 히스토리에는 `Java.js`로 추적되다가 `main.js`로 로컬에서 이름이 바뀐 이력이 있음.  
> `index.html`의 스크립트 태그는 현재 `<script src="main.js">` 로 올바르게 수정되어 있음.

---

## 번호 풀 규칙
- 기본 풀: 1~25번, **19번 제외** → 24개
- 선생님 모드: `선생님` + 1~25번, 19번 제외 → 25개
- 각 번호는 **문자열**로 통일 (`"1"`, `"선생님"` 등)

---

## 모드 시스템 (6가지)

### 기본 (basic)
- 1~25번 (19 제외) 중 랜덤 뽑기
- 스파크 애니메이션 후 결과 표시

### 선생님 (teacher)
- `선생님` 항목 포함. 결과 정렬 시 선생님이 항상 맨 앞

### 선생님(?) (teacher-mystery)
- 선생님 모드와 동일한 번호 풀 (선생님 + 1~25, 19 제외)
- **선생님이 남아있으면 무조건 당첨**에 포함됨
- 선생님이 이미 뽑혔으면 일반 랜덤 뽑기로 동작

### ??? (mystery)
- 기본과 동일하나 **5번이 뽑히면 `window.close()` 실행** (장난 모드)

### 핀볼 (pinball)
- **갈튼 보드 / 파친코 스타일** 룰렛
- 남은 번호 전체가 공이 되어 상단에서 500ms 간격으로 순차 활성화
- 대각선 핀(neon cyan 바) **4열 × 14행** + **원형 범퍼 5개**를 튕기며 낙하
- **가상 월드(화면 4배 높이)** 위를 공이 낙하하며 카메라가 자동 스크롤
- **먼저 하단 결승선을 통과한 N개**가 당첨 (N = 인원수 설정값)
- HUD에 `현재당첨수 / 목표수` 실시간 표시, 우측에 당첨 순위 목록

### 핀볼(선생님) (pinball-teacher)
- 핀볼 모드와 동일하나 **선생님 공 포함** (번호 풀: 선생님 + 1~25, 19 제외)
- 선생님 공 특별 렌더링: 금색(`#ffe066`) + 흰 테두리 + 강한 금색 글로우
- 공 크기는 다른 공과 동일 (`BALL_R`)

---

## 주요 함수 (main.js)

| 함수 | 역할 |
|------|------|
| `getValidItems()` | 현재 모드에 맞는 번호 풀 반환 |
| `switchMode(mode)` | 모드 전환 + 리셋 |
| `drawNumbers()` | 뽑기 실행 (핀볼 모드면 `drawNumbersPinball()` 위임) |
| `drawNumbersPinball()` | 캔버스 기반 갈튼 보드 물리 시뮬레이션 |
| `resetDraw()` | 전체 초기화 (핀볼 애니메이션도 중단) |
| `playSound()` | 결과 발표 효과음 (Google OGG) |
| `playBumperBeep()` | 핀/범퍼 충돌 효과음 (Web Audio API) |
| `adjustFontSize(text)` | 글자 수에 따라 폰트 크기 자동 조절 |
| `terminateProgram()` | ??? 모드 5번 당첨 시 창 닫기 |

---

## 핀볼 모드 물리 엔진 구조

```
WORLD_H = H * 4      화면 4배 높이의 가상 월드
cameraY              카메라 Y 오프셋 (가장 아래 공을 부드럽게 추적)

balls[]              각 번호당 1개 공, 500ms 간격으로 순차 활성화
                     초기 x 위치: PLAY_W의 ±35% 범위에서 랜덤 분산
                     isTeacher 플래그: 선생님 공 여부 (금색 특별 렌더링)

pegs[]               4열 × 14행 대각선 캡슐 (홀짝 행 각도 교차)
                     간격: ~108px (공 직경의 3배) — 공이 자유롭게 통과
hitPeg(ball, peg)    선분-원 캡슐 충돌 (법선 반사, 반발계수 0.6)

bumpers[]            원형 범퍼 5개 (WORLD_H 기반 위치 배치)
                     빨강 ×2 (상단), 노랑 ×1 (중앙 대형), 청록 ×2 (하단)
hitBumper(ball, bumper)  원-원 충돌 (반발계수 0.85, 핀보다 강하게 튕김)

hitBall(a, b)        공끼리 충돌 (운동량 교환, 반발계수 0.45)
winners[]            결승선(PLAY_BOT) 통과 순서대로 push됨
finalize()           count개 당첨 후 1.6초 뒤 결과 표시
```

**핀볼 주요 수치:**
- 중력: `0.28` / 최대 속도: `14` / 릴리즈 간격: `500ms` / 타임아웃 없음
- 플레이 영역: `PLAY_W = min(W*0.62, 720px)` / 결승선: `WORLD_H * 0.95`
- 핀 길이: `PLAY_W / 10` / 범퍼 반지름: `max(16, PLAY_W/22)`

**전역 핀볼 상태 변수:**
- `pinballRafId` — 현재 requestAnimationFrame ID
- `stopPinball` — true 시 루프 즉시 중단 (resetDraw에서 사용)
- `_pinballAudioCtx` — Web Audio Context 재사용

---

## 핀볼 drawScene() 렌더링 구조

```
drawScene()
  ctx.fillRect(0,0,W,H)           배경 (화면 좌표)
  ctx.save()
  ctx.translate(0, -cameraY)      세계 좌표 시작
    strokeRect(경계선)
    결승선 (노란 점선)
    pegs 렌더링 (시안 네온)
    bumpers 렌더링 (컬러 네온 링 + 십자)
    balls 렌더링 (컬러 원 + 번호 텍스트)
  ctx.restore()                   세계 좌표 종료
  HUD 렌더링 (화면 좌표)
    카운터: "당첨수 / 목표수"
    당첨 순위 목록: #1, #2, ...
```

---

## UI 구조 (index.html)

```
.container
  h1 제목
  .mode-selector       기본 | 선생님 | 선생님(?) | ??? | 핀볼
  .card
    #drawSettings      인원수 선택 (모든 모드에서 표시, 핀볼도 적용됨)
    #numberDisplay     결과 표시 영역
    #numberGrid        번호 그리드 (5열)
    #drawButton        번호 뽑기
    #resetButton       다시 시작
  .history-card
    #pickedNumbers     뽑힌 번호 기록

.big-overlay#bigOverlay   결과 전체화면 오버레이 (클릭으로 닫힘)
.pinball-overlay#pinballOverlay  핀볼 캔버스 오버레이
  canvas#pinballCanvas
```

---

## 스타일 주요 포인트 (style.css)
- CSS 변수: `--bg`, `--card`, `--accent(#5a5cff)`, `--text`, `--muted`, `--border`
- `.number-cell.spark` — 금색 글로우 (뽑기 애니메이션 중)
- `.number-cell.picked` — 주황/빨강 그라데이션 (뽑힌 번호)
- `.number-cell.teacher-cell` — 금/노랑 (선생님 항목)
- `.mode-btn[data-mode="pinball"].active` — 다크 보라 네온
- `.mode-btn[data-mode="pinball-teacher"].active` — 다크 네이비 + 금색 네온
- `.pinball-overlay.show` — `display: block` 으로 캔버스 표시

---

## GitHub 배포
- `main` 브랜치 push → GitHub Actions → GitHub Pages 자동 배포
- **GitHub push 인증:** PAT(Personal Access Token)를 remote URL에 직접 삽입해서 사용
  ```
  git remote set-url origin https://kmathlove-wq:<PAT>@github.com/kmathlove-wq/Cheongsu-Elementary-School-5-5-Dedicated-Number-Drawer.git
  ```
- ⚠️ Codespace 기본 `GITHUB_TOKEN`(`ghu_...`)은 이 레포에 push 권한 없음 → 반드시 PAT 사용
- ⚠️ PAT를 채팅에 붙여넣으면 GitHub 자동 보안이 토큰을 취소함 → 터미널에서 직접 입력 권장

---

## 작업 규칙 (유저 지시사항)
- **코드 수정 후 항상 GitHub push** (유저가 명시적으로 금지하지 않는 한)
- 커밋 메시지는 한/영 혼용 가능, 변경 내용을 구체적으로 작성

---

## 향후 개선 아이디어 (미구현)
- 핀볼 모드 BGM / 더 다양한 효과음
- 모바일에서 핀볼 당첨 순위 표시 레이아웃 개선
- 핀볼 결승선 도달 시 공이 쌓이는 이펙트

---

## 절약 규칙
- 이미 읽은 파일은 다시 확인하지 않는다
- 불필요한 도구 호출은 하지 않는다
- 가능한 도구 호출은 동시에 실행한다
- 20줄 이상의 불필요한 출력은 서브에이전트에 위임한다
- 사용자가 이미 설명한 내용을 다시 반복하지 않는다