// storage.js — localStorage 관리

const STORAGE_KEY = 'md_slide_content';
const THEME_KEY = 'md_slide_theme';
const LAYOUT_KEY = 'md_slide_layout';

export function saveContent(markdown) {
  try {
    localStorage.setItem(STORAGE_KEY, markdown);
  } catch (e) {
    console.warn('localStorage 저장 실패:', e);
  }
}

export function loadContent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

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
