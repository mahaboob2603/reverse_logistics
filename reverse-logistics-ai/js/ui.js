// ============================================================
// ui.js — Enhanced Rendering, Toasts, Modals, Charts
// AI Reverse Logistics Decision Assistant (Premium Edition)
// ============================================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  toast.innerHTML = `
    <span style="font-size:16px;font-weight:700">${icons[type] || ''}</span>
    <span>${escapeHTML(message)}</span>
    <button class="toast-dismiss" aria-label="Dismiss">&times;</button>
  `;
  toast.querySelector('.toast-dismiss').addEventListener('click', () => toast.remove());
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, duration);
}

/**
 * Action → CSS class mapping
 */
const ACTION_CLASS = {
  'Restock': 'restock',
  'Repackage and Resell': 'repackage',
  'Refurbish and Resell': 'refurbish',
  'Repair': 'repair',
  'Recycle': 'recycle'
};

const ACTION_SHORT = {
  'Restock': 'Restock',
  'Repackage and Resell': 'Repackage',
  'Refurbish and Resell': 'Refurbish',
  'Repair': 'Repair',
  'Recycle': 'Recycle'
};

const ACTION_COLORS = {
  'Restock':             '#2E7D32',
  'Repackage and Resell':'#8BC34A',
  'Refurbish and Resell':'#00897B',
  'Repair':              '#FB8C00',
  'Recycle':             '#5C6BC0'
};

/**
 * Render KPI Cards with animated counters
 */
function renderKPIs(records, animate = false) {
  const total = records.length;
  const actionCounts = {};
  ACTIONS.forEach(a => actionCounts[a] = 0);
  let totalRecovery = 0;

  records.forEach(r => {
    if (actionCounts[r.aiAction] !== undefined) actionCounts[r.aiAction]++;
    totalRecovery += r.recoveryValue || 0;
  });

  const evaluated = records.filter(r => r.matchStatus !== 'Pending');
  const correct = evaluated.filter(r => r.matchStatus === 'Match').length;
  const accuracy = evaluated.length > 0 ? (correct / evaluated.length * 100) : 0;

  const dur = animate ? 1200 : 0;

  const setVal = (id, val, prefix, suffix) => {
    const el = document.getElementById(id);
    if (animate && typeof animateValue === 'function') {
      animateValue(el, 0, val, dur, (v) => {
        if (prefix === '₹') return formatINR(Math.round(v));
        if (suffix === '%') return v.toFixed(1) + '%';
        return Math.round(v).toString();
      });
    } else {
      if (prefix === '₹') el.textContent = formatINR(val);
      else if (suffix === '%') el.textContent = val.toFixed(1) + '%';
      else el.textContent = val;
    }
  };

  setVal('kpi-total', total, '', '');
  setVal('kpi-restock', actionCounts['Restock'], '', '');
  setVal('kpi-repair', actionCounts['Repair'], '', '');
  setVal('kpi-recycle', actionCounts['Recycle'], '', '');
  setVal('kpi-recovery', totalRecovery, '₹', '');
  if (evaluated.length > 0) {
    setVal('kpi-accuracy', accuracy, '', '%');
  } else {
    document.getElementById('kpi-accuracy').textContent = '—';
  }

  document.getElementById('pill-refurbish').textContent = `Refurbish: ${actionCounts['Refurbish and Resell']}`;
  document.getElementById('pill-repackage').textContent = `Repackage: ${actionCounts['Repackage and Resell']}`;

  // Update hero callout
  const heroCallout = document.getElementById('hero-recovery');
  if (heroCallout) {
    const avgRecovery = total > 0 ? (totalRecovery / records.reduce((s,r) => s + r.price, 0) * 100) : 0;
    heroCallout.innerHTML = `${formatINR(totalRecovery)} <span>recovered from ${total} items — ${avgRecovery.toFixed(1)}% avg recovery</span>`;
  }
}

/**
 * Render Donut Chart
 */
function renderDonutChart(records) {
  const total = records.length;
  const container = document.getElementById('donut-chart');
  if (!container) return;

  if (total === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:40px">No data</p>';
    return;
  }

  const actionCounts = {};
  ACTIONS.forEach(a => actionCounts[a] = 0);
  records.forEach(r => { if (actionCounts[r.aiAction] !== undefined) actionCounts[r.aiAction]++; });

  const data = ACTIONS.map(a => ({
    label: ACTION_SHORT[a],
    value: actionCounts[a],
    color: ACTION_COLORS[a]
  })).filter(d => d.value > 0);

  if (typeof createDonutChart === 'function') {
    createDonutChart('donut-chart', data, {
      size: 220,
      strokeWidth: 32,
      animationDuration: 1200,
      centerText: total.toString(),
      centerSubText: 'Total Units'
    });
  }
}

/**
 * Render Distribution Rows
 */
function renderDistRows(records) {
  const total = records.length;
  const container = document.getElementById('dist-rows');
  if (!container) return;

  if (total === 0) { container.innerHTML = ''; return; }

  const actionCounts = {};
  ACTIONS.forEach(a => actionCounts[a] = 0);
  records.forEach(r => { if (actionCounts[r.aiAction] !== undefined) actionCounts[r.aiAction]++; });

  container.innerHTML = ACTIONS.map(a => {
    const count = actionCounts[a];
    const pct = (count / total * 100).toFixed(0);
    return `
      <div class="dist-row">
        <div class="dist-row-label">${escapeHTML(ACTION_SHORT[a])}</div>
        <div class="dist-row-bar">
          <div class="dist-row-bar-fill" style="width:${pct}%;background:${ACTION_COLORS[a]}"></div>
        </div>
        <div class="dist-row-stats">${count} unit${count !== 1 ? 's' : ''} · ${pct}%</div>
      </div>
    `;
  }).join('');
}

/**
 * Render Environmental Impact
 */
function renderEnvironmental(records) {
  const ringContainer = document.getElementById('env-ring');
  const metricsContainer = document.getElementById('env-metrics');
  if (!ringContainer || !metricsContainer) return;

  let totalCO2 = 0, totalWaste = 0, totalLandfill = 0;
  records.forEach(r => {
    if (r.environmentalImpact) {
      totalCO2 += r.environmentalImpact.co2Avoided || 0;
      totalWaste += r.environmentalImpact.wasteDiverted || 0;
      totalLandfill += r.environmentalImpact.landfillSaved || 0;
    }
  });
  const avgLandfill = records.length > 0 ? totalLandfill / records.length : 0;
  const sustainScore = Math.min(100, Math.round((avgLandfill * 0.4) + (Math.min(totalCO2, 100) * 0.3) + (Math.min(100 - totalWaste, 100) * 0.3)));

  if (typeof createProgressRing === 'function') {
    createProgressRing('env-ring', sustainScore, '#2E7D32', 'Sustainability');
  }

  metricsContainer.innerHTML = `
    <div class="env-metric-row">
      <div class="env-metric-icon" style="background:var(--color-success-surface);color:var(--color-primary)">🌱</div>
      <div class="env-metric-text">
        <div class="label">CO₂ Avoided</div>
        <div class="value">${totalCO2.toFixed(1)} kg</div>
      </div>
    </div>
    <div class="env-metric-row">
      <div class="env-metric-icon" style="background:var(--color-info-surface);color:var(--color-info)">♻️</div>
      <div class="env-metric-text">
        <div class="label">Waste Diverted</div>
        <div class="value">${totalWaste.toFixed(1)} kg</div>
      </div>
    </div>
    <div class="env-metric-row">
      <div class="env-metric-icon" style="background:var(--color-primary-surface);color:#00897B">🏭</div>
      <div class="env-metric-text">
        <div class="label">Landfill Saved</div>
        <div class="value">${avgLandfill.toFixed(0)}%</div>
      </div>
    </div>
  `;
}

/**
 * Render Supply Chain Flow (SVG)
 */
function renderSupplyChainFlow() {
  const container = document.getElementById('flow-diagram');
  if (!container) return;

  const actions = [
    { name: 'Restock', pct: '95%', color: '#2E7D32', icon: '📦' },
    { name: 'Repackage', pct: '80%', color: '#8BC34A', icon: '📋' },
    { name: 'Refurbish', pct: '70%', color: '#00897B', icon: '🔄' },
    { name: 'Repair', pct: '50%', color: '#FB8C00', icon: '🔧' },
    { name: 'Recycle', pct: '10%', color: '#5C6BC0', icon: '♻️' },
  ];

  const w = 900, h = 220;
  const startX = 30, inspectX = 200, branchStartX = 360, endX = w - 70;
  const centerY = h / 2;
  const branchSpacing = 38;

  let svg = `<svg viewBox="0 0 ${w} ${h}" class="flow-svg" xmlns="http://www.w3.org/2000/svg">`;
  
  // Start node
  svg += `<rect x="${startX}" y="${centerY - 22}" width="130" height="44" rx="22" style="fill:var(--color-surface-dim);stroke:var(--color-border-strong)" stroke-width="1.5"/>`;
  svg += `<text x="${startX + 65}" y="${centerY + 5}" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" style="fill:var(--color-text)">Customer Return</text>`;

  // Arrow to inspect
  svg += `<line x1="${startX + 130}" y1="${centerY}" x2="${inspectX}" y2="${centerY}" style="stroke:var(--color-border-strong)" stroke-width="2" stroke-dasharray="6,4"/>`;
  svg += `<polygon points="${inspectX - 2},${centerY - 5} ${inspectX + 6},${centerY} ${inspectX - 2},${centerY + 5}" style="fill:var(--color-border-strong)"/>`;

  // Inspect node
  svg += `<rect x="${inspectX}" y="${centerY - 22}" width="130" height="44" rx="22" style="fill:var(--color-primary-surface);stroke:var(--color-primary)" stroke-width="1.5"/>`;
  svg += `<text x="${inspectX + 65}" y="${centerY + 5}" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" style="fill:var(--color-primary)">AI Inspection</text>`;

  // Branches
  actions.forEach((action, i) => {
    const y = centerY - (actions.length - 1) * branchSpacing / 2 + i * branchSpacing;
    const branchEndX = branchStartX + 160;

    // Line from inspect to branch
    svg += `<path d="M${inspectX + 130},${centerY} C${inspectX + 160},${centerY} ${branchStartX - 30},${y} ${branchStartX},${y}" stroke="${action.color}" stroke-width="2" fill="none" opacity="0.6"/>`;
    svg += `<polygon points="${branchStartX - 2},${y - 4} ${branchStartX + 5},${y} ${branchStartX - 2},${y + 4}" fill="${action.color}"/>`;

    // Branch node
    svg += `<rect x="${branchStartX}" y="${y - 16}" width="160" height="32" rx="16" fill="${action.color}15" stroke="${action.color}" stroke-width="1.5"/>`;
    svg += `<text x="${branchStartX + 80}" y="${y + 4}" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="600" fill="${action.color}">${action.icon} ${action.name} (${action.pct})</text>`;

    // Line from branch to end
    svg += `<path d="M${branchEndX},${y} C${branchEndX + 30},${y} ${endX - 60},${centerY} ${endX - 30},${centerY}" stroke="${action.color}" stroke-width="1.5" fill="none" opacity="0.4"/>`;
  });

  // End node
  svg += `<rect x="${endX - 30}" y="${centerY - 22}" width="130" height="44" rx="22" style="fill:var(--color-primary)" stroke="none"/>`;
  svg += `<text x="${endX + 35}" y="${centerY + 5}" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="white">Value Recovery</text>`;

  svg += '</svg>';
  container.innerHTML = svg;
}

/**
 * Render Comparison Table
 */
function renderTable(records, filter, search) {
  let filtered = records;
  if (filter && filter !== 'all') filtered = filtered.filter(r => r.aiAction === filter);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.id.toLowerCase().includes(s) ||
      r.product.toLowerCase().includes(s) ||
      r.aiAction.toLowerCase().includes(s)
    );
  }

  const tbody = document.getElementById('table-body');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><p>No records found.</p></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const statusClass = r.matchStatus === 'Match' ? 'badge-match' : r.matchStatus === 'Mismatch' ? 'badge-mismatch' : 'badge-pending';
    const statusIcon = r.matchStatus === 'Match' ? '✓' : r.matchStatus === 'Mismatch' ? '✗' : '—';
    const confidence = r.confidence !== undefined ? r.confidence + '%' : '—';
    return `
      <tr>
        <td style="font-weight:600;font-family:'Inter',monospace;font-size:13px">${escapeHTML(r.id)}</td>
        <td>${escapeHTML(r.product)}</td>
        <td><span class="badge-action ${ACTION_CLASS[r.aiAction] || ''}">${escapeHTML(r.aiAction)}</span></td>
        <td>${r.knownAnswer ? escapeHTML(r.knownAnswer) : '<span style="color:var(--color-text-muted)">—</span>'}</td>
        <td class="money">${formatINR(r.recoveryValue)}</td>
        <td style="text-align:center"><span class="badge ${statusClass}">${statusIcon} ${escapeHTML(r.matchStatus)}</span></td>
        <td style="text-align:center;font-weight:600;color:var(--color-text-secondary)">${confidence}</td>
        <td style="text-align:center">
          <button class="delete-btn" data-id="${escapeHTML(r.id)}" aria-label="Delete ${escapeHTML(r.id)}" title="Delete">🗑</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Evaluation Summary
 */
function renderEvaluation(records) {
  const container = document.getElementById('evaluation-section');
  const evaluated = records.filter(r => r.matchStatus !== 'Pending');
  const correct = evaluated.filter(r => r.matchStatus === 'Match').length;
  const total = evaluated.length;
  const accuracy = total > 0 ? (correct / total * 100).toFixed(1) : '0.0';
  const mismatches = evaluated.filter(r => r.matchStatus === 'Mismatch');

  document.getElementById('eval-accuracy').textContent = accuracy + '%';
  document.getElementById('eval-correct').textContent = correct;
  document.getElementById('eval-total').textContent = total;

  const listEl = document.getElementById('mismatch-list');
  if (mismatches.length === 0) {
    listEl.innerHTML = '<p style="color:var(--color-primary);padding:24px;text-align:center;font-size:16px">🎉 All evaluated records match! Perfect accuracy.</p>';
  } else {
    listEl.innerHTML = mismatches.map(r => `
      <li class="mismatch-item">
        <span class="mismatch-id">${escapeHTML(r.id)}</span>
        <div class="mismatch-detail">
          <strong>${escapeHTML(r.product)}</strong>: AI recommended <strong>${escapeHTML(r.aiAction)}</strong>,
          expected <strong>${escapeHTML(r.knownAnswer)}</strong>.
          <br><span style="font-size:12px;color:var(--color-text-secondary)">${escapeHTML(r.reasoning)}</span>
        </div>
      </li>
    `).join('');
  }

  container.classList.add('visible');
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Render What-If Simulator
 */
function renderSimulator(records) {
  const slidersContainer = document.getElementById('sim-sliders');
  const previewContainer = document.getElementById('sim-preview');
  if (!slidersContainer || !previewContainer) return;

  const simActions = [
    { key: 'Restock', label: 'Restock', color: '#2E7D32' },
    { key: 'Repackage', label: 'Repackage & Resell', color: '#8BC34A' },
    { key: 'Refurbish', label: 'Refurbish & Resell', color: '#00897B' },
    { key: 'Repair', label: 'Repair', color: '#FB8C00' },
    { key: 'Recycle', label: 'Recycle', color: '#5C6BC0' },
  ];

  slidersContainer.innerHTML = simActions.map(a => `
    <div class="slider-group">
      <div class="slider-header">
        <span class="slider-label">${a.label}</span>
        <span class="slider-value" id="sim-val-${a.key}" style="color:${a.color}">${SimulatorState.customRates[a.key]}%</span>
      </div>
      <input type="range" min="0" max="100" value="${SimulatorState.customRates[a.key]}" data-action="${a.key}"
             style="accent-color:${a.color}" aria-label="${a.label} recovery rate" />
    </div>
  `).join('');

  updateSimulatorPreview(records);
}

function updateSimulatorPreview(records) {
  const previewContainer = document.getElementById('sim-preview');
  if (!previewContainer || typeof simulateImpact !== 'function') return;

  // Map records to simulator format
  const simRecords = records.map(r => ({
    recommended: mapActionToSimKey(r.aiAction),
    action: mapActionToSimKey(r.aiAction),
    product_value: r.price
  }));

  const result = simulateImpact(simRecords, SimulatorState.customRates);
  const changeSign = result.changeAmount >= 0 ? '+' : '';
  const changeClass = result.changeAmount > 0 ? 'positive' : result.changeAmount < 0 ? 'negative' : 'neutral';

  previewContainer.innerHTML = `
    <div class="sim-metric">
      <div class="value">${formatINR(Math.round(result.projectedTotalRecovery))}</div>
      <div class="label">Projected Recovery</div>
    </div>
    <div class="sim-change ${changeClass}">
      ${changeSign}${formatINR(Math.round(result.changeAmount))} (${changeSign}${result.changePercent.toFixed(1)}%)
    </div>
    <div class="sim-metric" style="background:var(--color-surface-dim)">
      <div class="value" style="font-size:20px;color:var(--color-text-secondary)">${formatINR(Math.round(result.originalTotalRecovery))}</div>
      <div class="label">Baseline Recovery</div>
    </div>
  `;
}

function mapActionToSimKey(action) {
  const map = {
    'Restock': 'Restock',
    'Repackage and Resell': 'Repackage',
    'Refurbish and Resell': 'Refurbish',
    'Repair': 'Repair',
    'Recycle': 'Recycle'
  };
  return map[action] || action;
}

/**
 * Panel / Modal helpers
 */
function openPanel(id) {
  const panel = document.getElementById(id);
  if (panel) { panel.classList.add('active'); panel.setAttribute('aria-hidden', 'false');
    const first = panel.querySelector('input, select, button'); if (first) first.focus(); }
}
function closePanel(id) {
  const panel = document.getElementById(id);
  if (panel) { panel.classList.remove('active'); panel.setAttribute('aria-hidden', 'true'); }
}
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false');
    const btn = modal.querySelector('button'); if (btn) btn.focus(); }
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); }
}
