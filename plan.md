# 구현 계획: 목차(TOC) 슬라이드 특별 포맷

## 개요
제목 슬라이드 다음에 오는 "컨텐츠 순서(목차)" 슬라이드에 특별한 시각적 포맷을 적용.
세로/가로 배치를 지원하며, 넘버링 + 서브/서브서브 불릿으로 유튜브 시청자가 영상 구조를 한눈에 파악할 수 있도록 함.

---

## 트리거 방식

### 두 가지 트리거 커맨드
| 커맨드 | 배치 | 설명 |
|--------|------|------|
| `<!-- toc -->` | 세로 배치 | 항목이 위에서 아래로 나열 |
| `<!-- toc-h -->` | 가로 배치 | 항목이 좌에서 우로, 가운데 정렬 |

### ⭐ 트리거 자동 삽입 버튼
사용자가 커맨드를 외울 필요 없도록, **에디터 패널 헤더**에 TOC 삽입 버튼을 추가.

버튼 동작:
- 클릭 시 드롭다운 메뉴 표시:
  - `📋 목차 (세로)` → 커서 위치에 `<!-- toc -->` 삽입
  - `📋 목차 (가로)` → 커서 위치에 `<!-- toc-h -->` 삽입
- 에디터 패널 헤더(MARKDOWN 옆)의 `panel-actions` 영역에 배치

```
+------------------------------------------+
| MARKDOWN    [📋 TOC ▾] [🗑]              |
+------------------------------------------+
|  (에디터 텍스트영역)                       |
```

---

### 사용자 마크다운 예시 (세로)
```markdown
# 제목 슬라이드
부제목

---

<!-- toc -->
## 목차

1. 첫 번째 주제
   - 세부 항목 A
   - 세부 항목 B
     - 하위 세부 항목
2. 두 번째 주제
   - 세부 항목 C
3. 세 번째 주제
```

### 사용자 마크다운 예시 (가로)
```markdown
<!-- toc-h -->
## 목차

1. 개요
2. 핵심 내용
3. 정리
```

---

## 디자인 스펙

### A. 세로 배치 (`<!-- toc -->`)
```
+------------------------------------------+
|                                          |
|   📋 목차                                |
|                                          |
|   ┌─ 01 ─ 첫 번째 주제                   |
|   │       ├─ 세부 항목 A                  |
|   │       └─ 세부 항목 B                  |
|   │            └─ 하위 세부 항목           |
|   │                                      |
|   ├─ 02 ─ 두 번째 주제                   |
|   │       └─ 세부 항목 C                  |
|   │                                      |
|   └─ 03 ─ 세 번째 주제                   |
|                                          |
+------------------------------------------+
```

### B. 가로 배치 (`<!-- toc-h -->`) — 가운데 정렬
```
+------------------------------------------+
|                                          |
|              📋 목차                      |
|                                          |
|     ┌──────┐  ┌──────┐  ┌──────┐        |
|     │  01  │  │  02  │  │  03  │        |
|     │ 개요  │  │ 핵심  │  │ 정리  │        |
|     └──────┘  └──────┘  └──────┘        |
|                                          |
+------------------------------------------+
```
- 가로 배치 시 항목들이 flex row + center 정렬
- 각 항목은 카드형 박스로 표시 (border + padding)
- 서브불릿은 카드 내부에 작은 텍스트로 표시

### 시각 요소 (공통)
- **넘버(01, 02, 03...)**: 액센트 색상, 큰 폰트(1.8em), 고정 너비로 정렬
- **1레벨 항목 텍스트**: 주 텍스트 색, 굵게(600), 1.3em
- **2레벨 서브 불릿(-)**: 보조 텍스트 색, 0.95em, 들여쓰기 + 작은 도트 마커
- **3레벨 서브서브 불릿**: 뮤트 텍스트 색, 0.85em, 추가 들여쓰기 + 더 작은 도트

### 시각 요소 (세로 전용)
- **세로 라인**: 액센트 색의 얇은(2px) 세로 연결선이 번호들을 이어줌

### 시각 요소 (가로 전용)
- **카드 박스**: border 1px + border-radius, 적절한 padding
- **전체 가운데 정렬**: justify-content: center
- 항목 수에 따라 자동 너비 조절 (flex wrap 지원)

---

## 수정 파일

### 단계 1. `index.html` — TOC 삽입 버튼 추가

에디터 패널 헤더의 `panel-actions`에 TOC 드롭다운 버튼 추가.

```html
<div class="panel-actions">
  <div class="toc-dropdown" id="toc-dropdown">
    <button class="btn-icon" id="btn-toc" title="목차 슬라이드 삽입">
      <svg>...</svg> <!-- 목록 아이콘 -->
    </button>
    <div class="toc-dropdown-menu" id="toc-menu">
      <button data-toc="vertical">📋 목차 (세로)</button>
      <button data-toc="horizontal">📋 목차 (가로)</button>
    </div>
  </div>
  <button class="btn-icon" id="btn-clear">...</button>
</div>
```

---

### 단계 2. `editor.css` — 드롭다운 스타일

```css
.toc-dropdown { position: relative; }
.toc-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  /* ... */
}
```

---

### 단계 3. `editor.js` — TOC 감지 + 클래스 부여

`parseSlides()`에서 `<!-- toc -->` 또는 `<!-- toc-h -->`를 감지하여 각각 `slide-toc` / `slide-toc slide-toc-horizontal` 클래스를 부여.

```javascript
if (trimmed.includes('<!-- toc-h -->')) {
  const cleanHtml = html.replace(/<!--\s*toc-h\s*-->/, '');
  slides.push(`<div class="slide-toc slide-toc-horizontal">${cleanHtml}</div>`);
} else if (trimmed.includes('<!-- toc -->')) {
  const cleanHtml = html.replace(/<!--\s*toc\s*-->/, '');
  slides.push(`<div class="slide-toc">${cleanHtml}</div>`);
} else {
  slides.push(html);
}
```

---

### 단계 4. `main.js` — TOC 삽입 버튼 이벤트

```javascript
btnToc.addEventListener('click', () => { /* 드롭다운 토글 */ });
// 메뉴 항목 클릭 → 에디터 커서 위치에 트리거 텍스트 삽입
```

---

### 단계 5. `slide.css` — TOC 전용 스타일

세로 배치(`.slide-toc`) + 가로 배치(`.slide-toc-horizontal`) CSS 작성.

---

### 단계 6. 샘플 콘텐츠 업데이트

`DEFAULT_CONTENT`에 TOC 슬라이드 예시 포함.

---

## 구현 순서

| 순서 | 작업 | 파일 | 상태 |
|------|------|------|------|
| 1 | TOC 드롭다운 버튼 HTML 추가 | `index.html` | ✅ 완료 |
| 2 | 드롭다운 스타일 | `src/styles/editor.css` | ✅ 완료 |
| 3 | `parseSlides()`에 TOC 감지 로직 | `src/editor.js` | ✅ 완료 |
| 4 | TOC 삽입 버튼 이벤트 | `src/main.js` | ✅ 완료 |
| 5 | TOC 전용 CSS (세로 + 가로) | `src/styles/slide.css` | ✅ 완료 |
| 6 | 샘플 콘텐츠에 TOC 추가 | `src/editor.js` | ✅ 완료 |
| 7 | 브라우저 테스트 | — | ✅ 완료 |

---

## 검증 결과

1. ✅ TOC 삽입 버튼 클릭 → 드롭다운 표시 → `<!-- toc -->` 또는 `<!-- toc-h -->` 자동 삽입 확인
2. ✅ 세로 TOC: 넘버링(01, 02...), 세로 연결선, 서브/서브서브 불릿 확인
3. ✅ 가로 TOC: 카드형 가로 배치, 가운데 정렬 확인
4. ✅ 일반 슬라이드에 영향 없는지 확인
5. ✅ 가운데/좌상단 레이아웃 모드와 조합 테스트
