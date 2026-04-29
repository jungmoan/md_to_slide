// main.js — 앱 진입점

// --- Styles ---
import './styles/index.css';
import './styles/editor.css';
import './styles/presenter.css';
import './styles/slide.css';
import 'highlight.js/styles/github-dark.min.css';

// --- Modules ---
import { Editor, DEFAULT_CONTENT } from './editor.js';
import { Presenter } from './presenter.js';
import { initTheme } from './theme.js';
import { saveContent, loadContent, exportFile, importFile, saveLayout, loadLayout } from './storage.js';

// --- DOM Elements ---
const textareaEl = document.getElementById('markdown-editor');
const previewEl = document.getElementById('preview-content');
const slideCountEl = document.getElementById('slide-count-label');
const charCountEl = document.getElementById('char-count');
const statusEl = document.getElementById('status-text');
const themeSelect = document.getElementById('theme-select');
const btnPresent = document.getElementById('btn-present');
const btnImport = document.getElementById('btn-import');
const btnExport = document.getElementById('btn-export');
const btnClear = document.getElementById('btn-clear');
const btnLayout = document.getElementById('btn-layout');
const btnImage = document.getElementById('btn-image');
const btnCover = document.getElementById('btn-cover');
const btnToc = document.getElementById('btn-toc');
const tocDropdown = document.getElementById('toc-dropdown');
const tocMenu = document.getElementById('toc-menu');
const fileInput = document.getElementById('file-input');

// --- Initialize ---
const editor = new Editor(textareaEl, previewEl, slideCountEl, charCountEl, statusEl);
const presenter = new Presenter();

// Theme
initTheme(themeSelect);

// Layout (default / center)
let currentLayout = loadLayout();
applyLayout(currentLayout);

function applyLayout(layout) {
  if (layout === 'center') {
    document.documentElement.setAttribute('data-layout', 'center');
    btnLayout.querySelector('span').textContent = '좌상단';
  } else {
    document.documentElement.removeAttribute('data-layout');
    btnLayout.querySelector('span').textContent = '가운데';
  }
}

btnLayout.addEventListener('click', () => {
  currentLayout = currentLayout === 'center' ? 'default' : 'center';
  applyLayout(currentLayout);
  saveLayout(currentLayout);
  statusEl.textContent = currentLayout === 'center' ? '가운데 정렬 모드' : '좌상단 정렬 모드';
});

// Load saved content or default
const saved = loadContent();
editor.setContent(saved || DEFAULT_CONTENT);

// --- TOC Dropdown ---
btnToc.addEventListener('click', (e) => {
  e.stopPropagation();
  tocDropdown.classList.toggle('open');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!tocDropdown.contains(e.target)) {
    tocDropdown.classList.remove('open');
  }
});

// Insert TOC trigger at cursor position
tocMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('.toc-menu-item');
  if (!btn) return;

  const type = btn.dataset.toc;
  const trigger = type === 'horizontal' ? '<!-- toc-h -->' : '<!-- toc -->';

  const textarea = textareaEl;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  // Insert trigger text at cursor
  textarea.value = value.substring(0, start) + trigger + '\n' + value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + trigger.length + 1;
  textarea.focus();

  // Trigger update
  editor.updatePreview();
  saveContent(textarea.value);

  // Close dropdown
  tocDropdown.classList.remove('open');
  statusEl.textContent = type === 'horizontal' ? '목차 (가로) 삽입 완료' : '목차 (세로) 삽입 완료';
});

// --- Cover Slide ---
btnCover.addEventListener('click', () => {
  const textarea = textareaEl;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  textarea.value = value.substring(0, start) + '<!-- cover -->\n' + value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + 15;
  textarea.focus();

  editor.updatePreview();
  saveContent(textarea.value);
  statusEl.textContent = '제목(Cover) 슬라이드 매크로 삽입 완료';
});

// --- Image Macro ---
btnImage.addEventListener('click', () => {
  const textarea = textareaEl;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  const macro = `<!-- split-left -->\n![이미지 설명](이미지URL_또는_경로)\n\n### 이미지에 대한 설명\n- 내용 1\n- 내용 2\n`;
  
  textarea.value = value.substring(0, start) + macro + value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + macro.length;
  textarea.focus();

  editor.updatePreview();
  saveContent(textarea.value);
  statusEl.textContent = '이미지 분할 레이아웃 삽입 완료';
});

// Auto-save on change
let saveTimer = null;
editor.onSlidesChange = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveContent(editor.getContent());
  }, 500);
};

// --- Slideshow Start ---
function startPresentation(startIndex = 0) {
  const slides = editor.getSlides();
  if (slides.length === 0) {
    statusEl.textContent = '슬라이드가 없습니다. Markdown을 입력하세요.';
    return;
  }
  presenter.start(slides, startIndex);
}

btnPresent.addEventListener('click', () => startPresentation());

// --- Import ---
btnImport.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await importFile(file);
    editor.setContent(text);
    saveContent(text);
    statusEl.textContent = `"${file.name}" 가져오기 완료`;
  } catch (err) {
    statusEl.textContent = '파일 가져오기 실패';
  }
  fileInput.value = '';
});

// --- Export ---
btnExport.addEventListener('click', () => {
  exportFile(editor.getContent());
  statusEl.textContent = '파일 내보내기 완료';
});

// --- Preview Card Interactions ---
previewEl.addEventListener('click', (e) => {
  const playBtn = e.target.closest('.btn-play-from-here');
  if (playBtn) {
    e.stopPropagation();
    const index = parseInt(playBtn.getAttribute('data-slide-index'), 10);
    presenter.start(editor.slides, index);
    return;
  }

  const card = e.target.closest('.slide-card');
  if (card) {
    const offset = parseInt(card.getAttribute('data-offset'), 10);
    if (!isNaN(offset)) {
      textareaEl.focus();
      textareaEl.setSelectionRange(offset, offset);
      // Rough scroll estimation
      const lines = textareaEl.value.substring(0, offset).split('\n').length;
      const lineHeight = 24; // approximate
      textareaEl.scrollTop = Math.max(0, (lines - 5) * lineHeight);
    }
  }
});

// --- Clear ---
btnClear.addEventListener('click', () => {
  if (editor.getContent().trim() && !confirm('모든 내용을 삭제하시겠습니까?')) return;
  editor.clear();
  saveContent('');
  statusEl.textContent = '내용이 삭제되었습니다';
});

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
  // Ctrl+Enter → Start slideshow
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    startPresentation();
    return;
  }

  // Ctrl+S → Export
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    exportFile(editor.getContent());
    statusEl.textContent = '파일 내보내기 완료';
    return;
  }
});

// --- Drag & Drop ---
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  if (!file.name.match(/\.(md|txt|markdown)$/i)) {
    statusEl.textContent = 'Markdown 파일만 지원합니다 (.md, .txt)';
    return;
  }
  try {
    const text = await importFile(file);
    editor.setContent(text);
    saveContent(text);
    statusEl.textContent = `"${file.name}" 가져오기 완료`;
  } catch (err) {
    statusEl.textContent = '파일 가져오기 실패';
  }
});
