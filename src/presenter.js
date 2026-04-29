// presenter.js — 프레젠테이션 모드

export class Presenter {
  constructor() {
    this.slides = [];
    this.currentIndex = 0;
    this.overlay = null;
    this.contentEl = null;
    this.progressEl = null;
    this.counterEl = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.isActive = false;
    this._keyHandler = null;
    this._clickHandler = null;
    this._resizeObserver = null;
  }

  start(slides, startIndex = 0) {
    if (!slides || slides.length === 0) return;

    this.slides = slides;
    this.currentIndex = startIndex;
    this.isActive = true;

    this._createOverlay();
    this._bindEvents();
    this._render();

    // Start fullscreen automatically if supported
    this.toggleFullscreen(true);

    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add('active');
    });
  }

  _createOverlay() {
    // Remove any existing overlay
    const existing = document.querySelector('.presenter-overlay');
    if (existing) existing.remove();

    this.overlay = document.createElement('div');
    this.overlay.className = 'presenter-overlay';
    this.overlay.innerHTML = `
      <div class="presenter-progress" id="presenter-progress"></div>
      <div class="slide-stage">
        <div class="slide-frame">
          <div class="slide-content" id="slide-content"></div>
        </div>
      </div>
      <nav class="presenter-nav">
        <button class="nav-btn" id="nav-prev" title="이전 슬라이드">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="nav-counter" id="nav-counter"></span>
        <button class="nav-btn" id="nav-next" title="다음 슬라이드">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <span class="nav-separator"></span>
        <button class="nav-btn" id="nav-fullscreen" title="전체화면 (F)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
        <button class="nav-btn" id="nav-exit" title="종료 (Esc)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </nav>
      <div class="presenter-hint">
        <span class="hint-key"><kbd>←</kbd><kbd>→</kbd> 이동</span>
        <span class="hint-key"><kbd>F</kbd> 전체화면</span>
        <span class="hint-key"><kbd>Esc</kbd> 종료</span>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Cache elements
    this.contentEl = this.overlay.querySelector('#slide-content');
    this.progressEl = this.overlay.querySelector('#presenter-progress');
    this.counterEl = this.overlay.querySelector('#nav-counter');
    this.prevBtn = this.overlay.querySelector('#nav-prev');
    this.nextBtn = this.overlay.querySelector('#nav-next');

    // Set up ResizeObserver for dynamic scale
    const frameEl = this.overlay.querySelector('.slide-frame');
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const frameWidth = entry.contentRect.width;
        const scale = frameWidth / 1280;
        if (this.contentEl) {
          this.contentEl.style.setProperty('--slide-scale', scale);
        }
      }
    });
    this._resizeObserver.observe(frameEl);

    // Nav button events
    this.prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.prev();
    });
    this.nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.next();
    });
    this.overlay.querySelector('#nav-fullscreen').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFullscreen();
    });
    this.overlay.querySelector('#nav-exit').addEventListener('click', (e) => {
      e.stopPropagation();
      this.exit();
    });
  }

  _bindEvents() {
    this._keyHandler = (e) => {
      if (!this.isActive) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          this.next();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          this.prev();
          break;
        case 'Escape':
          e.preventDefault();
          this.exit();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'Home':
          e.preventDefault();
          this.goTo(0);
          break;
        case 'End':
          e.preventDefault();
          this.goTo(this.slides.length - 1);
          break;
      }
    };

    this._clickHandler = (e) => {
      if (!this.isActive) return;
      // Click on slide area = next, but not on nav buttons
      if (e.target.closest('.presenter-nav')) return;

      const clickX = e.clientX;
      const halfWidth = window.innerWidth / 2;
      
      if (clickX < halfWidth) {
        this.prev();
      } else {
        this.next();
      }
    };

    document.addEventListener('keydown', this._keyHandler);
    this.overlay.querySelector('.slide-stage').addEventListener('click', this._clickHandler);
  }

  _unbindEvents() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }

  _render() {
    if (!this.contentEl) return;

    // Fade out
    this.contentEl.classList.add('fade-out');
    this.contentEl.classList.remove('fade-in');

    setTimeout(() => {
      // Handle the new object structure from editor.js { html, offset }
      const slideData = this.slides[this.currentIndex];
      this.contentEl.innerHTML = slideData ? slideData.html : '';
      this.contentEl.scrollTop = 0;
      
      // Initialize animation fragments if needed
      this._initFragments();

      // Fade in
      this.contentEl.classList.remove('fade-out');
      this.contentEl.classList.add('fade-in');

      // Update counter
      this.counterEl.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;

      // Update progress bar
      const progress = ((this.currentIndex + 1) / this.slides.length) * 100;
      this.progressEl.style.width = `${progress}%`;

      // Update button states
      this.prevBtn.disabled = this.currentIndex === 0;
      this.nextBtn.disabled = this.currentIndex === this.slides.length - 1;
    }, 150);
  }

  _initFragments() {
    this.fragments = [];
    this.fragmentIndex = -1;
    
    // Check if the current slide is an animated slide
    const slideWrapper = this.contentEl.querySelector('.slide-animate');
    if (slideWrapper) {
      // Find elements to animate (e.g., list items, paragraphs, images)
      const animatable = slideWrapper.querySelectorAll('li, p, img, blockquote');
      animatable.forEach(el => {
        el.classList.add('fragment');
        this.fragments.push(el);
      });
    }
  }

  next() {
    // If we have fragments to reveal, reveal the next one instead of moving to the next slide
    if (this.fragments && this.fragmentIndex < this.fragments.length - 1) {
      this.fragmentIndex++;
      this.fragments[this.fragmentIndex].classList.add('visible');
      return;
    }

    if (this.currentIndex < this.slides.length - 1) {
      this.currentIndex++;
      this._render();
    }
  }

  prev() {
    // If we have fragments visible, hide the last one
    if (this.fragments && this.fragmentIndex >= 0) {
      this.fragments[this.fragmentIndex].classList.remove('visible');
      this.fragmentIndex--;
      return;
    }

    if (this.currentIndex > 0) {
      this.currentIndex--;
      this._render();
    }
  }

  goTo(index) {
    if (index >= 0 && index < this.slides.length) {
      this.currentIndex = index;
      this._render();
    }
  }

  toggleFullscreen(forceEnter = false) {
    if (!document.fullscreenElement && (forceEnter || !this.overlay.fullscreenElement)) {
      if (this.overlay.requestFullscreen) {
        this.overlay.requestFullscreen().catch(() => {});
      } else if (this.overlay.webkitRequestFullscreen) { // Safari
        this.overlay.webkitRequestFullscreen();
      }
    } else if (!forceEnter) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) { // Safari
        document.webkitExitFullscreen();
      }
    }
  }

  exit() {
    this.isActive = false;
    this._unbindEvents();

    // Clean up ResizeObserver
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Fade out
    this.overlay.classList.remove('active');
    this.overlay.classList.add('exiting');

    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.remove();
      }
      this.overlay = null;
      this.contentEl = null;
    }, 350);
  }
}
