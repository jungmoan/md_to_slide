// storage.js — IndexedDB 관리

const DB_NAME = 'md_slide_db';
const DB_VERSION = 1;
const CURRENT_ID_KEY = 'md_slide_current_id';

let dbInstance = null;

function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => reject(e.target.error);

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Documents store
      if (!db.objectStoreNames.contains('docs')) {
        db.createObjectStore('docs', { keyPath: 'id' });
      }
      
      // History (Versioning) store
      if (!db.objectStoreNames.contains('history')) {
        const historyStore = db.createObjectStore('history', { keyPath: 'historyId' });
        historyStore.createIndex('docId', 'docId', { unique: false });
      }

      // Images store
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
    };
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function extractTitle(content) {
  if (!content) return '제목 없는 슬라이드';
  const match = content.match(/^#\s+(.*)/m);
  return match ? match[1].trim() : '제목 없는 슬라이드';
}

// --- DB Helper ---
function txPromise(storeName, mode, callback) {
  return initDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      
      tx.oncomplete = () => resolve(result);
      tx.onerror = (e) => reject(e.target.error);
      
      try {
        const req = callback(store);
        if (req) {
          req.onsuccess = (e) => { result = e.target.result; };
        }
      } catch (e) {
        reject(e);
      }
    });
  });
}

// --- 다중 문서 API ---
export async function getAllDocuments() {
  const docs = await txPromise('docs', 'readonly', store => store.getAll());
  return docs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDocument(id) {
  if (!id) return null;
  return await txPromise('docs', 'readonly', store => store.get(id));
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
  
  const existingDoc = await getDocument(id);
  const newDoc = { 
    id, 
    title, 
    content, 
    theme: theme || existingDoc?.theme || 'midnight', 
    layout: layout || existingDoc?.layout || 'default', 
    updatedAt 
  };

  // Save document
  await txPromise('docs', 'readwrite', store => store.put(newDoc));

  // Save history (Versioning) - we don't save every keystroke, maybe throttle or just save.
  // Actually, for versioning, we save a history snapshot.
  const historyId = generateId();
  await txPromise('history', 'readwrite', store => store.put({
    historyId,
    docId: id,
    content,
    theme: newDoc.theme,
    layout: newDoc.layout,
    savedAt: updatedAt
  }));
}

export async function createDocument(content) {
  const id = generateId();
  await saveDocument(id, content, 'midnight', 'default');
  setCurrentDocId(id);
  return id;
}

export async function deleteDocument(id) {
  await txPromise('docs', 'readwrite', store => store.delete(id));
  
  // Optionally delete history related to this doc
  const db = await initDB();
  const tx = db.transaction('history', 'readwrite');
  const index = tx.objectStore('history').index('docId');
  const req = index.openCursor(IDBKeyRange.only(id));
  req.onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };
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
// We now get them per document
export async function getDocumentSettings(id) {
  const doc = await getDocument(id);
  return {
    theme: doc?.theme || 'midnight',
    layout: doc?.layout || 'default'
  };
}

export async function updateDocumentSettings(id, theme, layout) {
  const doc = await getDocument(id);
  if (doc) {
    doc.theme = theme || doc.theme;
    doc.layout = layout || doc.layout;
    doc.updatedAt = Date.now();
    await txPromise('docs', 'readwrite', store => store.put(doc));
  }
}

// History API
export async function getDocumentHistory(docId) {
  if (!docId) return [];
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readonly');
    const store = tx.objectStore('history');
    const index = store.index('docId');
    const req = index.getAll(IDBKeyRange.only(docId));
    req.onsuccess = (e) => {
      const result = e.target.result || [];
      resolve(result.sort((a, b) => b.savedAt - a.savedAt));
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

// --- Images ---
export async function saveImage(base64Data) {
  const id = generateId();
  await txPromise('images', 'readwrite', store => store.put({ id, base64Data }));
  return id;
}

export async function getImage(id) {
  const img = await txPromise('images', 'readonly', store => store.get(id));
  return img ? img.base64Data : null;
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
