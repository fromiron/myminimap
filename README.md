# 🗺️ MyMiniMap (마이미니맵)

> **"익숙한 우리 동네를 3D 장난감 세상으로."** > Google Maps와 Generative AI를 활용하여 스트리트뷰를 고품질 아이소메트릭(Isometric) 미니어처로 변환해 주는 웹 애플리케이션입니다.

![Project Status](https://img.shields.io/badge/Status-Development-blue) ![Stack](https://img.shields.io/badge/Stack-TanStack-orange)

## ✨ 프로젝트 소개 (Introduction)

**MyMiniMap**은 사용자가 선택한 장소의 풍경을 AI가 분석하여, 마치 장난감으로 만든 듯한 귀여운 3D 디오라마 이미지로 재창조해 주는 서비스입니다.

단순한 이미지 필터가 아닙니다. **Google Maps**로 원하는 구도를 잡으면, **Google Imagen**가 해당 장면의 특징(건물, 도로, 분위기)을 인식하여 완전히 새로운 3D 일러스트를 그려냅니다. 사용자는 구글 로그인 후 자신만의 미니어처 컬렉션을 저장하고 관리할 수 있습니다.

## 🚀 주요 기능 (Key Features)

- **📍 장소 탐색 (Location Discovery)**
  - Google Maps 연동으로 전 세계 어디든 탐색 가능.
  - 장소 검색(Autocomplete) 및 핀 포인트 지정.
  - 스트리트뷰와 지도를 동시에 보며 위치 확인.

- **📷 앵글 커스텀 & URL 동기화 (Perfect Framing)**
  - 360도 회전(Heading), 상하 각도(Pitch), 줌(FOV) 조절로 '얼짱 각도' 탐색.
  - **Deep Linking:** 모든 카메라 상태가 URL에 실시간 동기화되어, 링크 공유 시 상대방도 똑같은 뷰를 볼 수 있음.

- **🎨 AI 미니어처 생성 (AI Generation)**
  - Server Function을 통한 안전한 API 호출.
  - 좌표 기반 역지오코딩(Reverse Geocoding)으로 장소명 자동 추출 및 프롬프트 최적화.
  - 최신 Imagen를 활용한 고품질 3D 아이소메트릭 이미지 생성.

- **💾 내 라이브러리 (My Library)**
  - **Clerk** 기반의 간편한 구글 로그인.
  - **Convex** DB를 활용한 생성 결과 영구 저장.
  - 내가 만든 미니어처들을 갤러리 형태로 모아보기.

## 🛠️ 기술 스택 (Tech Stack)

이 프로젝트는 **TanStack** 생태계와 최신 Serverless 기술을 적극 활용하여 구축되었습니다.

| 분류 | 기술 | 비고 |
| :--- | :--- | :--- |
| **Framework** | **TanStack Start** | React 기반 풀스택 프레임워크 (SSR) |
| **Routing** | **TanStack Router** | Type-safe 라우팅 및 URL 상태 관리 |
| **Data Fetching**| **TanStack Query** | 서버 상태 관리 및 비동기 로직 처리 |
| **Database** | **Convex** | 실시간 백엔드 및 데이터베이스 |
| **Auth** | **Clerk** | 사용자 인증 및 관리 |
| **Maps** | **Google Maps Platform** | Maps JS API, Street View Static API |
| **AI** | **Google Gemini** | 최신 Imagen 모델 (Image Generation) |
| **Styling** | **Tailwind CSS** + **Shadcn/UI** | 빠르고 일관된 UI 디자인 |
| **Deployment** | **Vercel** | Nitro 어댑터 사용 |

## 🏗️ 아키텍처 (Architecture)

```mermaid
graph TD
    User[사용자] -->|검색 & 앵글 조절| Client[클라이언트 (TanStack Router)]
    Client -->|URL 파라미터 동기화| Client
    User -->|생성 요청| ServerFn[서버 함수 (TanStack Start)]
    
    subgraph "Server Side"
        ServerFn -->|1. 이미지 캡처| StaticAPI[Google Street View Static API]
        ServerFn -->|2. 장소명 추출| GeoAPI[Google Geocoding API]
        ServerFn -->|3. 프롬프트 + 이미지| VertexAI[Google Vertex AI (Imagen)]
    end
    
    VertexAI -->|생성된 이미지 URL| ServerFn
    ServerFn -->|결과 반환| Client
    
    Client -->|저장 요청| Convex[Convex DB]
    Convex -->|유저 데이터 검증| Clerk[Clerk Auth]