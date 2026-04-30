# 계획: 실제 SQLite DB 파일로 관리하기

브라우저 저장소(IndexedDB) 대신 로컬 파일 시스템의 SQLite DB 파일을 사용하여 데이터를 관리하도록 시스템을 전환합니다.

## 1. 접근 방식
- **백엔드 구축**: Express 서버를 구축하여 SQLite DB와 통신합니다.
- **DB 파일**: 프로젝트 루트에 `database.sqlite` 파일을 생성하여 영구 저장합니다.
- **프록시 설정**: Vite 개발 서버에서 `/api`로 시작하는 요청을 Express 서버로 전달하도록 설정합니다.
- **저장소 로직 교체**: `src/storage.js`의 내부 로직을 IndexedDB API에서 브라우저 `fetch` API(백엔드 호출)로 교체합니다.

## 2. 세부 작업 단계

### [x] [단계 1] 백엔드 환경 구축 및 라이브러리 설치
- 필요한 패키지 설치: `npm install express better-sqlite3 cors`
- 개발 편의를 위해 `concurrently` 및 `nodemon` 설치: `npm install -D concurrently nodemon`

### [x] [단계 2] 서버 및 DB 초기화 코드 작성
- `server/index.js` 생성: Express 서버 기본 설정 및 SQLite 초기화.
- 스키마 생성: `docs`, `history`, `images` 테이블 정의.

### [x] [단계 3] API 엔드포인트 구현
- 문서 CRUD (목록, 상세, 생성, 수정, 삭제)
- 이미지 저장 및 조회 API

### [x] [단계 4] Vite 프록시 및 스크립트 설정
- `vite.config.js` 수정: `proxy` 설정 추가.
- `package.json` 수정: `npm run dev` 시 서버와 클라이언트가 동시에 뜨도록 수정.

### [x] [단계 5] 프런트엔드 storage.js 수정
- 모든 함수를 `async/await`와 `fetch`를 사용하도록 변경.
- 기존 IndexedDB 데이터를 SQLite로 마이그레이션할 수 있는 간단한 트리거(또는 자동 감지) 고려.

## 3. 코드 스니펫 예시

### SQLite 초기화 (server/index.js)
```javascript
const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS docs (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    theme TEXT,
    layout TEXT,
    settings TEXT,
    updatedAt INTEGER
  );
`);
```

### storage.js API 호출 예시
```javascript
export async function getAllDocuments() {
  const response = await fetch('/api/docs');
  return await response.json();
}
```

## 4. 고려 사항 및 트레이드 오프
- **Node.js 버전**: `better-sqlite3`는 네이티브 바인딩을 사용하므로 설치 시 환경에 맞는 컴파일이 필요할 수 있습니다.
- **에러 핸들링**: 네트워크 요청이므로 오프라인 상태나 서버 다운 시에 대한 처리가 필요합니다.

## 5. 결과 요약
- [x] **백엔드**: Express + better-sqlite3 기반의 서버 구축 완료 (`server/index.cjs`)
- [x] **DB**: `database.sqlite` 파일로 데이터 영구 저장 지원
- [x] **통신**: 프런트엔드 `storage.js`를 API 호출 방식으로 전면 개편
- [x] **환경**: `npm run dev` 하나로 서버와 클라이언트 동시 구동

이제 모든 데이터는 브라우저가 아닌 프로젝트 폴더 내의 SQLite 파일에 저장됩니다.