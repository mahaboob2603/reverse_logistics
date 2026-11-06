/**
 * animations.js — Animation Utilities & Dark-Mode Manager
 * AI Reverse Logistics Decision Assistant
 *
 * Pure CSS + requestAnimationFrame animations — zero external deps.
 * Dark-mode persistence relies on loadSettings() / saveSettings()
 * defined in storage.js.
 */

/* ================================================================== */
/*  1.  Scroll-triggered entrance animations                          */
/* ================================================================== */

/**
 * Observe every element with the class `scroll-animate`.
 * When it enters the viewport it receives the `animate-in` class,
 * which CSS transitions can hook into (opacity, transform, etc.).
 *
 * Children marked with the `stagger` class get incremental
 * transition-delay so they cascade in sequence.
 */
function initScrollAnimations() {
  const STAGGER_STEP_MS = 80; // delay increment per staggered child

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        el.classList.add('animate-in');

        // Stagger children if present
        const staggerChildren = el.querySelectorAll('.stagger');
        staggerChildren.forEach((child, i) => {
          child.style.transitionDelay = `${i * STAGGER_STEP_MS}ms`;
          child.classList.add('animate-in');
        });

        // Stop watching once animated
        observer.unobserve(el);
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.scroll-animate').forEach((el) => {
    observer.observe(el);
  });
}

/* ================================================================== */
/*  2.  Numeric value animator                                        */
/* ================================================================== */

/**
 * Smoothly animate a number inside `element` from `start` to `end`
 * over `duration` ms, using an ease-out-expo curve.
 *
 * @param {HTMLElement} element   — Target DOM node (its textContent is updated).
 * @param {number}      start     — Starting value.
 * @param {number}      end       — Ending value.
 * @param {number}      duration  — Animation length in ms (default 1200).
 * @param {Function}    formatter — Formats the current value for display.
 *                                  Receives a number, returns a string.
 *                                  Defaults to Math.round().toString().
 */
function animateValue(element, start, end, duration, formatter) {
  if (!element) return;

  const dur = duration || 1200;
  const fmt = typeof formatter === 'function' ? formatter : (v) => Math.round(v).toString();

  let startTime = null;

  /**
   * Ease-out exponential: fast start, gentle finish.
   * t ∈ [0, 1] → eased ∈ [0, 1]
   */
  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function tick(timestamp) {
    if (startTime === null) startTime = timestamp;
    const elapsed  = timestamp - startTime;
    const progress = Math.min(elapsed / dur, 1);
    const eased    = easeOutExpo(progress);
    const current  = start + (end - start) * eased;

    element.textContent = fmt(current);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

/* ================================================================== */
/*  3.  Micro-interaction helpers                                     */
/* ================================================================== */

/**
 * Briefly pulse-scale an element (pop in / pop out).
 *
 * @param {HTMLElement} element — Target node.
 */
function pulseElement(element) {
  if (!element) return;

  // Ensure the element can transition transform
  const prev = element.style.transition;
  element.style.transition = 'transform 0.2s ease';
  element.style.transform  = 'scale(1.12)';

  setTimeout(() => {
    element.style.transform = 'scale(1)';
    setTimeout(() => {
      element.style.transition = prev; // restore
    }, 200);
  }, 200);
}

/**
 * Fade an element in (from opacity 0 → 1) with an optional delay.
 *
 * @param {HTMLElement} element — Target node.
 * @param {number}      delay   — Delay in ms before the fade starts (default 0).
 */
function fadeIn(element, delay) {
  if (!element) return;

  element.style.opacity    = '0';
  element.style.transition = 'opacity 0.5s ease';

  setTimeout(() => {
    element.style.opacity = '1';
  }, delay || 0);
}

/* ================================================================== */
/*  4.  Dark-mode management                                          */
/* ================================================================== */

/**
 * Initialise dark-mode on page load.
 *
 * Priority:
 *   1. Saved user preference (via loadSettings)
 *   2. System-level prefers-color-scheme
 *   3. Light mode (default)
 *
 * @returns {string} Current mode — 'dark' or 'light'.
 */
function initDarkMode() {
  let mode = 'light';

  // 1. Saved preference
  if (typeof loadSettings === 'function') {
    const saved = loadSettings();
    if (saved && saved.darkMode !== undefined) {
      mode = saved.darkMode ? 'dark' : 'light';
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // 2. System preference
      mode = 'dark';
    }
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    mode = 'dark';
  }

  // Apply
  if (mode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return mode;
}

/**
 * Toggle between light and dark mode, persist the choice.
 *
 * @returns {string} The new mode — 'dark' or 'light'.
 */
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  const newMode = isDark ? 'dark' : 'light';

  // Persist via storage.js helper
  if (typeof saveSettings === 'function') {
    const current = (typeof loadSettings === 'function' ? loadSettings() : {}) || {};
    saveSettings({ ...current, darkMode: isDark });
  }

  return newMode;
}

/* ================================================================== */
/*  5.  Confetti / particle burst                                     */
/* ================================================================== */

/**
 * Fire a brief CSS confetti burst inside `container`.
 * Creates lightweight coloured particles that fade out and are
 * auto-removed from the DOM after the animation completes.
 *
 * @param {HTMLElement} container — The element to anchor the burst in.
 */
function showConfetti(container) {
  if (!container) return;

  const PARTICLE_COUNT = 30;
  const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1', '#DDA0DD', '#F0E68C'];
  const DURATION_MS = 1200;

  // Ensure container can position children absolutely
  const prevPosition = container.style.position;
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  const particles = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const particle = document.createElement('span');
    const size     = Math.random() * 8 + 4; // 4-12 px
    const color    = COLORS[Math.floor(Math.random() * COLORS.length)];
    const angle    = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 120 + 40;  // 40-160 px spread
    const dx       = Math.cos(angle) * distance;
    const dy       = Math.sin(angle) * distance - 30; // slight upward bias

    Object.assign(particle.style, {
      position:        'absolute',
      left:            '50%',
      top:             '50%',
      width:           `${size}px`,
      height:          `${size}px`,
      marginLeft:      `${-size / 2}px`,
      marginTop:       `${-size / 2}px`,
      borderRadius:    Math.random() > 0.5 ? '50%' : '2px',
      backgroundColor: color,
      opacity:         '1',
      pointerEvents:   'none',
      zIndex:          '9999',
      transform:       'translate(0, 0) scale(1) rotate(0deg)',
      transition:      `transform ${DURATION_MS}ms cubic-bezier(.15,.85,.35,1),
                        opacity ${DURATION_MS * 0.6}ms ease ${DURATION_MS * 0.4}ms`,
    });

    container.appendChild(particle);
    particles.push(particle);

    // Trigger animation in next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        particle.style.transform = `translate(${dx}px, ${dy}px) scale(0.2) rotate(${Math.random() * 720 - 360}deg)`;
        particle.style.opacity   = '0';
      });
    });
  }

  // Cleanup after animation
  setTimeout(() => {
    particles.forEach((p) => {
      if (p.parentNode) p.parentNode.removeChild(p);
    });
    // Restore position if we changed it
    if (prevPosition !== undefined) {
      container.style.position = prevPosition;
    }
  }, DURATION_MS + 100);
}

/* ================================================================== */
/*  6.  Typewriter effect                                             */
/* ================================================================== */

/**
 * Types out `text` character by character inside `element`.
 *
 * @param {HTMLElement} element — Target node (textContent is overwritten).
 * @param {string}      text    — The full string to type.
 * @param {number}      speed   — Delay between characters in ms (default 50).
 * @returns {Promise}           — Resolves when typing is complete.
 */
function typeWriter(element, text, speed) {
  if (!element) return Promise.resolve();

  const spd = speed || 50;
  element.textContent = '';

  return new Promise((resolve) => {
    let idx = 0;

    function type() {
      if (idx < text.length) {
        element.textContent += text.charAt(idx);
        idx++;
        setTimeout(type, spd);
      } else {
        resolve();
      }
    }

    type();
  });
}

/* ================================================================== */
/*  Module exports (compatible with <script> tags and bundlers)       */
/* ================================================================== */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initScrollAnimations,
    animateValue,
    pulseElement,
    fadeIn,
    initDarkMode,
    toggleDarkMode,
    showConfetti,
    typeWriter,
  };
}
