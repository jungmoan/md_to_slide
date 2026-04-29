# 스마트 저장 및 강제 저장 기능 리서치 결과

## 1. 스마트 저장 (Smart Auto-save vs. Versioning)
*   **문제점**: 현재 `saveDocument` 내에서 매번 `history` 테이블에 데이터를 추가하고 있어, 글자 하나를 쓸 때마다 버전이 생성되는 문제가 있음.
*   **분석**: 
    *   **Auto-save**: 사용자가 실시간으로 편집하는 최신 상태를 `docs` 테이블에 업데이트 (디바운스 적용).
    *   **Versioning**: 사용자가 명시적으로 저장(`Ctrl+S`)하거나 특정 시점(복구 등)에서만 `history` 테이블에 스냅샷 저장.
*   **해결책**: `storage.js`의 `saveDocument`에서 히스토리 저장 로직을 분리하고, 명시적 버전 저장을 위한 `saveHistorySnapshot` 함수를 신설함.

## 2. Ctrl/Cmd + S 단축키 및 브라우저 기본 동작 차단
*   **문제점**: `Cmd+S` 입력 시 브라우저의 "페이지 저장" 창이 뜸.
*   **분석**: `keydown` 이벤트 핸들러에서 `e.key === 's'`와 `e.metaKey`를 감지할 때 `e.preventDefault()`를 호출하지 않음.
*   **해결책**: `main.js` 또는 `editor.js`에 전역 단축키 핸들러를 추가하고 `preventDefault()`를 통해 브라우저 동작을 차단한 뒤, 앱 자체 저장 로직을 수행함.

## 3. 토스트 메시지 (Toast Notification)
*   **요구사항**: 저장 성공 시 시각적인 알림 제공.
*   **해결책**:
    *   HTML: 하단 중앙 또는 우상단에 `toast-container` 추가.
    *   CSS: 부드러운 애니메이션(Fade-in/out)과 유리 질감 스타일 적용.
    *   JS: 메시지를 매개변수로 받아 일정 시간 후 사라지는 `showToast()` 함수 구현.
