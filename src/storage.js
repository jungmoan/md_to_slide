// storage.js — localStorage 관리

const DOCS_KEY = 'md_slide_docs';
const CURRENT_ID_KEY = 'md_slide_current_id';
const LEGACY_STORAGE_KEY = 'md_slide_content';

const THEME_KEY = 'md_slide_theme';
const LAYOUT_KEY = 'md_slide_layout';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function extractTitle(content) {
  const match = content.match(/^#\s+(.*)/m);
  return match ? match[1].trim() : '제목 없는 슬라이드';
}

// --- 문서 마이그레이션 및 초기화 ---
function initDocs() {
  let docs = [];
  try {
    const saved = localStorage.getItem(DOCS_KEY);
    if (saved) {
      docs = JSON.parse(saved);
    } else {
      // 마이그레이션: 기존 단일 문서가 있으면 첫 문서로 저장
      const legacyContent = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyContent && legacyContent.trim() !== '') {
        const id = generateId();
        docs.push({
          id,
          title: extractTitle(legacyContent),
          content: legacyContent,
          updatedAt: Date.now()
        });
        localStorage.setItem(CURRENT_ID_KEY, id);
      }
      localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
    }
  } catch (e) {
    console.warn('문서 초기화 실패:', e);
  }
  return docs;
}

// --- 다중 문서 API ---
export function getAllDocuments() {
  return initDocs().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDocument(id) {
  const docs = initDocs();
  return docs.find(doc => doc.id === id) || null;
}

export function getCurrentDocId() {
  return localStorage.getItem(CURRENT_ID_KEY) || null;
}

export function setCurrentDocId(id) {
  localStorage.setItem(CURRENT_ID_KEY, id);
}

export function saveDocument(id, content) {
  if (!id) return;
  const docs = initDocs();
  const index = docs.findIndex(doc => doc.id === id);
  const title = extractTitle(content);
  const updatedAt = Date.now();

  if (index >= 0) {
    docs[index] = { ...docs[index], content, title, updatedAt };
  } else {
    docs.push({ id, title, content, updatedAt });
  }

  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch (e) {
    console.warn('문서 저장 실패:', e);
  }
}

export function createDocument(content) {
  const id = generateId();
  saveDocument(id, content);
  setCurrentDocId(id);
  return id;
}

export function deleteDocument(id) {
  let docs = initDocs();
  docs = docs.filter(doc => doc.id !== id);
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch (e) {}
}

// 기존 하위 호환을 위한 함수
export function saveContent(markdown) {
  const currentId = getCurrentDocId();
  if (currentId) {
    saveDocument(currentId, markdown);
  } else {
    createDocument(markdown);
  }
}

export function loadContent() {
  const currentId = getCurrentDocId();
  if (currentId) {
    const doc = getDocument(currentId);
    if (doc) return doc.content;
  }
  // 활성화된 문서가 없으면 가장 최근 문서 로드
  const docs = getAllDocuments();
  if (docs.length > 0) {
    setCurrentDocId(docs[0].id);
    return docs[0].content;
  }
  return null;
}

// --- 테마 & 레이아웃 ---
export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.warn('테마 저장 실패:', e);
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'midnight';
  } catch (e) {
    return 'midnight';
  }
}

export function saveLayout(layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch (e) {
    console.warn('레이아웃 저장 실패:', e);
  }
}

export function loadLayout() {
  try {
    return localStorage.getItem(LAYOUT_KEY) || 'default';
  } catch (e) {
    return 'default';
  }
}

// --- 내보내기 & 가져오기 ---
export function exportFile(markdown, filename = 'slides.md') {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file);
  });
}
