# 애니메이션 매크로 고도화 구현 계획 (V2)

본 계획은 `<!-- animate -->` 매크로의 동작을 정교화하여, 매크로 선언 이후의 요소들만 선택적으로 애니메이션(Fragment) 처리하고 툴바 버튼을 통해 편리하게 삽입하기 위한 절차를 담고 있습니다.

## 1. 접근 방식
1.  **에디터 내 HTML 후처리**: `marked` 파싱 이후 HTML 내에서 `<!-- animate -->` 위치를 찾아 그 이후의 요소들에 `.fragment` 클래스를 동적으로 부여합니다.
2.  **프레젠터 동기화**: 미리 부여된 `.fragment` 클래스를 기반으로 애니메이션 순서를 결정하도록 프레젠터 로직을 간소화합니다.
3.  **툴바 버튼 추가**: 사용자가 매크로를 직접 타이핑하지 않고 버튼 하나로 삽입할 수 있도록 UI를 개선합니다.

---

## 2. 세부 구현 단계

### 단계 1: UI 및 툴바 업데이트 (`index.html`, `src/main.js`)
*   `index.html`: 마크다운 패널 헤더의 도구 버튼 영역에 애니메이션 버튼(🎥 아이콘 등) 추가.
*   `src/main.js`: 버튼 클릭 시 현재 커서 위치에 `<!-- animate -->` 매크로를 삽입하는 기능 구현.

### 단계 2: 에디터 파싱 로직 수정 (`src/editor.js`)
*   `processPart` 함수 내에 HTML DOM 파싱 로직 추가.
*   `<!-- animate -->` 주석 노드를 기점으로 그 이후에 나타나는 모든 유효 요소(p, li, img, h1-6 등)에 `.fragment` 클래스 주입.

### 단계 3: 프레젠터 초기화 로직 수정 (`src/presenter.js`)
*   `_initFragments` 메서드에서 슬라이드 내의 모든 `.fragment` 요소를 직접 수집하도록 변경.

### 단계 4: 스타일 시트 업데이트 (`src/styles/slide.css`)
*   `.slide-animate .fragment` 대신 `.fragment` 선택자를 사용하도록 변경.
*   프리뷰 영역(`.slide-card-inner`)에서는 `.fragment`가 항상 보이도록 보정.

---

## 3. 체크리스트 (구현 단계)

- [x] 단계 1: 애니메이션 삽입 버튼 UI 및 기능 추가
- [x] 단계 2: editor.js 내 Fragment 마킹 로직 구현
- [x] 단계 3: presenter.js 내 Fragment 수집 로직 간소화
- [x] 단계 4: slide.css 내 Fragment 스타일 전역화 및 프리뷰 보정