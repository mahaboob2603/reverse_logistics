/**
 * ============================================================================
 *  AI Reverse Logistics — Premium SVG Chart Library
 * ============================================================================
 *  Pure-SVG, zero-dependency chart components with smooth CSS and
 *  requestAnimationFrame animations.
 *
 *  Components:
 *    • createDonutChart(containerId, data, options)
 *    • createConfidenceMeter(containerId, score)
 *    • createProgressRing(containerId, percentage, color, label)
 *    • animateCounter(element, target, duration, prefix, suffix)
 *
 *  All rendering is done via inline SVG elements injected into the target
 *  container.  No external libraries or frameworks required.
 * ============================================================================
 */

// ── Inject Global CSS for Chart Animations (once) ───────────────────────────
(function injectChartStyles() {
  if (document.getElementById('chart-animation-styles')) return;

  const style = document.createElement('style');
  style.id = 'chart-animation-styles';
  style.textContent = `
    /* Donut segment draw-in animation */
    @keyframes donutDraw {
      from { stroke-dashoffset: var(--circumference); }
      to   { stroke-dashoffset: var(--target-offset); }
    }

    /* Confidence / progress ring fill animation */
    @keyframes ringFill {
      from { stroke-dashoffset: var(--circumference); }
      to   { stroke-dashoffset: var(--target-offset); }
    }

    /* Fade-in for center labels */
    @keyframes chartFadeIn {
      from { opacity: 0; transform: scale(0.8); }
      to   { opacity: 1; transform: scale(1);   }
    }

    .chart-center-text {
      animation: chartFadeIn 0.6s ease-out 0.3s both;
    }

    /* Tooltip base style */
    .chart-tooltip {
      position: absolute;
      padding: 8px 14px;
      background: rgba(15, 23, 42, 0.92);
      color: #f1f5f9;
      font-size: 13px;
      font-family: 'Inter', system-ui, sans-serif;
      border-radius: 8px;
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 1000;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .chart-tooltip.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
})();

// ─────────────────────────────────────────────────────────────────────────────
//  1. Donut Chart
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render an animated SVG donut chart inside the given container.
 *
 * @param {string} containerId  – DOM id of the target container element.
 * @param {Array}  data         – Array of { label: string, value: number, color: string }.
 * @param {object} [options]    – Optional overrides.
 * @param {number} [options.size=220]              – SVG width/height in px.
 * @param {number} [options.strokeWidth=30]        – Donut ring thickness.
 * @param {number} [options.animationDuration=1000] – Draw-in duration in ms.
 */
function createDonutChart(containerId, data, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[Charts] Container #${containerId} not found.`);
    return;
  }

  // ── Options ─────────────────────────────────────────────────────────────
  const size     = options.size || 220;
  const stroke   = options.strokeWidth || 30;
  const duration = options.animationDuration || 1000;
  const radius   = (size - stroke) / 2;
  const cx       = size / 2;
  const cy       = size / 2;
  const circumference = 2 * Math.PI * radius;

  // ── Compute total and sort descending for visual clarity ──────────────
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return;

  // ── Build SVG ─────────────────────────────────────────────────────────
  container.innerHTML = '';
  container.style.position = 'relative';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg   = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width',   size);
  svg.setAttribute('height',  size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.style.overflow = 'visible';

  // Background track circle
  const bgCircle = document.createElementNS(svgNS, 'circle');
  bgCircle.setAttribute('cx', cx);
  bgCircle.setAttribute('cy', cy);
  bgCircle.setAttribute('r',  radius);
  bgCircle.setAttribute('fill', 'none');
  bgCircle.setAttribute('stroke', 'rgba(148,163,184,0.15)');
  bgCircle.setAttribute('stroke-width', stroke);
  svg.appendChild(bgCircle);

  // ── Create tooltip element ────────────────────────────────────────────
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  container.appendChild(tooltip);

  // ── Draw segments ─────────────────────────────────────────────────────
  let cumulativeOffset = 0;

  data.forEach((item, i) => {
    const fraction     = item.value / total;
    const segmentLen   = circumference * fraction;
    const gapSize      = data.length > 1 ? 3 : 0; // 3px gap between segments
    const drawLen      = Math.max(0, segmentLen - gapSize);
    const targetOffset = circumference - drawLen;

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r',  radius);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', item.color);
    circle.setAttribute('stroke-width', stroke);
    circle.setAttribute('stroke-linecap', 'round');
    circle.setAttribute('stroke-dasharray', `${circumference}`);
    circle.setAttribute('stroke-dashoffset', `${circumference}`);

    // Rotate so segments start from 12 o'clock and don't overlap.
    const rotationDeg = (cumulativeOffset / circumference) * 360 - 90;
    circle.setAttribute('transform', `rotate(${rotationDeg} ${cx} ${cy})`);

    // CSS custom props for the animation
    circle.style.setProperty('--circumference',  circumference);
    circle.style.setProperty('--target-offset',   targetOffset);
    circle.style.animation = `donutDraw ${duration}ms ease-out ${i * 120}ms forwards`;
    circle.style.cursor = 'pointer';

    // ── Hover tooltip ──────────────────────────────────────────────────
    const pct = (fraction * 100).toFixed(1);
    circle.addEventListener('mouseenter', (e) => {
      tooltip.innerHTML = `<strong>${item.label}</strong><br>${item.value} (${pct}%)`;
      tooltip.classList.add('visible');
    });
    circle.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
      tooltip.style.top  = (e.clientY - rect.top  - 10) + 'px';
    });
    circle.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });

    svg.appendChild(circle);
    cumulativeOffset += segmentLen;
  });

  // ── Center text (total) ───────────────────────────────────────────────
  const centerGroup = document.createElementNS(svgNS, 'g');
  centerGroup.setAttribute('class', 'chart-center-text');

  const totalLabel = document.createElementNS(svgNS, 'text');
  totalLabel.setAttribute('x', cx);
  totalLabel.setAttribute('y', cy - 6);
  totalLabel.setAttribute('text-anchor', 'middle');
  totalLabel.setAttribute('dominant-baseline', 'middle');
  totalLabel.setAttribute('fill', 'var(--color-text, #1e293b)');
  totalLabel.setAttribute('font-size', '28');
  totalLabel.setAttribute('font-weight', '700');
  totalLabel.setAttribute('font-family', "'Inter', system-ui, sans-serif");
  totalLabel.textContent = total;

  const subtitleLabel = document.createElementNS(svgNS, 'text');
  subtitleLabel.setAttribute('x', cx);
  subtitleLabel.setAttribute('y', cy + 18);
  subtitleLabel.setAttribute('text-anchor', 'middle');
  subtitleLabel.setAttribute('dominant-baseline', 'middle');
  subtitleLabel.setAttribute('fill', 'var(--color-text-secondary, #64748b)');
  subtitleLabel.setAttribute('font-size', '12');
  subtitleLabel.setAttribute('font-family', "'Inter', system-ui, sans-serif");
  subtitleLabel.textContent = 'Total';

  centerGroup.appendChild(totalLabel);
  centerGroup.appendChild(subtitleLabel);
  svg.appendChild(centerGroup);

  container.appendChild(svg);
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. Confidence Meter (Circular Gauge)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render a circular SVG confidence gauge (0–100).
 *
 * Colour gradient:
 *   0   → red    (#ef4444)
 *   50  → yellow (#eab308)
 *   100 → green  (#22c55e)
 *
 * @param {string} containerId – DOM id of the target container element.
 * @param {number} score       – Confidence score, 0–100.
 */
function createConfidenceMeter(containerId, score) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[Charts] Container #${containerId} not found.`);
    return;
  }

  const size   = 140;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const cx     = size / 2;
  const cy     = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp score
  const clamped      = Math.min(100, Math.max(0, score));
  const fraction     = clamped / 100;
  const targetOffset = circumference * (1 - fraction);

  // Colour interpolation: red → yellow → green
  const color = interpolateColor(clamped);

  container.innerHTML = '';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg   = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width',   size);
  svg.setAttribute('height',  size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // Background track
  const bgCircle = document.createElementNS(svgNS, 'circle');
  bgCircle.setAttribute('cx', cx);
  bgCircle.setAttribute('cy', cy);
  bgCircle.setAttribute('r',  radius);
  bgCircle.setAttribute('fill', 'none');
  bgCircle.setAttribute('stroke', 'rgba(148,163,184,0.15)');
  bgCircle.setAttribute('stroke-width', stroke);
  svg.appendChild(bgCircle);

  // Foreground arc
  const fgCircle = document.createElementNS(svgNS, 'circle');
  fgCircle.setAttribute('cx', cx);
  fgCircle.setAttribute('cy', cy);
  fgCircle.setAttribute('r',  radius);
  fgCircle.setAttribute('fill', 'none');
  fgCircle.setAttribute('stroke', color);
  fgCircle.setAttribute('stroke-width', stroke);
  fgCircle.setAttribute('stroke-linecap', 'round');
  fgCircle.setAttribute('stroke-dasharray', `${circumference}`);
  fgCircle.setAttribute('stroke-dashoffset', `${circumference}`);
  fgCircle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);

  fgCircle.style.setProperty('--circumference', circumference);
  fgCircle.style.setProperty('--target-offset', targetOffset);
  fgCircle.style.animation = 'ringFill 1.2s ease-out 0.2s forwards';

  svg.appendChild(fgCircle);

  // Center score text
  const centerGroup = document.createElementNS(svgNS, 'g');
  centerGroup.setAttribute('class', 'chart-center-text');

  const scoreText = document.createElementNS(svgNS, 'text');
  scoreText.setAttribute('x', cx);
  scoreText.setAttribute('y', cy - 4);
  scoreText.setAttribute('text-anchor', 'middle');
  scoreText.setAttribute('dominant-baseline', 'middle');
  scoreText.setAttribute('fill', color);
  scoreText.setAttribute('font-size', '26');
  scoreText.setAttribute('font-weight', '700');
  scoreText.setAttribute('font-family', "'Inter', system-ui, sans-serif");
  scoreText.textContent = `${Math.round(clamped)}%`;

  const labelText = document.createElementNS(svgNS, 'text');
  labelText.setAttribute('x', cx);
  labelText.setAttribute('y', cy + 16);
  labelText.setAttribute('text-anchor', 'middle');
  labelText.setAttribute('dominant-baseline', 'middle');
  labelText.setAttribute('fill', 'var(--color-text-secondary, #64748b)');
  labelText.setAttribute('font-size', '11');
  labelText.setAttribute('font-family', "'Inter', system-ui, sans-serif");
  labelText.textContent = 'Confidence';

  centerGroup.appendChild(scoreText);
  centerGroup.appendChild(labelText);
  svg.appendChild(centerGroup);

  container.appendChild(svg);
}

/**
 * Interpolate between red → yellow → green based on a 0–100 value.
 *
 * @param   {number} value – 0–100.
 * @returns {string} CSS hex colour string.
 */
function interpolateColor(value) {
  // Red   (0):   #ef4444 → rgb(239, 68, 68)
  // Yellow (50): #eab308 → rgb(234, 179, 8)
  // Green (100): #22c55e → rgb(34, 197, 94)
  let r, g, b;

  if (value <= 50) {
    const t = value / 50;
    r = Math.round(239 + (234 - 239) * t);
    g = Math.round(68  + (179 - 68)  * t);
    b = Math.round(68  + (8   - 68)  * t);
  } else {
    const t = (value - 50) / 50;
    r = Math.round(234 + (34  - 234) * t);
    g = Math.round(179 + (197 - 179) * t);
    b = Math.round(8   + (94  - 8)   * t);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. Progress Ring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render a simple circular progress ring (used for sustainability scores).
 *
 * @param {string} containerId – DOM id of the target container element.
 * @param {number} percentage  – Percentage to fill (0–100).
 * @param {string} color       – CSS colour for the ring.
 * @param {string} label       – Label text displayed below the percentage.
 */
function createProgressRing(containerId, percentage, color, label) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[Charts] Container #${containerId} not found.`);
    return;
  }

  const size   = 100;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const cx     = size / 2;
  const cy     = size / 2;
  const circumference = 2 * Math.PI * radius;

  const clamped      = Math.min(100, Math.max(0, percentage));
  const targetOffset = circumference * (1 - clamped / 100);

  container.innerHTML = '';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg   = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width',   size);
  svg.setAttribute('height',  size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // Background track
  const bgCircle = document.createElementNS(svgNS, 'circle');
  bgCircle.setAttribute('cx', cx);
  bgCircle.setAttribute('cy', cy);
  bgCircle.setAttribute('r',  radius);
  bgCircle.setAttribute('fill', 'none');
  bgCircle.setAttribute('stroke', 'rgba(148,163,184,0.12)');
  bgCircle.setAttribute('stroke-width', stroke);
  svg.appendChild(bgCircle);

  // Foreground ring
  const fgCircle = document.createElementNS(svgNS, 'circle');
  fgCircle.setAttribute('cx', cx);
  fgCircle.setAttribute('cy', cy);
  fgCircle.setAttribute('r',  radius);
  fgCircle.setAttribute('fill', 'none');
  fgCircle.setAttribute('stroke', color);
  fgCircle.setAttribute('stroke-width', stroke);
  fgCircle.setAttribute('stroke-linecap', 'round');
  fgCircle.setAttribute('stroke-dasharray', `${circumference}`);
  fgCircle.setAttribute('stroke-dashoffset', `${circumference}`);
  fgCircle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);

  fgCircle.style.setProperty('--circumference', circumference);
  fgCircle.style.setProperty('--target-offset', targetOffset);
  fgCircle.style.animation = 'ringFill 1s ease-out 0.15s forwards';

  svg.appendChild(fgCircle);

  // Center text
  const centerGroup = document.createElementNS(svgNS, 'g');
  centerGroup.setAttribute('class', 'chart-center-text');

  const pctText = document.createElementNS(svgNS, 'text');
  pctText.setAttribute('x', cx);
  pctText.setAttribute('y', cy - 3);
  pctText.setAttribute('text-anchor', 'middle');
  pctText.setAttribute('dominant-baseline', 'middle');
  pctText.setAttribute('fill', color);
  pctText.setAttribute('font-size', '18');
  pctText.setAttribute('font-weight', '700');
  pctText.setAttribute('font-family', "'Inter', system-ui, sans-serif");
  pctText.textContent = `${Math.round(clamped)}%`;

  const lblText = document.createElementNS(svgNS, 'text');
  lblText.setAttribute('x', cx);
  lblText.setAttribute('y', cy + 14);
  lblText.setAttribute('text-anchor', 'middle');
  lblText.setAttribute('dominant-baseline', 'middle');
  lblText.setAttribute('fill', 'var(--color-text-secondary, #64748b)');
  lblText.setAttribute('font-size', '9');
  lblText.setAttribute('font-family', "'Inter', system-ui, sans-serif");
  lblText.textContent = label || '';

  centerGroup.appendChild(pctText);
  centerGroup.appendChild(lblText);
  svg.appendChild(centerGroup);

  container.appendChild(svg);
}

// ─────────────────────────────────────────────────────────────────────────────
//  4. Animated Counter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Animate a numeric counter from 0 to `target` using requestAnimationFrame.
 *
 * Uses an ease-out-cubic easing function so the counter decelerates smoothly
 * as it approaches the final value.
 *
 * @param {HTMLElement} element  – The DOM element whose textContent is updated.
 * @param {number}      target   – The target number to animate to.
 * @param {number}      [duration=1000] – Animation duration in ms.
 * @param {string}      [prefix='']  – Text prepended (e.g. '₹').
 * @param {string}      [suffix='']  – Text appended  (e.g. '%').
 */
function animateCounter(element, target, duration = 1000, prefix = '', suffix = '') {
  if (!element) return;

  const start     = performance.now();
  const isDecimal = !Number.isInteger(target);

  /**
   * Ease-out-cubic: fast start, smooth deceleration.
   * f(t) = 1 − (1 − t)³
   */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function frame(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = easeOutCubic(progress);
    const current  = eased * target;

    // Format: integers get locale grouping; decimals keep 1 decimal place.
    const formatted = isDecimal
      ? current.toFixed(1)
      : Math.round(current).toLocaleString('en-IN');

    element.textContent = `${prefix}${formatted}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

// ── Module Exports ──────────────────────────────────────────────────────────

window.Charts = {
  createDonutChart,
  createConfidenceMeter,
  createProgressRing,
  animateCounter
};
