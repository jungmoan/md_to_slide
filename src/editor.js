// editor.js — 에디터 + Markdown 파싱 + 실시간 프리뷰

import { marked } from 'marked';
import hljs from 'highlight.js';
import { getImage } from './storage.js';

// --- Configure marked with highlight.js ---
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Custom renderer for code blocks with language labels
const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }) {
  const language = lang && hljs.getLanguage(lang) ? lang : null;
  const highlighted = language
    ? hljs.highlight(text, { language }).value
    : hljs.highlightAuto(text).value;
  const langAttr = language ? ` data-lang="${language}"` : '';
  return `<pre${langAttr}><code class="hljs">${highlighted}</code></pre>`;
};

marked.use({ renderer });

// --- Editor class ---
export class Editor {
  constructor(textareaEl, previewEl, slideCountEl, charCountEl, statusEl) {
    this.textarea = textareaEl;
    this.preview = previewEl;
    this.slideCountLabel = slideCountEl;
    this.charCount = charCountEl;
    this.statusEl = statusEl;
    this.slides = [];
    this.history = [];
    this.redoStack = [];
    this.lastSavedValue = "";
    this.debounceTimer = null;
    this.onSlidesChange = null; // callback
    this._resizeObserver = null;

    this._bindEvents();
    // Initial state
    this.saveHistory();
    this._setupResizeObserver();
  }

  saveHistory() {
    const current = this.textarea.value;
    if (this.history.length > 0 && this.history[this.history.length - 1].value === current) return;
    
    this.history.push({
      value: current,
      cursorStart: this.textarea.selectionStart,
      cursorEnd: this.textarea.selectionEnd
    });
    if (this.history.length > 100) this.history.shift();
    this.redoStack = [];
  }

  undo() {
    if (this.history.length <= 1) return;
    
    const current = {
      value: this.textarea.value,
      cursorStart: this.textarea.selectionStart,
      cursorEnd: this.textarea.selectionEnd
    };
    this.redoStack.push(current);
    
    this.history.pop(); // remove current
    const prev = this.history[this.history.length - 1];
    
    this.textarea.value = prev.value;
    this.textarea.selectionStart = prev.cursorStart;
    this.textarea.selectionEnd = prev.cursorEnd;
    this.textarea.focus();
    this._debounceUpdate();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    
    const next = this.redoStack.pop();
    this.history.push(next);
    
    this.textarea.value = next.value;
    this.textarea.selectionStart = next.cursorStart;
    this.textarea.selectionEnd = next.cursorEnd;
    this.textarea.focus();
    this._debounceUpdate();
  }

  _bindEvents() {
    this.textarea.addEventListener('input', () => {
      // Save history on space, enter or when significantly changed
      if (this.textarea.value.endsWith(' ') || this.textarea.value.endsWith('\n')) {
        this.saveHistory();
      }
      this._debounceUpdate();
    });

    // Keyboard shortcuts
    this.textarea.addEventListener('keydown', (e) => {
      // Ctrl+/ -> Toggle comment
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        this.saveHistory();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        
        let lineStart = value.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = value.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = value.length;
        
        let line = value.substring(lineStart, lineEnd);
        if (line.startsWith('<!-- ') && line.endsWith(' -->')) {
          line = line.substring(5, line.length - 4);
        } else {
          line = `<!-- ${line} -->`;
        }
        
        this.textarea.value = value.substring(0, lineStart) + line + value.substring(lineEnd);
        this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + line.length;
        this.saveHistory();
        this._debounceUpdate();
        return;
      }

      // Cmd/Ctrl+B -> Bold
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        this.saveHistory();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        const selected = value.substring(start, end);
        
        if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
          // Remove internal markers
          const unwrap = selected.substring(2, selected.length - 2);
          this.textarea.value = value.substring(0, start) + unwrap + value.substring(end);
          this.textarea.selectionStart = start;
          this.textarea.selectionEnd = end - 4;
        } else if (value.substring(start - 2, start) === '**' && value.substring(end, end + 2) === '**') {
          // Remove external markers
          this.textarea.value = value.substring(0, start - 2) + selected + value.substring(end + 2);
          this.textarea.selectionStart = start - 2;
          this.textarea.selectionEnd = end - 2;
        } else {
          // Add markers
          this.textarea.value = value.substring(0, start) + `**${selected}**` + value.substring(end);
          this.textarea.selectionStart = start + 2;
          this.textarea.selectionEnd = end + 2;
        }
        this.saveHistory();
        this._debounceUpdate();
        return;
      }

      // Cmd/Ctrl+I -> Italic
      if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        this.saveHistory();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        const selected = value.substring(start, end);

        if (selected.startsWith('*') && selected.endsWith('*') && selected.length >= 2 && !selected.startsWith('**')) {
          // Remove internal markers
          const unwrap = selected.substring(1, selected.length - 1);
          this.textarea.value = value.substring(0, start) + unwrap + value.substring(end);
          this.textarea.selectionStart = start;
          this.textarea.selectionEnd = end - 2;
        } else if (value.substring(start - 1, start) === '*' && value.substring(end, end + 1) === '*' && value.substring(start - 2, start) !== '**') {
          // Remove external markers
          this.textarea.value = value.substring(0, start - 1) + selected + value.substring(end + 1);
          this.textarea.selectionStart = start - 1;
          this.textarea.selectionEnd = end - 1;
        } else {
          // Add markers
          this.textarea.value = value.substring(0, start) + `*${selected}*` + value.substring(end);
          this.textarea.selectionStart = start + 1;
          this.textarea.selectionEnd = end + 1;
        }
        this.saveHistory();
        this._debounceUpdate();
        return;
      }

      // Cmd/Ctrl+Z -> Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        this.undo();
        return;
      }

      // Cmd/Ctrl+Shift+Z or Ctrl+Y -> Redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        this.redo();
        return;
      }

      // Tab key support
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value =
          this.textarea.value.substring(0, start) +
          '  ' +
          this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        this._debounceUpdate();
        return;
      }
    });

    // Sync scroll
    const syncScroll = () => {
      if (!this.preview || this.slides.length === 0) return;
      const cursorPosition = this.textarea.selectionStart;
      
      let currentIndex = 0;
      for (let i = 0; i < this.slides.length; i++) {
        if (cursorPosition >= this.slides[i].offset) {
          currentIndex = i;
        } else {
          break;
        }
      }

      const targetCard = this.preview.querySelector(`[data-slide-index="${currentIndex}"]`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    this.textarea.addEventListener('keyup', (e) => {
      // Don't scroll on modifiers
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      syncScroll();
    });
    this.textarea.addEventListener('click', syncScroll);
  }

  _setupResizeObserver() {
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const card = entry.target;
        const cardWidth = entry.contentRect.width;
        const scale = cardWidth / 1280;
        const inner = card.querySelector('.slide-card-inner');
        if (inner) {
          inner.style.setProperty('--slide-scale', scale);
        }
      }
    });
  }

  _updateCardScales() {
    if (!this.preview) return;
    // Disconnect previous observations
    this._resizeObserver.disconnect();
    // Observe all slide cards
    const cards = this.preview.querySelectorAll('.slide-card');
    cards.forEach((card) => {
      this._resizeObserver.observe(card);
      // Set initial scale immediately
      const cardWidth = card.clientWidth;
      if (cardWidth > 0) {
        const scale = cardWidth / 1280;
        const inner = card.querySelector('.slide-card-inner');
        if (inner) {
          inner.style.setProperty('--slide-scale', scale);
        }
      }
    });
  }

  _debounceUpdate() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.updatePreview();
    }, 200);
  }

  getContent() {
    return this.textarea.value;
  }

  setContent(markdown) {
    this.textarea.value = markdown;
    this.updatePreview();
  }

  parseSlides(markdown) {
    if (!markdown.trim()) return [];

    // We need to keep track of character offsets to jump to slides
    // Splitting by \n---\n using RegExp with exec to find indices
    const regex = /\n---\n/g;
    const slides = [];
    let lastIndex = 0;
    let match;

    const processPart = (text, offset) => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const html = marked.parse(trimmed);
      let finalHtml = html;
      let extraClass = '';

      // Check for macros
      if (trimmed.includes('<!-- cover -->')) {
        finalHtml = `<div class="slide-cover">${html.replace(/<!--\s*cover\s*-->/g, '')}</div>`;
      } else if (trimmed.includes('<!-- toc-h -->')) {
        finalHtml = `<div class="slide-toc slide-toc-horizontal">${html.replace(/<!--\s*toc-h\s*-->/g, '')}</div>`;
      } else if (trimmed.includes('<!-- toc -->')) {
        finalHtml = `<div class="slide-toc">${html.replace(/<!--\s*toc\s*-->/g, '')}</div>`;
      }

      if (trimmed.includes('<!-- animate -->')) {
        extraClass += ' slide-animate';
        finalHtml = finalHtml.replace(/<!--\s*animate\s*-->/g, '');
      }

      let isSplit = false;
      if (trimmed.includes('<!-- split-left -->')) {
        extraClass += ' slide-split split-left';
        finalHtml = finalHtml.replace(/<!--\s*split-left\s*-->/g, '');
        isSplit = true;
      } else if (trimmed.includes('<!-- split-right -->')) {
        extraClass += ' slide-split split-right';
        finalHtml = finalHtml.replace(/<!--\s*split-right\s*-->/g, '');
        isSplit = true;
      } else if (trimmed.includes('<!-- split-top -->')) {
        extraClass += ' slide-split split-top';
        finalHtml = finalHtml.replace(/<!--\s*split-top\s*-->/g, '');
        isSplit = true;
      }

      if (isSplit) {
        const imgRegex = /<p>\s*(<img[^>]+>)\s*<\/p>|<img[^>]+>/i;
        const match = finalHtml.match(imgRegex);
        if (match) {
          const imgTag = match[0];
          const textHtml = finalHtml.replace(imgTag, '');
          finalHtml = `
             <div class="split-text">${textHtml}</div>
             <div class="split-image">${imgTag}</div>
           `;
        }
      }

      if (extraClass) {
        if (finalHtml.startsWith('<div class="slide-')) {
          // If it already has a wrapper, append the class
          finalHtml = finalHtml.replace('class="', `class="${extraClass.trim()} `);
        } else {
          // Otherwise, wrap it
          finalHtml = `<div class="slide-wrapper ${extraClass.trim()}">${finalHtml}</div>`;
        }
      }

      return { html: finalHtml, offset };
    };

    while ((match = regex.exec(markdown)) !== null) {
      const part = markdown.substring(lastIndex, match.index);
      const slide = processPart(part, lastIndex);
      if (slide) slides.push(slide);
      lastIndex = match.index + match[0].length;
    }

    // Process the last part
    const lastPart = markdown.substring(lastIndex);
    const slide = processPart(lastPart, lastIndex);
    if (slide) slides.push(slide);

    return slides;
  }

  updatePreview() {
    const markdown = this.textarea.value;
    this.slides = this.parseSlides(markdown);

    // Update char count
    if (this.charCount) {
      this.charCount.textContent = `${markdown.length}자`;
    }

    // Update slide count label
    if (this.slideCountLabel) {
      this.slideCountLabel.textContent =
        this.slides.length > 0 ? `${this.slides.length}장` : '';
    }

    // Render preview cards
    this._renderPreviewCards();
    
    // Hydrate local base64 images
    this._hydrateImages();

    // Update status
    if (this.statusEl) {
      this.statusEl.textContent =
        this.slides.length > 0
          ? `${this.slides.length}개 슬라이드 준비 완료`
          : '준비 완료';
    }

    // Notify
    if (this.onSlidesChange) {
      this.onSlidesChange(this.slides);
    }
  }

  async _hydrateImages() {
    if (!this.preview) return;
    const images = this.preview.querySelectorAll('img[src^="local-img://"]');
    for (const img of images) {
      const id = img.getAttribute('src').replace('local-img://', '');
      const base64 = await getImage(id);
      if (base64) {
        img.src = base64;
      }
    }
  }

  _renderPreviewCards() {
    if (!this.preview) return;

    if (this.slides.length === 0) {
      this.preview.innerHTML = `
        <div class="preview-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="14" rx="3"/>
            <line x1="8" y1="9" x2="16" y2="9"/>
            <line x1="8" y1="13" x2="13" y2="13"/>
          </svg>
          <p>Markdown을 입력하면 슬라이드가 여기에 나타납니다</p>
          <p style="font-size: 0.75rem;">--- 로 슬라이드를 구분하세요</p>
        </div>
      `;
      return;
    }

    this.preview.innerHTML = this.slides
      .map(
        (slide, i) => `
        <div class="slide-card" data-slide-index="${i}" data-offset="${slide.offset}" title="클릭하면 에디터 해당 위치로 이동합니다">
          <div class="slide-card-inner slide-content">${slide.html}</div>
          <span class="slide-card-number">${i + 1}</span>
          <button class="btn-play-from-here" data-slide-index="${i}" title="여기서부터 슬라이드쇼 시작">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
        </div>
      `
      )
      .join('');

    // Apply scale based on actual card width
    this._updateCardScales();
  }

  getSlides() {
    return this.slides;
  }

  clear() {
    this.textarea.value = '';
    this.updatePreview();
  }
}

// --- Default sample content ---
export const DEFAULT_CONTENT = `<!-- cover -->
# MD Slide 🎬
미니멀 마크다운 프레젠터

> Markdown으로 유튜브 영상용 슬라이드를 만들어보세요

---

<!-- toc -->
## 목차 📋

1. 사용법
   - 기본 조작 방법
   - 슬라이드 구분
2. 코드 하이라이팅
   - 다양한 언어 지원
     - JavaScript, Python 등
3. 표(Table) 지원
4. 테마 & 단축키

---

## 사용법 ✏️

1. 왼쪽에 **Markdown**을 입력합니다
2. \`---\` 로 슬라이드를 구분합니다
3. 오른쪽에서 **실시간 미리보기**를 확인합니다
4. **슬라이드쇼** 버튼으로 프레젠테이션을 시작합니다

---

## 코드 하이라이팅 💻

다양한 언어의 코드를 지원합니다:

\`\`\`javascript
function greet(name) {
  return \`안녕하세요, \${name}님! 👋\`;
}

console.log(greet('세계'));
\`\`\`

---

## 표(Table) 지원 📊

| 기능 | 지원 |
|------|------|
| Markdown 파싱 | ✅ |
| 코드 하이라이팅 | ✅ |
| 전체화면 모드 | ✅ |
| 테마 전환 | ✅ |
| 파일 가져오기/내보내기 | ✅ |

---

## 키보드 단축키 ⌨️

- \`Ctrl + Enter\` — 슬라이드쇼 시작
- \`←\` \`→\` — 이전 / 다음 슬라이드
- \`F\` — 전체화면 토글
- \`Escape\` — 프레젠테이션 종료
- \`Ctrl + S\` — 파일 내보내기

---

# 감사합니다 🙏
지금 바로 시작해보세요!
`;

export const FULL_EXAMPLE_CONTENT = `<!-- cover -->
# MD Slide 풀옵션 🚀
모든 기능이 포함된 마스터 템플릿

> 이 템플릿은 MD Slide가 지원하는 모든 레이아웃과 매크로를 포함합니다.

---

<!-- toc-h -->
## 기능 둘러보기 📋

1. 표지 및 목차
   - Cover 매크로
   - TOC 매크로
2. 다이나믹 레이아웃
   - 좌우 분할 (Split)
3. 인터랙션
   - 프래그먼트 애니메이션 (Animate)
4. 마크다운 기본기
   - 코드, 테이블 등

---

<!-- split-left -->
![Sample Image](https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80)

### 2단 분할 레이아웃 (Split Left)
- \`<!-- split-left -->\` 매크로를 사용했습니다.
- 이미지는 좌측에, 텍스트는 우측에 배치됩니다.
- \`<!-- split-right -->\`를 쓰면 반대로 배치됩니다.

---

<!-- split-top -->
![Header Image](https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&h=300&q=80)

### 상하 분할 레이아웃 (Split Top)
- \`<!-- split-top -->\` 매크로를 사용했습니다.
- 이미지는 상단에 넓게, 텍스트는 하단에 정렬됩니다.

---

<!-- animate -->
## 프래그먼트 애니메이션 🪄
\`<!-- animate -->\` 매크로를 추가하면 하위 요소들이 하나씩 등장합니다.

1. 첫 번째로 나타나는 항목입니다.
2. 클릭(또는 방향키) 시 두 번째 항목이 나타납니다.
3. 세 번째 항목도 부드럽게 등장합니다!

> 애니메이션은 프레젠테이션 모드에서만 동작하며, 프리뷰 화면에서는 항상 다 보여집니다.

---

## 코드 하이라이팅 및 표 📊

다양한 언어의 코드를 지원합니다:

\`\`\`javascript
const presenter = new Presenter();
presenter.start(slides); // 완벽한 전체화면 모드 시작!
\`\`\`

| 기능 | 지원여부 | 설명 |
|------|----------|------|
| **가로 목차** | ✅ | \`<!-- toc-h -->\` |
| **세로 목차** | ✅ | \`<!-- toc -->\` |
| **애니메이션** | ✅ | \`<!-- animate -->\` |

---

# 끝입니다 🎉
지금 바로 여러분의 슬라이드를 만들어보세요!
`;
