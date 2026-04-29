// storage.js — localStorage 다중 문서 관리

const DOCS_KEY = 'md_slide_docs';
const CURRENT_ID_KEY = 'md_slide_current_id';
const LEGACY_KEY = 'md_slide_content'; // 기존 단일 저장 키 (마이그레이션용)
const THEME_KEY = 'md_slide_theme';
const LAYOUT_KEY = 'md_slide_layout';

// --- 유틸리티 ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function extractTitle(content) {
  const match = content.match(/^#\s+(.*)/m);
  return match ? match[1].replace(/[*_`~]/g, '').trim().substring(0, 40) : '제목 없음';
}

// --- 다중 문서 관리 ---

/** 기존 단일 저장 데이터를 다중 문서 형식으로 마이그레이션 */
export function migrateIfNeeded() {
  try {
    const docs = localStorage.getItem(DOCS_KEY);
    if (docs) return; // 이미 마이그레이션됨

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && legacy.trim()) {
      const doc = {
        id: generateId(),
        title: extractTitle(legacy),
        content: legacy,
        updatedAt: Date.now(),
      };
      localStorage.setItem(DOCS_KEY, JSON.stringify([doc]));
      localStorage.setItem(CURRENT_ID_KEY, doc.id);
      // 기존 키는 삭제하지 않음 (안전을 위해 보존)
    }
  } catch (e) {
    console.warn('마이그레이션 실패:', e);
  }
}

/** 모든 문서 목록 반환 (최신순) */
export function getAllDocuments() {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    if (!raw) return [];
    const docs = JSON.parse(raw);
    return docs.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (e) {
    return [];
  }
}

/** 특정 문서 가져오기 */
export function getDocument(id) {
  const docs = getAllDocuments();
  return docs.find((d) => d.id === id) || null;
}

/** 문서 저장 (기존 문서 업데이트) */
export function saveDocument(id, content) {
  try {
    const docs = getAllDocuments();
    const idx = docs.findIndex((d) => d.id === id);
    const title = extractTitle(content);
    if (idx >= 0) {
      docs[idx].content = content;
      docs[idx].title = title;
      docs[idx].updatedAt = Date.now();
    } else {
      // 문서가 없으면 새로 생성
      docs.push({ id, title, content, updatedAt: Date.now() });
    }
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch (e) {
    console.warn('문서 저장 실패:', e);
  }
}

/** 새 문서 생성 → ID 반환 */
export function createDocument(content = '') {
  try {
    const docs = getAllDocuments();
    const doc = {
      id: generateId(),
      title: extractTitle(content),
      content,
      updatedAt: Date.now(),
    };
    docs.push(doc);
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
    setCurrentDocId(doc.id);
    return doc.id;
  } catch (e) {
    console.warn('문서 생성 실패:', e);
    return null;
  }
}

/** 문서 삭제 */
export function deleteDocument(id) {
  try {
    let docs = getAllDocuments();
    docs = docs.filter((d) => d.id !== id);
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch (e) {
    console.warn('문서 삭제 실패:', e);
  }
}

/** 현재 열려있는 문서 ID 저장 */
export function setCurrentDocId(id) {
  try {
    localStorage.setItem(CURRENT_ID_KEY, id);
  } catch (e) {}
}

/** 현재 열려있는 문서 ID 로드 */
export function getCurrentDocId() {
  try {
    return localStorage.getItem(CURRENT_ID_KEY);
  } catch (e) {
    return null;
  }
}

// --- 테마 / 레이아웃 (기존 유지) ---

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

// --- 파일 가져오기 / 내보내기 (기존 유지) ---

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
