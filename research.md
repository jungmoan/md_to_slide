# 리서치: 브라우저 IndexedDB에서 실제 DB 파일(SQLite)로 전환

## 1. 현재 저장 방식 분석
- **저장소**: 브라우저 내장 `IndexedDB` (이름: `md_slide_db`)
- **관리 파일**: `src/storage.js`
- **데이터 구조**:
  - `docs`: 문서 메타데이터 및 본문 (id, title, content, theme, layout, updatedAt 등)
  - `history`: 문서 변경 이력 (historyId, docId, content, savedAt 등)
  - `images`: 이미지 데이터 (id, base64Data)
- **한계**: 브라우저에 종속적이며, 사용자가 직접 DB 파일을 백업하거나 이동하기 어려움.

## 2. SQLite 전환을 위한 기술적 요구사항
### 백엔드 서버 필요
- Vite는 프런트엔드 빌드 도구이므로, 파일 시스템에 접근하여 DB를 제어할 서버(Node.js)가 필요함.
- **선택지**:
  1. `Express` 서버 추가 (가장 일반적)
  2. `server.js`를 작성하여 Vite 개발 서버와 함께 구동 (Vite Proxy 사용)

### 데이터베이스 라이브러리
- `better-sqlite3`: 동기식 API를 제공하여 설정이 간편하고 성능이 뛰어남. (Node.js 환경 전용)

### API 엔드포인트 설계
- `GET /api/docs`: 전체 문서 목록 조회
- `GET /api/docs/:id`: 특정 문서 조회
- `POST /api/docs`: 새 문서 생성
- `PUT /api/docs/:id`: 문서 수정
- `DELETE /api/docs/:id`: 문서 삭제
- `POST /api/images`: 이미지 업로드
- `GET /api/images/:id`: 이미지 조회

## 3. 고려 사항 및 트레이드 오프
- **설정 복잡도**: 단순 정적 웹사이트에서 백엔드 서버가 필요한 구조로 변경됨.
- **배포**: 프런트엔드만 배포하던 방식에서 서버와 DB 파일 관리가 필요한 방식으로 변경됨.
- **실행 방식**: 이제는 브라우저만 여는 게 아니라, 서버를 같이 띄워야 함 (`npm run dev` 시 서버도 함께 구동되도록 구성).

## 4. 마이그레이션 전략
- 기존 사용자의 IndexedDB 데이터를 서버로 보낼 수 있는 간단한 '동기화/가져오기' 기능을 구현할 수 있음.
- 초기에는 새로운 서버 DB를 빈 상태로 시작하되, 필요 시 기존 데이터를 임포트하는 버튼 추가.
