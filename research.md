# 리서치: 다중 문서 관리 및 새 슬라이드 기능

## 1. 사용자 요구사항 변경/확장
- **기존 슬라이드 보존**: "새 슬라이드"를 누를 때 기존 작업물이 날아가지 않도록 관리해야 함.
- **다중 문서 저장 및 불러오기**: 여러 개의 슬라이드 문서를 로컬스토리지에 저장하고, 원할 때 불러올 수 있어야 함.
- **자동 저장**: 현재 구현되어 있는 자동 저장 기능(`md_slide_content` 단일 키 저장)을 다중 문서 구조에 맞게 변경해야 함.

## 2. 로컬 스토리지 구조 설계 (`src/storage.js`)
기존에는 단일 문자열(`md_slide_content`)만 저장했으나, 이제 배열 형태의 문서 목록과 현재 활성화된 문서 ID를 관리해야 합니다.

- `md_slide_docs`: `[{ id: '1234', title: '첫 슬라이드', content: '...', updatedAt: 12345678 }]` 형태의 JSON 배열.
- `md_slide_current_id`: 현재 열려있는 문서의 `id`.

**필요한 스토리지 함수들:**
- `getDocuments()`: 모든 문서 목록 조회.
- `getDocument(id)`: 특정 문서 내용 조회.
- `saveDocument(id, content, title)`: 문서 저장 (자동 저장 시 호출).
- `createDocument(content)`: 새 문서 생성 후 ID 반환.
- `deleteDocument(id)`: 문서 삭제.

## 3. UI/UX 설계 (`index.html` & `src/main.js`)

1. **상단 툴바 구성 변경**
   ```html
   <div class="toolbar-left">
     <!-- 로고 -->
     <!-- [NEW] "새 슬라이드" 버튼 -->
     <!-- [NEW] "문서함" (dropdown 또는 modal 트리거) -->
     <!-- 파일 가져오기 / 내보내기 -->
   </div>
   ```

2. **문서함 (문서 목록) 표시 방법**
   - 툴바에 "📂 문서함" 버튼을 만들고, 클릭 시 드롭다운 또는 작은 모달이 뜨게 합니다.
   - 목록에는 `title`(마크다운의 첫 번째 `# 제목`을 추출하거나 기본값)과 수정 시간(`updatedAt`)을 표시.
   - 목록에서 문서를 클릭하면 해당 문서가 에디터에 로드됨.

3. **자동 저장 로직 업데이트**
   - `main.js`의 `editor.onSlidesChange`에서 0.5초마다 현재 `currentDocId`에 내용을 덮어씁니다.
   - 제목 추출: `content.match(/^#\s+(.*)/m)` 정규식을 사용하여 첫 H1을 `title`로 저장.

4. **"새 슬라이드" 버튼 동작**
   - 클릭 시 `FULL_EXAMPLE_CONTENT`를 내용으로 하는 **새로운 문서**를 `createDocument()`로 생성.
   - `currentDocId`를 새 문서로 변경하고 에디터에 로드.
   - 기존 작업물은 문서함에 안전하게 저장됨.

## 4. 기존 단일 저장 데이터의 마이그레이션
앱이 처음 로드될 때:
1. `md_slide_docs`가 비어있고, 기존의 `md_slide_content`가 있다면, 이를 최초의 문서로 묶어 `md_slide_docs`에 넣어 마이그레이션합니다. 그래야 기존 유저의 데이터가 날아가지 않습니다.
