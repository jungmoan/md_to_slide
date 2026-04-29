// theme.js — 테마 관리

import { saveTheme, loadTheme } from './storage.js';

const THEMES = {
  midnight: { name: 'Midnight', attr: 'midnight' },
  paper: { name: 'Paper', attr: 'paper' },
  terminal: { name: 'Terminal', attr: 'terminal' },
  abyss: { name: 'Abyss', attr: 'abyss' },
};

let currentTheme = 'midnight';

export function initTheme(selectEl) {
  currentTheme = loadTheme();
  applyTheme(currentTheme);

  if (selectEl) {
    selectEl.value = currentTheme;
    selectEl.addEventListener('change', (e) => {
      setTheme(e.target.value);
    });
  }
}

export function setTheme(theme) {
  if (!THEMES[theme]) return;
  currentTheme = theme;
  applyTheme(theme);
  saveTheme(theme);
}

export function getTheme() {
  return currentTheme;
}

function applyTheme(theme) {
  if (theme === 'midnight') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
