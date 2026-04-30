// storage.js — Backend API 기반 데이터 관리 (SQLite)

const CURRENT_ID_KEY = 'md_slide_current_id';

export function extractTitle(content) {
  if (!content) return '제목 없는 슬라이드';
  const match = content.match(/^#\s+(.*)/m);
  return match ? match[1].trim() : '제목 없는 슬라이드';
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- 다중 문서 API ---
export async function getAllDocuments() {
  try {
    const response = await fetch('/api/docs');
    return await response.json();
  } catch (e) {
    console.error('Failed to fetch documents:', e);
    return [];
  }
}

export async function getDocument(id) {
  if (!id) return null;
  try {
    const response = await fetch(`/api/docs/${id}`);
    if (response.status === 404) return null;
    return await response.json();
  } catch (e) {
    console.error('Failed to get document:', e);
    return null;
  }
}

export function getCurrentDocId() {
  return localStorage.getItem(CURRENT_ID_KEY) || null;
}

export function setCurrentDocId(id) {
  if (id) {
    localStorage.setItem(CURRENT_ID_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_ID_KEY);
  }
}

export async function saveDocument(id, content, theme, layout) {
  if (!id) return;
  const title = extractTitle(content);
  const updatedAt = Date.now();
  
  // 기존 설정 유지를 위해 먼저 조회
  const existingDoc = await getDocument(id);
  const settings = existingDoc?.settings || {
    lineHeight: 1.6,
    showNumber: true
  };

  const payload = {
    id,
    title,
    content,
    theme: theme || existingDoc?.theme || 'midnight',
    layout: layout || existingDoc?.layout || 'default',
    settings,
    updatedAt
  };

  try {
    await fetch(`/api/docs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('Failed to save document:', e);
  }
}

export async function saveHistorySnapshot(id, content, theme, layout) {
  if (!id) return;
  const historyId = generateId();
  const payload = {
    historyId,
    docId: id,
    content,
    theme: theme || 'midnight',
    layout: layout || 'default',
    savedAt: Date.now()
  };

  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

export async function createDocument(content) {
  const id = generateId();
  await saveDocument(id, content, 'midnight', 'default');
  setCurrentDocId(id);
  return id;
}

export async function deleteDocument(id) {
  try {
    await fetch(`/api/docs/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.error('Failed to delete document:', e);
  }
}

export async function loadContent() {
  const currentId = getCurrentDocId();
  if (currentId) {
    const doc = await getDocument(currentId);
    if (doc) return doc.content;
  }
  const docs = await getAllDocuments();
  if (docs.length > 0) {
    setCurrentDocId(docs[0].id);
    return docs[0].content;
  }
  return null;
}

export async function saveContent(markdown, theme, layout, id) {
  const targetId = id || getCurrentDocId();
  if (targetId) {
    await saveDocument(targetId, markdown, theme, layout);
  } else {
    await createDocument(markdown);
  }
}

// --- 문서별 설정 (Theme/Layout) ---
export async function getDocumentSettings(id) {
  const doc = await getDocument(id);
  return {
    theme: doc?.theme || 'midnight',
    layout: doc?.layout || 'default',
    settings: doc?.settings || {
      lineHeight: 1.6,
      showNumber: true
    }
  };
}

export async function updateDocumentSettings(id, theme, layout, settings) {
  const doc = await getDocument(id);
  if (doc) {
    if (theme) doc.theme = theme;
    if (layout) doc.layout = layout;
    if (settings) doc.settings = { ...doc.settings, ...settings };
    doc.updatedAt = Date.now();
    
    try {
      await fetch(`/api/docs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
    } catch (e) {
      console.error('Failed to update settings:', e);
    }
  }
}

// History API
export async function getDocumentHistory(docId) {
  if (!docId) return [];
  try {
    const response = await fetch(`/api/history/${docId}`);
    return await response.json();
  } catch (e) {
    console.error('Failed to fetch history:', e);
    return [];
  }
}

// --- Images ---
export async function saveImage(base64Data) {
  const id = generateId();
  try {
    await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, base64Data })
    });
    return id;
  } catch (e) {
    console.error('Failed to save image:', e);
    return null;
  }
}

export async function getImage(id) {
  try {
    const response = await fetch(`/api/images/${id}`);
    if (response.status === 404) return null;
    const data = await response.json();
    return data.base64Data;
  } catch (e) {
    console.error('Failed to get image:', e);
    return null;
  }
}

// --- 내보내기 & 가져오기 (클라이언트 전용) ---
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
