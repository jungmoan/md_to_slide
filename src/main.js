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
import { initThemeDropdown, applyTheme } from './theme.js';
import {
  saveContent, loadContent, exportFile, importFile,
  getAllDocuments, getDocument, getCurrentDocId, setCurrentDocId, createDocument, deleteDocument,
  getDocumentSettings, updateDocumentSettings, getDocumentHistory, saveHistorySnapshot, saveImage
} from './storage.js';

// --- DOM Elements ---
const textareaEl = document.getElementById('markdown-editor');
const previewEl = document.getElementById('preview-content');
const slideCountEl = document.getElementById('slide-count-label');
const charCountEl = document.getElementById('char-count');
const statusEl = document.getElementById('status-text');
const btnPresent = document.getElementById('btn-present');
const btnImport = document.getElementById('btn-import');
const btnExport = document.getElementById('btn-export');
const btnNew = document.getElementById('btn-new');
const btnDocs = document.getElementById('btn-docs');
const docsDropdownContainer = document.getElementById('docs-dropdown-container');
const docsMenu = document.getElementById('docs-menu');
const btnClear = document.getElementById('btn-clear');
const btnImage = document.getElementById('btn-image');
const btnCover = document.getElementById('btn-cover');
const btnToc = document.getElementById('btn-toc');
const btnBr = document.getElementById('btn-br');
const btnAnimate = document.getElementById('btn-animate');
const tocDropdown = document.getElementById('toc-dropdown');
const tocMenu = document.getElementById('toc-menu');
const fileInput = document.getElementById('file-input');

// --- Settings Sidebar Elements ---
const btnSettings = document.getElementById('btn-settings');
const settingsSidebar = document.getElementById('settings-sidebar');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const themeSelectSidebar = document.getElementById('theme-select-sidebar');
const btnLayoutSidebar = document.getElementById('btn-layout-sidebar');
const inputLineHeight = document.getElementById('input-line-height');
const labelLineHeight = document.getElementById('label-line-height');
const checkShowNumber = document.getElementById('check-show-number');

// --- Search Bar Elements ---
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const searchCount = document.getElementById('search-count');
const btnFindPrev = document.getElementById('btn-find-prev');
const btnFindNext = document.getElementById('btn-find-next');
const replaceInput = document.getElementById('replace-input');
const btnReplace = document.getElementById('btn-replace');
const btnReplaceAll = document.getElementById('btn-replace-all');
const btnCloseSearch = document.getElementById('btn-close-search');

// --- Export Elements ---
const btnExportTrigger = document.getElementById('btn-export-trigger');
const exportMenu = document.getElementById('export-menu');
const btnExportMd = document.getElementById('btn-export-md');
const btnExportPdf = document.getElementById('btn-export-pdf');
const printContainer = document.getElementById('print-container');

// --- Modal Elements ---
const historyModal = document.getElementById('history-modal');
const modalHistoryList = document.getElementById('modal-history-list');
const modalHistoryPreview = document.getElementById('modal-history-preview');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnModalRestore = document.getElementById('btn-modal-restore');
const toastContainer = document.getElementById('toast-container');

// Global State
let currentLayout = 'default';
let currentTheme = 'midnight';
let currentSettings = {
  lineHeight: 1.6,
  showNumber: true
};

// --- Initialize ---
const editor = new Editor(textareaEl, previewEl, slideCountEl, charCountEl, statusEl);
const presenter = new Presenter();

async function initApp() {
  // Load saved content or default
  let saved = await loadContent();
  if (!saved && !getCurrentDocId()) {
    const id = await createDocument(DEFAULT_CONTENT);
    setCurrentDocId(id);
    saved = DEFAULT_CONTENT;
  }
  
  editor.setContent(saved || DEFAULT_CONTENT);

  // Auto-save on input
  textareaEl.addEventListener('input', () => {
    saveContent(textareaEl.value, currentTheme, currentLayout);
  });
  
  const id = getCurrentDocId();
  if (id) {
    const settings = await getDocumentSettings(id);
    currentTheme = settings.theme || 'midnight';
    currentLayout = settings.layout || 'default';
    currentSettings = settings.settings || { lineHeight: 1.6, showNumber: true };
  }
  
  applyTheme(currentTheme);
  themeSelectSidebar.value = currentTheme;
  applyLayoutUI(currentLayout);
  applySettingsUI(currentSettings);
}

function applySettingsUI(settings) {
  currentSettings = { ...currentSettings, ...settings };
  
  // Apply Line Height
  document.documentElement.style.setProperty('--slide-line-height', currentSettings.lineHeight);
  inputLineHeight.value = currentSettings.lineHeight;
  labelLineHeight.textContent = currentSettings.lineHeight;
  
  // Apply Show Number
  document.documentElement.setAttribute('data-show-number', currentSettings.showNumber);
  checkShowNumber.checked = currentSettings.showNumber;
}

function applyLayoutUI(layout) {
  if (layout === 'center') {
    document.documentElement.setAttribute('data-layout', 'center');
    btnLayoutSidebar.querySelector('span').textContent = '좌상단 정렬';
    btnLayoutSidebar.classList.add('active');
  } else {
    document.documentElement.removeAttribute('data-layout');
    btnLayoutSidebar.querySelector('span').textContent = '가운데 정렬';
    btnLayoutSidebar.classList.remove('active');
  }
}

// --- Toast UI ---
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);
  
  // Remove from DOM after animation
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// --- Keyboard Shortcuts ---
window.addEventListener('keydown', async (e) => {
  // Cmd/Ctrl + S -> Manual Save & Versioning
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault(); // Stop browser save dialog
    
    const id = getCurrentDocId();
    if (id) {
      const content = editor.getContent();
      await saveContent(content, currentTheme, currentLayout);
      await saveHistorySnapshot(id, content, currentTheme, currentLayout);
      
      showToast('성공적으로 저장되었습니다 (새 버전 생성)');
    }
  }
});

btnSettings.addEventListener('click', () => {
  settingsSidebar.classList.add('open');
});

btnCloseSidebar.addEventListener('click', () => {
  settingsSidebar.classList.remove('open');
});

// Sidebar Controls
themeSelectSidebar.addEventListener('change', async (e) => {
  currentTheme = e.target.value;
  applyTheme(currentTheme);
  const id = getCurrentDocId();
  if (id) await updateDocumentSettings(id, currentTheme, currentLayout, currentSettings);
});

btnLayoutSidebar.addEventListener('click', async () => {
  currentLayout = currentLayout === 'center' ? 'default' : 'center';
  applyLayoutUI(currentLayout);
  const id = getCurrentDocId();
  if (id) {
    await updateDocumentSettings(id, currentTheme, currentLayout, currentSettings);
  }
});

inputLineHeight.addEventListener('input', (e) => {
  const val = e.target.value;
  applySettingsUI({ lineHeight: val });
});

inputLineHeight.addEventListener('change', async () => {
  const id = getCurrentDocId();
  if (id) await updateDocumentSettings(id, currentTheme, currentLayout, currentSettings);
});

checkShowNumber.addEventListener('change', async (e) => {
  const val = e.target.checked;
  applySettingsUI({ showNumber: val });
  const id = getCurrentDocId();
  if (id) await updateDocumentSettings(id, currentTheme, currentLayout, currentSettings);
});

// Run Init
initApp();

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
async function renderDocsMenu() {
  const docs = await getAllDocuments();
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
        <button class="btn-doc-history" data-id="${doc.id}" title="버전 기록" style="background:none; border:none; color:inherit; cursor:pointer; padding:4px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </button>
        <button class="btn-doc-delete" data-id="${doc.id}" title="삭제" ${isActive ? 'disabled style="opacity:0.2; cursor:not-allowed;"' : ''}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
  }).join('');
}

btnDocs.addEventListener('click', async (e) => {
  e.stopPropagation();
  await renderDocsMenu();
  docsDropdownContainer.classList.toggle('open');
});

docsMenu.addEventListener('click', async (e) => {
  const historyBtn = e.target.closest('.btn-doc-history');
  if (historyBtn) {
    e.stopPropagation();
    const id = historyBtn.getAttribute('data-id');
    await showVersionHistory(id);
    return;
  }

  const deleteBtn = e.target.closest('.btn-doc-delete');
  if (deleteBtn) {
    e.stopPropagation();
    if (deleteBtn.disabled) return;
    const id = deleteBtn.getAttribute('data-id');
    if (confirm('이 문서를 삭제하시겠습니까?')) {
      await deleteDocument(id);
      await renderDocsMenu();
    }
    return;
  }

  const docItem = e.target.closest('.doc-info');
  if (docItem) {
    const parent = docItem.parentElement;
    const id = parent.getAttribute('data-id');
    if (id !== getCurrentDocId()) {
      setCurrentDocId(id);
      const doc = await getDocument(id);
      if (doc) {
        currentTheme = doc.theme || 'midnight';
        currentLayout = doc.layout || 'default';
        currentSettings = doc.settings || { lineHeight: 1.6, showNumber: true };
        
        applyTheme(currentTheme);
        themeSelectSidebar.value = currentTheme;
        applyLayoutUI(currentLayout);
        applySettingsUI(currentSettings);
        
        editor.setContent(doc.content);
        statusEl.textContent = '문서를 불러왔습니다';
      }
    }
    docsDropdownContainer.classList.remove('open');
  }
});

btnNew.addEventListener('click', async () => {
  const id = await createDocument(FULL_EXAMPLE_CONTENT);
  setCurrentDocId(id);
  currentTheme = 'midnight';
  currentLayout = 'default';
  currentSettings = { lineHeight: 1.6, showNumber: true };
  
  applyTheme(currentTheme);
  themeSelectSidebar.value = currentTheme;
  applyLayoutUI(currentLayout);
  applySettingsUI(currentSettings);
  
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

// --- Br Macro ---
btnBr.addEventListener('click', () => {
  const textarea = textareaEl;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  textarea.value = value.substring(0, start) + '<br>\n' + value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + 5;
  textarea.focus();

  editor.updatePreview();
  saveContent(textarea.value);
  statusEl.textContent = '강제 개행(<br>) 삽입 완료';
});

// --- Animate Macro ---
btnAnimate.addEventListener('click', () => {
  const textarea = textareaEl;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  const macro = '\n<!-- animate -->\n';
  textarea.value = value.substring(0, start) + macro + value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + macro.length;
  textarea.focus();

  editor.updatePreview();
  saveContent(textarea.value);
  statusEl.textContent = '애니메이션 매크로 삽입 완료';
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
    saveContent(editor.getContent(), currentTheme, currentLayout);
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
    saveContent(text, currentTheme, currentLayout, currentSettings);
    showToast(`"${file.name}" 가져오기 완료`);
  } catch (err) {
    showToast('파일 가져오기 실패');
  }
  fileInput.value = '';
});

// --- Export Logic ---
btnExportTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle('open');
});

document.addEventListener('click', () => {
  exportMenu.classList.remove('open');
});

btnExportMd.addEventListener('click', () => {
  exportFile(editor.getContent());
  showToast('마크다운 파일 내보내기 완료');
});

btnExportPdf.addEventListener('click', async () => {
  const slides = editor.slides;
  if (!slides || slides.length === 0) {
    showToast('내보낼 슬라이드가 없습니다.');
    return;
  }

  showToast('PDF 생성 중... 잠시만 기다려주세요.');

  // Populate print container
  printContainer.innerHTML = '';
  // Apply current theme and layout to the container
  printContainer.setAttribute('data-theme', currentTheme);
  printContainer.setAttribute('data-layout', currentLayout);
  
  slides.forEach(slide => {
    const slideDiv = document.createElement('div');
    slideDiv.className = 'print-slide slide-content';
    slideDiv.innerHTML = slide.html;
    printContainer.appendChild(slideDiv);
  });

  const opt = {
    margin:       0,
    filename:     `${extractTitle(editor.getContent())}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') 
    },
    jsPDF:        { unit: 'px', format: [1280, 720], orientation: 'landscape' },
    pagebreak:    { mode: 'avoid-all', before: '.print-slide' }
  };

  try {
    await html2pdf().set(opt).from(printContainer).save();
    showToast('PDF 내보내기 완료');
  } catch (err) {
    console.error('PDF Export Error:', err);
    showToast('PDF 내보내기 실패');
  } finally {
    printContainer.innerHTML = '';
  }
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
  // Cmd/Ctrl + F -> Find Bar
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    searchBar.classList.add('open');
    searchInput.focus();
    searchInput.select();
    return;
  }

  // Escape -> Close Sidebar or Search Bar
  if (e.key === 'Escape') {
    if (searchBar.classList.contains('open')) {
      searchBar.classList.remove('open');
      textareaEl.focus();
    }
    if (settingsSidebar.classList.contains('open')) {
      settingsSidebar.classList.remove('open');
    }
  }

  // Ctrl+Enter → Start slideshow
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    startPresentation();
    return;
  }
});

// --- Find & Replace Bar Logic ---
btnCloseSearch.addEventListener('click', () => {
  searchBar.classList.remove('open');
  textareaEl.focus();
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) {
      editor.find(searchInput.value, 'prev');
    } else {
      editor.find(searchInput.value, 'next');
    }
  }
});

btnFindNext.addEventListener('click', () => editor.find(searchInput.value, 'next'));
btnFindPrev.addEventListener('click', () => editor.find(searchInput.value, 'prev'));

btnReplace.addEventListener('click', () => {
  const success = editor.replace(searchInput.value, replaceInput.value);
  if (success) {
    editor.find(searchInput.value, 'next');
  }
});

btnReplaceAll.addEventListener('click', () => {
  const count = editor.replaceAll(searchInput.value, replaceInput.value);
  showToast(`${count}개의 항목이 치환되었습니다`);
});

// --- Drag & Drop / Paste for Images & Markdown ---
async function handleImageFile(file) {
  if (!file.type.startsWith('image/')) return false;
  
  statusEl.textContent = '이미지 처리 중...';
  const reader = new FileReader();
  
  return new Promise((resolve) => {
    reader.onload = async (e) => {
      const base64 = e.target.result;
      const imgId = await saveImage(base64);
      
      const textarea = textareaEl;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      const markdownImage = `![image](local-img://${imgId})`;
      
      textarea.value = value.substring(0, start) + markdownImage + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + markdownImage.length;
      textarea.focus();
      
      editor.updatePreview();
      saveContent(textarea.value, currentTheme, currentLayout);
      statusEl.textContent = '이미지 삽입 완료';
      resolve(true);
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  
  // Handle image drop
  if (file.type.startsWith('image/')) {
    await handleImageFile(file);
    return;
  }
  
  if (!file.name.match(/\.(md|txt|markdown)$/i)) {
    statusEl.textContent = 'Markdown 파일 또는 이미지만 지원합니다';
    return;
  }
  try {
    const text = await importFile(file);
    editor.setContent(text);
    saveContent(text, currentTheme, currentLayout);
    statusEl.textContent = `"${file.name}" 가져오기 완료`;
  } catch (err) {
    statusEl.textContent = '파일 가져오기 실패';
  }
});

textareaEl.addEventListener('paste', async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      e.preventDefault();
      const file = items[i].getAsFile();
      await handleImageFile(file);
      return;
    }
  }
});

// --- Version History UI ---
let selectedVersionData = null;
let currentDocIdForModal = null;

async function showVersionHistory(docId) {
  const history = await getDocumentHistory(docId);
  if (!history || history.length === 0) {
    alert('저장된 버전 기록이 없습니다.');
    return;
  }
  
  currentDocIdForModal = docId;
  selectedVersionData = null;
  btnModalRestore.disabled = true;
  modalHistoryPreview.innerHTML = '<div class="empty-msg">버전을 선택하여 내용을 확인하세요</div>';
  
  // Render history list (newest first)
  modalHistoryList.innerHTML = history.map((h, i) => {
    const dateObj = new Date(h.savedAt);
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString();
    return `
      <div class="history-item" data-index="${i}">
        <div class="history-item-date">${dateStr}</div>
        <div class="history-item-time">${timeStr}</div>
      </div>
    `;
  }).join('');
  
  // Bind clicks to items
  const items = modalHistoryList.querySelectorAll('.history-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      const idx = parseInt(item.getAttribute('data-index'));
      const selected = history[idx];
      if (selected) {
        selectedVersionData = selected;
        modalHistoryPreview.textContent = selected.content;
        btnModalRestore.disabled = false;
      }
    });
  });
  
  historyModal.classList.add('open');
}

function closeHistoryModal() {
  historyModal.classList.remove('open');
}

btnCloseModal.addEventListener('click', closeHistoryModal);
btnModalCancel.addEventListener('click', closeHistoryModal);

// Close on outside click
historyModal.addEventListener('click', (e) => {
  if (e.target === historyModal) closeHistoryModal();
});

btnModalRestore.addEventListener('click', async () => {
  if (!selectedVersionData || !currentDocIdForModal) return;
  
  if (confirm('선택한 버전으로 복원하시겠습니까? 현재 상태는 새로운 버전으로 자동 저장됩니다.')) {
    // 1. Ensure current document is updated in state if different
    const idToRestore = currentDocIdForModal;
    setCurrentDocId(idToRestore);
    
    // 2. Save current editor state to its own history before overwriting (optional but safe)
    await saveContent(editor.getContent(), currentTheme, currentLayout);
    
    // 3. Apply selected version to local state
    currentTheme = selectedVersionData.theme || 'midnight';
    currentLayout = selectedVersionData.layout || 'default';
    currentSettings = selectedVersionData.settings || { lineHeight: 1.6, showNumber: true };
    
    applyTheme(currentTheme);
    themeSelectSidebar.value = currentTheme;
    applyLayoutUI(currentLayout);
    applySettingsUI(currentSettings);
    
    editor.setContent(selectedVersionData.content);
    
    // 4. Update DB for the target document
    await updateDocumentSettings(idToRestore, currentTheme, currentLayout, currentSettings);
    await saveContent(selectedVersionData.content, currentTheme, currentLayout, idToRestore);
    
    statusEl.textContent = '선택한 버전으로 복원되었습니다';
    closeHistoryModal();
  }
});

