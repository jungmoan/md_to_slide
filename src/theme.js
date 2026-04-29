// theme.js — 테마 관리

const THEMES = {
  midnight: { name: 'Midnight', attr: 'midnight' },
  paper: { name: 'Paper', attr: 'paper' },
  terminal: { name: 'Terminal', attr: 'terminal' },
  abyss: { name: 'Abyss', attr: 'abyss' },
};

export function initThemeDropdown(selectEl, onChange) {
  if (selectEl) {
    selectEl.addEventListener('change', (e) => {
      onChange(e.target.value);
    });
  }
}

export function applyTheme(theme) {
  if (theme === 'midnight') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
