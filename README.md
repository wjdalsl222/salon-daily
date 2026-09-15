# 살롱 데일리 — 미용실 데일리 정산 프로그램

원장님이 하루 매출·정산 상태를 한눈에 확인하고, 매니저가 하루 정산을 1분 안에 작성하는
마감 보고 웹앱입니다. PC·Mac·스마트폰·태블릿 모두 지원(반응형).

- 기술: React + Vite + Tailwind / Node.js + Express / SQLite
- 저장소: 데이터는 SQLite 파일 1개(`data/salon.db`)에 저장 → 데이터 보관·백업이 매우 간단

---

## 1. 요구사항

- Node.js **20 이상** (직접 실행 방식)
- 또는 Docker + Docker Compose (권장)

---

## 2. 로컬에서 바로 실행 (Node)

```bash
# 1) 의존성 설치
npm install

# 2) 정산 데이터 생성 (최초 1회)
#    - 계정: owner/1234 (원장님), manager/1234 (매니저)
#    - 이번 달 과거 정산 예시 데이터(최초만)
node server/seed.js

# 3) 프론트엔드 빌드
npm run build

# 4) 서버 실행 → http://localhost:4000
npm start
```

> 이후 매번 실행은 `npm start` 하나면 충분합니다.
> 비밀번호를 `1234`로 되돌리려면 `node server/seed.js`를 다시 실행하세요.

---

## 3. Docker로 실행 (권장, 어디서나 동일)

```bash
# 이미지 빌드 + 컨테이너 시작 (백그라운드)
docker compose up -d --build

# 접속 → http://localhost:4000
# 데이터는 ./data 폴더에 저장 (컨테이너를 지워도 유지됨)
```

포트 변경: `docker-compose.yml`의 `"4000:4000"` 을 `"8080:4000"` 처럼 바꾸면 됩니다.

> Docker 최초 실행 시 시드 데이터가 자동 생성됩니다(계정 동일).

---

## 4. 실제 서버 / NAS에 배포

### 4-1. 시놀로지(Synology) NAS
1. **Container Manager**(구 Docker) 앱 설치
2. 프로젝트 폴더를 NAS 폴더에 올린 뒤 SSH 접속:
   ```bash
   cd /volume1/<프로젝트 경로>
   docker compose up -d --build
   ```
3. `http://<NAS IP>:4000` 으로 접속 → 모든 기기에서 사용 가능

### 4-2. 리눅스 VPS / 클라우드 서버 (우분투 예시)
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
cd ~/salon-daily
docker compose up -d --build
```
- 접속: `http://<서버IP>:4000`
- 외부에서도 열기 원하면 방화벽 4000 포트 개방 또는 역방향 프록시(Nginx/Caddy) 연결

### 4-3. 보안 체크리스트 (실사용 전 필수)
1. **비밀번호 변경**: owner/manager 모두 `1234` 말고 다른 비밀번호로 변경
   - 로그인 → `계정` 탭 → 비밀번호 변경
2. **(권장)** `src/App.jsx`에서 `?quick=` 빠른 로그인 데모 제거 후 재빌드
3. HTTPS 도메인 사용 시 원장님·매니저 모두 같은 주소로 접속

---

## 5. 데이터 백업 / 복원

데이터는 **파일 1개(`data/salon.db`)** 에 모두 들어 있습니다.

```bash
# 백업 (매일/주 1회 권장)
cp data/salon.db backup_$(date +%F).db

# 복원
# 서버를 멈춘 뒤 백업 파일을 data/salon.db 로 덮어쓰기
```

- Docker 사용 시: 백업 파일은 호스트의 `./data/` 폴더에 있음
- 백업 파일이 있으면 서버가 달라져도 그대로 복구됩니다.

---

## 6. 주요 기능 (7개 화면)

| 화면 | 설명 |
|---|---|
| 로그인 | 원장/매니저 구분 |
| 원장 대시보드 | 오늘 총매출·정산 상태 실시간 확인 + 월간 그래프·일별 상세 |
| 매니저 오늘 정산 | 6가지 결제수단 입력, 자동 저장, 현금 차액, 정산 완료, 휴무 |
| 과거 정산 조회 | 월 이동·상태 필터·상세 이동 |
| 정산 상세 | 결제수단별 내역 + 수정 기록 타임라인 |
| 매니저 계정 관리 | 원장이 매니저 비밀번호 재설정 |
| 계정 설정 | 비밀번호 변경 (원장·매니저 공통) |

---

## 7. 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `4000` | 서버 포트 |
| `DB_PATH` | `data/salon.db` | DB 파일 경로 (지정 시 그 경로에 저장) |

---

## 8. 트러블슈팅

- **포트 충돌 "EADDRINUSE"**: 다른 프로세스가 4000번을 점유 → `PORT=8080 npm start` 로 변경
- **계정 비밀번호 분실**: `node server/seed.js` 실행 → `1234`로 초기화 (권장: 초기화 후 바로 변경)
- **배포 후 화면이 바뀌지 않음**: `npm run build` 후 서버 재시작 필요 (프론트엔드 정적 파일이 `dist/`에 빌드됨)
