# 구현 계획: 다중 문서 관리 및 새 슬라이드(풀옵션 템플릿) 기능

## 개요
기존 데이터가 유실되지 않도록 **다중 문서 관리(문서함) 시스템**을 도입합니다. "새 슬라이드" 생성 시 기존 내용은 안전하게 보존되며, 여러 문서를 로컬스토리지에 저장하고 자유롭게 전환할 수 있습니다. 변경 사항은 계속해서 자동으로 저장됩니다.

> [!IMPORTANT]
> 로컬스토리지의 저장 구조가 배열(다중 문서) 형태로 변경됩니다. 기존 작성하시던 데이터는 최초 1회 자동으로 마이그레이션 되어 보존됩니다.

---

## 1. 스토리지 구조 및 로직 개편 (`src/storage.js`)

기존의 단일 텍스트 저장 방식(`md_slide_content`)을 **다중 문서(JSON 배열)** 방식으로 확장합니다.

### 1.1 데이터 구조
- `md_slide_docs`: `[{ id: '170000000', title: '제목', content: '...', updatedAt: 170000000 }]`
- `md_slide_current_id`: 현재 열려있는 슬라이드의 `id`

### 1.2 마이그레이션 로직
앱 구동 시 `md_slide_docs`가 없는데 기존 `md_slide_content` 데이터가 있다면, 이를 최초의 문서 객체로 변환하여 저장합니다.

### 1.3 내보낼 함수들
- `getAllDocuments()`: 문서 목록 최신순 반환
- `getDocument(id)`: 특정 문서 로드
- `saveDocument(id, content, title)`: 현재 문서 자동 저장 (마크다운의 첫 `# ` 헤딩을 파싱하여 title 지정)
- `createDocument(content)`: 새 문서 생성 (새로운 ID 발급)
- `deleteDocument(id)`: 특정 문서 삭제

---

## 2. 모든 기능이 포함된 예시 템플릿 (`src/editor.js`)

`src/editor.js` 하단에 모든 기능을 망라하는 `FULL_EXAMPLE_CONTENT` 상수를 정의합니다.
이 예시에는 `<!-- cover -->`, `<!-- toc-h -->`, `<!-- split-left/right -->`, `<!-- animate -->` 등 MD Slide가 지원하는 모든 레이아웃과 매크로 기능이 주석과 함께 포함됩니다.

---

## 3. UI 및 이벤트 연동 (`index.html`, `src/main.js`, `src/styles/editor.css`)

### 3.1 툴바 버튼 추가 (`index.html`)
상단 툴바 좌측 영역에 **"새 슬라이드"** 버튼과 **"문서함"** 드롭다운 버튼을 추가합니다.

```html
<!-- 상단 툴바 예시 -->
<div class="toolbar-left">
  <!-- 로고 -->
  <button class="btn btn-primary" id="btn-new">✨ 새 슬라이드</button>
  
  <div class="docs-dropdown" id="docs-dropdown">
    <button class="btn btn-ghost" id="btn-docs">📂 문서함</button>
    <div class="docs-menu" id="docs-menu">
      <!-- 동적으로 문서 목록 렌더링 -->
    </div>
  </div>
  
  <div class="toolbar-divider"></div>
  <!-- 가져오기 / 내보내기 -->
</div>
```

### 3.2 이벤트 동작 (`src/main.js`)
- **자동 저장**: `editor.onSlidesChange` 이벤트 발생 시(0.5초 디바운스), 현재 활성화된 문서 ID(`currentDocId`)로 내용을 덮어씌웁니다. 마크다운의 첫 번째 `# 제목`을 추출하여 저장소의 `title`도 업데이트합니다.
- **새 슬라이드 버튼**: 클릭 시 `createDocument(FULL_EXAMPLE_CONTENT)`를 호출하여 새 문서를 만들고, 에디터 화면을 해당 문서로 즉시 교체합니다. 기존 작업물은 안전하게 백그라운드에 저장되어 있습니다.
- **문서함 드롭다운**: 버튼 클릭 시 저장된 모든 문서 목록(`title` 및 `수정일자` 표시)이 나타납니다. 다른 문서를 클릭하면 그 즉시 해당 문서 내용이 로드됩니다. 문서 우측에는 작은 휴지통 아이콘을 두어 삭제 기능도 지원합니다.

---

위 계획으로 **문서함 및 새 슬라이드 버튼**을 구현하고자 합니다. **내용을 확인하시고 피드백이나 "구현해"라고 지시해주시면 즉시 개발을 시작**하겠습니다.