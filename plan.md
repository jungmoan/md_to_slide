# 마크다운 에디터 고도화 구현 계획

본 계획은 에디터의 사용성(Shortcuts, Undo/Redo)과 시각적 일관성(Tooltips, Layout)을 개선하기 위한 상세 절차를 담고 있습니다.

## 1. 접근 방식

1.  **에디터 기능 고도화 (`src/editor.js`)**:
    *   볼드/이탤릭 토글 로직을 스마트하게 변경 (주변 문맥 파악).
    *   커스텀 Undo/Redo 매니저 구현 및 키 바인딩.
2.  **UI/UX 보강 (`index.html`, `src/styles/editor.css`)**:
    *   버튼 툴팁 텍스트를 사용자가 이해하기 쉬운 명칭으로 통일.
    *   헤더 바의 높이를 고정하여 좌우 패널의 시각적 균형 유지.

---

## 2. 세부 구현 단계

### 단계 1: 볼드/이탤릭 토글 로직 개선
*   **파일**: `src/editor.js`
*   **변경 내용**: `Ctrl+B`, `Ctrl+I` 단축키 핸들러 내에서 현재 선택 영역 및 주변 텍스트를 검사하여 마크다운 기호(`**`, `*`)가 있으면 제거, 없으면 추가하도록 수정.
*   **코드 스니펫**:
    ```javascript
    // Bold 토글 예시
    if (isWrappedWithStars) {
      // 제거 로직
    } else {
      // 추가 로직
    }
    ```

### 단계 2: Undo/Redo 기능 구현
*   **파일**: `src/editor.js`
*   **변경 내용**:
    *   `Editor` 생성자에서 `history` 및 `redoStack` 초기화.
    *   `saveHistory()` 메서드 추가 및 입력 발생 시 호출.
    *   `Ctrl+Z`, `Ctrl+Shift+Z` (또는 `Ctrl+Y`) 단축키 구현.

### 단계 3: 버튼 툴팁 및 UI 정렬 수정
*   **파일**: `index.html`, `src/styles/editor.css`
*   **변경 내용**:
    *   `index.html`: `btn-image`, `btn-cover`, `btn-toc`, `btn-clear`의 `title` 속성을 사용자 친화적으로 수정.
    *   `editor.css`: `.panel-header`에 `height: 48px` 고정값 적용 및 내부 요소 중앙 정렬.

---

## 3. 고려 사항 및 트레이드 오프
*   **Undo 스택 크기**: 메모리 사용량을 고려하여 최대 50회 정도로 제한.
*   **Native Undo 브레이킹**: JS로 값을 강제 주입하면 브라우저 기본 Undo(`Ctrl+Z`)는 작동하지 않게 되므로, 자체 구현한 Undo 로직이 이를 완벽히 대체해야 함.

---

## 4. 체크리스트 (구현 단계)

- [x] 단계 1: 볼드/이탤릭 토글 로직 개선
- [x] 단계 2: Undo/Redo 기능 구현 및 연동
- [ ] 단계 3: 버튼 툴팁 상세화
- [ ] 단계 4: 패널 헤더 높이 일원화 (CSS 수정)
- [ ] 단계 5: 최종 기능 동작 확인 및 커밋