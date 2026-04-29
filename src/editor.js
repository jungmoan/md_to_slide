// editor.js — 에디터 + Markdown 파싱 + 실시간 프리뷰

import { marked } from 'marked';
import hljs from 'highlight.js';

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
    this.debounceTimer = null;
    this.onSlidesChange = null; // callback

    this._bindEvents();
  }

  _bindEvents() {
    this.textarea.addEventListener('input', () => {
      this._debounceUpdate();
    });

    // Tab key support
    this.textarea.addEventListener('keydown', (e) => {
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

    // Split by --- on its own line (horizontal rule)
    const parts = markdown.split(/\n---\n/);
    const slides = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const html = marked.parse(trimmed);

      // Detect TOC slides
      if (trimmed.includes('<!-- toc-h -->')) {
        const cleanHtml = html.replace(/<!--\s*toc-h\s*-->/g, '');
        slides.push(`<div class="slide-toc slide-toc-horizontal">${cleanHtml}</div>`);
      } else if (trimmed.includes('<!-- toc -->')) {
        const cleanHtml = html.replace(/<!--\s*toc\s*-->/g, '');
        slides.push(`<div class="slide-toc">${cleanHtml}</div>`);
      } else {
        slides.push(html);
      }
    }

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
        (html, i) => `
        <div class="slide-card" data-slide-index="${i}" title="클릭하여 ${i + 1}번 슬라이드부터 시작">
          <div class="slide-card-inner slide-content">${html}</div>
          <span class="slide-card-number">${i + 1}</span>
        </div>
      `
      )
      .join('');
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
export const DEFAULT_CONTENT = `# MD Slide 🎬
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
