// main.js — 앱 진입점

// --- Styles ---
import './styles/index.css';
import './styles/editor.css';
import './styles/presenter.css';
import './styles/slide.css';
import 'highlight.js/styles/github-dark.min.css';

// --- Modules ---
import { Editor, DEFAULT_CONTENT, FULL_EXAMPLE_CONTENT } from './editor.js';
import { Presenter } from './presenter.js';
import { initTheme } from './theme.js';
import {
  saveContent, loadContent, exportFile, importFile, saveLayout, loadLayout,
  getAllDocuments, getDocument, getCurrentDocId, setCurrentDocId, createDocument, deleteDocument
} from './storage.js';

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
const btnNew = document.getElementById('btn-new');
const btnDocs = document.getElementById('btn-docs');
const docsDropdownContainer = document.getElementById('docs-dropdown-container');
const docsMenu = document.getElementById('docs-menu');
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
  if (docsDropdownContainer && !docsDropdownContainer.contains(e.target)) {
    docsDropdownContainer.classList.remove('open');
  }
});

// --- Docs & New Slide ---
function renderDocsMenu() {
  const docs = getAllDocuments();
  const currentId = getCurrentDocId();

  if (docs.length === 0) {
    docsMenu.innerHTML = '<div style="padding: 8px 12px; color: var(--text-muted); font-size: 0.8rem;">저장된 문서가 없습니다.</div>';
    return;
  }

  docsMenu.innerHTML = docs.map(doc => {
    const isActive = doc.id === currentId;
    const date = new Date(doc.updatedAt).toLocaleString();
    return `
      <div class="doc-menu-item ${isActive ? 'active' : ''}" data-id="${doc.id}">
        <div class="doc-info" style="flex:1; cursor:pointer;">
          <span class="doc-title">${doc.title}</span>
          <span class="doc-date">${date}</span>
        </div>
        <button class="btn-doc-delete" data-id="${doc.id}" title="삭제" ${isActive ? 'disabled style="opacity:0.2; cursor:not-allowed;"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
  }).join('');
}

btnDocs.addEventListener('click', (e) => {
  e.stopPropagation();
  renderDocsMenu();
  docsDropdownContainer.classList.toggle('open');
});

docsMenu.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.btn-doc-delete');
  if (deleteBtn) {
    e.stopPropagation();
    if (deleteBtn.disabled) return;
    const id = deleteBtn.getAttribute('data-id');
    if (confirm('이 문서를 삭제하시겠습니까?')) {
      deleteDocument(id);
      renderDocsMenu();
    }
    return;
  }

  const docItem = e.target.closest('.doc-info');
  if (docItem) {
    const parent = docItem.parentElement;
    const id = parent.getAttribute('data-id');
    if (id !== getCurrentDocId()) {
      setCurrentDocId(id);
      const doc = getDocument(id);
      if (doc) {
        editor.setContent(doc.content);
        statusEl.textContent = '문서를 불러왔습니다';
      }
    }
    docsDropdownContainer.classList.remove('open');
  }
});

btnNew.addEventListener('click', () => {
  createDocument(FULL_EXAMPLE_CONTENT);
  editor.setContent(FULL_EXAMPLE_CONTENT);
  statusEl.textContent = '새 슬라이드를 생성했습니다';
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
