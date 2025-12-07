# 🗺️ MyMiniMap (마이미니맵)

> **"익숙한 동네를 3D 장난감 세상으로."**  
> Google Maps + Gemini Imagen으로 스트리트뷰를 아이소메트릭 미니어처로 재구성하는 웹앱.

![Project Status](https://img.shields.io/badge/Status-Development-blue) ![Stack](https://img.shields.io/badge/Stack-TanStack-orange)

## ✨ 주요 기능

- **📍 지도 & 스트리트뷰 싱크**
  - `@vis.gl/react-google-maps`로 지도·스트리트뷰를 동시에 제어
  - Places Autocomplete 검색, 지도 이동만으로 좌표 반영
  - URL 파라미터(`lat`,`lng`,`heading`,`pitch`,`fov`)가 **단일 진실원천**: 이동/회전 시 즉시 반영, 공유·새로고침 시 뷰 복원

- **🎨 AI 미니어처 생성**
  - 서버 함수(`createServerFn`)에서 Street View Static 캡처 → Reverse Geocoding → Gemini Imagen 호출
  - 5~10초 스피너/스켈레톤 UX, 실패 시 메시지 노출

- **💾 내 라이브러리**
  - Clerk Google OAuth
  - Convex DB에 이미지 URL·위치명·좌표·각도·프롬프트·모드 저장
  - 최신순 그리드, 카드에서 홈 뷰 복원 링크 제공

- **🧭 프로필**
  - 닉네임/공개 여부 설정, 아바타 업로드(Convex Storage)

## 🛠️ 기술 스택

| 분류 | 기술 | 비고 |
| --- | --- | --- |
| Framework | TanStack Start (React, SSR, Nitro) | |
| Routing/State | TanStack Router (`createFileRoute`, `validateSearch`) | URL 파라미터 기반 상태 |
| Data | TanStack Query | |
| Backend/DB | Convex | 실시간 DB, mutations/queries |
| Auth | Clerk | Google OAuth |
| Maps | Google Maps JS, Street View Static, Places | `@vis.gl/react-google-maps` |
| AI | Google Gemini (Imagen via `@google/genai`) | 서버 전용 키 |
| UI | Tailwind CSS v4, shadcn/ui, Lucide | |
| Deploy | Vercel + Nitro | |

## 📂 주요 구조

- `src/routes/` — 파일 기반 라우트 (`/`, `/library`, `/me`, `__root`)
- `src/server/` — 서버 함수 (`generate.ts` 등)
- `src/components/` — Header, ResultModal, ProfileBadge 등 UI
- `convex/` — Convex 함수 & 스키마 정의

## 🗄️ Convex 스키마 (요약)

- `miniatures`: `locationName`, `lat`, `lng`, `heading`, `pitch`, `fov`, `imageUrl`, `prompt`, `mode`  
  인덱스: `by_pose (lat,lng,heading,pitch,fov)`
- `userMiniatures`: `userId`, `miniatureId`  
  인덱스: `by_user`, `by_miniature`, `by_user_miniature`
- `userProfiles`: `userId`, `nickname`, `nicknameNormalized`, `isPublic`, `avatar`  
  인덱스: `by_user`, `by_nickname_norm`

## 🧭 라우트 & UX 플로우

- `/` (Home): 지도·스트리트뷰 동기화, URL 파라미터 저장, Gemini 생성 & 결과 모달
- `/library`: 내 저장본 그리드, 카드에서 홈 뷰 복원 링크
- `/me`: 프로필/닉네임/아바타 관리 (로그인 필요)

## 🏗️ 아키텍처

```mermaid
graph TD
    User[사용자] -->|검색 & 앵글 조절| Client[클라이언트 (TanStack Router)]
    Client -->|URL 파라미터 동기화| Client
    User -->|생성 요청| ServerFn[서버 함수 (TanStack Start)]

    subgraph "Server Side"
        ServerFn -->|1. 이미지 캡처| StaticAPI[Google Street View Static API]
        ServerFn -->|2. 장소명 추출| GeoAPI[Google Geocoding API]
        ServerFn -->|3. 프롬프트 + 이미지| Gemini[Google Gemini Imagen]
    end

    Gemini -->|base64 이미지| ServerFn
    ServerFn -->|결과 반환| Client

    Client -->|저장 요청| Convex[Convex DB]
    Convex -->|유저 인증| Clerk[Clerk Auth]
```

## ⚙️ 로컬 개발

### 1) 사전 준비
- Node 22+ / pnpm
- Google Cloud: Maps JS, Street View Static, Places API
- Google AI Studio: Gemini Imagen
- Clerk 프로젝트, Convex 프로젝트

### 2) 환경 변수 (.env.local)

```bash
VITE_GOOGLE_MAPS_API_KEY=YOUR_MAPS_JS_KEY          # 클라이언트
CLERK_PUBLISHABLE_KEY=pk_test_xxx                  # 클라이언트
CLERK_SECRET_KEY=sk_test_xxx                       # 서버
GEMINI_API_KEY=YOUR_GEMINI_KEY                     # 서버 (createServerFn)
CONVEX_DEPLOYMENT=...                              # 필요 시
```

### 3) 설치 & 실행

```bash
pnpm install
pnpm dev:convex      # Convex 로컬 (선택)
pnpm dev             # Vite dev (기본 3000)
```

## 🔒 보안 & 베스트 프랙티스

- 지도 상태는 **URL 파라미터**만 사용 (글로벌 스토어 금지)
- Gemini/Clerk Secret 등 키는 **서버 함수**에서만 접근
- Convex mutations/queries는 `ctx.auth.getUserIdentity()`로 사용자 검증

## 🛤️ 로드맵

- Convex Storage 이미지 저장/서빙
- `/library` 보호 라우팅 강화 & 공유 카드 뷰
- 생성 실패 폴백/재시도 UX 개선

