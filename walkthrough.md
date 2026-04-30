# Walkthrough: 실제 SQLite DB 파일 전환 완료

브라우저 내장 저장소(IndexedDB)에서 로컬 파일 시스템의 SQLite DB로의 전환을 완료했습니다.

## 주요 변경 사항

### 1. 백엔드 서버 구축
- **파일**: `server/index.cjs`
- **기술 스택**: Express, better-sqlite3
- **역할**: SQLite DB와의 통신 및 API 엔드포인트 제공

### 2. 프런트엔드 저장소 로직 개편
- **파일**: `src/storage.js`
- **변경점**: IndexedDB API를 제거하고 브라우저 `fetch`를 사용하여 백엔드 API와 통신하도록 수정했습니다.

### 3. 개발 환경 최적화
- **파일**: `package.json`, `vite.config.js`
- **변경점**: `npm run dev` 명령 하나로 서버와 클라이언트가 동시에 구동되며, Vite의 프록시 설정을 통해 API 요청이 백엔드로 자동 전달됩니다.

## 테스트 및 검증 결과
- **서버 구동**: `http://localhost:3001`에서 정상 작동 확인.
- **문서 저장 및 로드**: 새로운 문서 생성 및 수정 시 `database.sqlite` 파일에 즉시 반영됨을 확인했습니다.
- **Vite 프록시**: 프런트엔드에서 `/api` 호출 시 백엔드로 연결됨을 확인했습니다.

## 향후 관리 가이드
- 이제 프로젝트 루트에 생성되는 **`database.sqlite`** 파일을 통해 데이터를 관리할 수 있습니다.
- 해당 파일을 복사하여 다른 환경에서 사용하거나 백업할 수 있습니다.
- (참고: `.gitignore`에 추가되어 있어 Git에는 포함되지 않습니다.)
