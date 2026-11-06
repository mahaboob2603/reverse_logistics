// ============================================================
// app.js — Enhanced Event Wiring & Initialization
// AI Reverse Logistics Decision Assistant (Premium Edition)
// ============================================================

let records = [];
let currentAnalysis = null;
let activeSection = 'dashboard';

// ── Initialization ────────────────────────────────────────────
function init() {
  // Self-test
  const selfTestResult = runSelfTest();
  console.log(`%c[Self-Test] ${selfTestResult.passed}/${selfTestResult.total} PASS — ${selfTestResult.passed === 8 ? 'PASS ✓' : 'FAIL ✗'}`, selfTestResult.passed === 8 ? 'color:#2E7D32;font-weight:bold' : 'color:#DC2626;font-weight:bold');
  selfTestResult.results.forEach(r => {
    console.log(`  ${r.id}: AI=${r.predicted}, Expected=${r.expected} → ${r.status}`);
  });

  // Dark mode
  if (typeof initDarkMode === 'function') initDarkMode();

  // Set dark mode knob icon correctly on load
  const isDarkOnLoad = document.documentElement.classList.contains('dark');
  const knobOnLoad = document.querySelector('.theme-toggle-knob');
  if (knobOnLoad) knobOnLoad.textContent = isDarkOnLoad ? '🌙' : '☀️';

  // Load or seed data
  const stored = loadRecords();
  if (stored && stored.length > 0) {
    records = stored;
  } else {
    records = buildInitialRecords();
    saveRecords(records);
  }

  // Initial render with animations
  refreshUI(true);

  // Wire events
  wireEvents();

  // Scroll animations
  if (typeof initScrollAnimations === 'function') {
    setTimeout(() => initScrollAnimations(), 100);
  }

  // Render supply chain flow
  renderSupplyChainFlow();

  console.log('%c[App] AI Reverse Logistics Decision Assistant initialized', 'color:#2E7D32;font-weight:bold');
  console.log(`[App] ${records.length} records loaded`);
}

// ── Refresh All UI ────────────────────────────────────────────
function refreshUI(animate = false) {
  renderKPIs(records, animate);
  renderDonutChart(records);
  renderDistRows(records);
  renderEnvironmental(records);
  renderTable(records, getFilterValue(), getSearchValue());
  renderSimulator(records);
}

function getFilterValue() {
  const el = document.getElementById('filter-action');
  return el ? el.value : 'all';
}
function getSearchValue() {
  const el = document.getElementById('search-box');
  return el ? el.value.trim() : '';
}

// ── Section Navigation ────────────────────────────────────────
function switchSection(sectionId) {
  activeSection = sectionId;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const section = document.getElementById(`section-${sectionId}`);
  if (section) section.classList.add('active');

  const tab = document.querySelector(`.nav-tab[data-section="${sectionId}"]`);
  if (tab) tab.classList.add('active');

  // Re-render charts when switching to dashboard (they need visible container)
  if (sectionId === 'dashboard') {
    setTimeout(() => {
      renderDonutChart(records);
      renderEnvironmental(records);
    }, 50);
  }
}

// ── Event Wiring ──────────────────────────────────────────────
function wireEvents() {
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const section = tab.dataset.section;
      if (section) switchSection(section);
    });
  });

  // Action buttons
  document.getElementById('btn-analyse').addEventListener('click', () => {
    clearForm();
    openPanel('analyse-panel');
  });

  document.getElementById('btn-add').addEventListener('click', handleAddReturn);

  document.getElementById('btn-view-all').addEventListener('click', () => {
    switchSection('comparison');
  });

  document.getElementById('btn-evaluate').addEventListener('click', () => {
    switchSection('evaluation');
    renderEvaluation(records);
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    openModal('reset-modal');
  });

  // Dark mode toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      if (typeof toggleDarkMode === 'function') toggleDarkMode();
      const knob = themeToggle.querySelector('.theme-toggle-knob');
      if (knob) {
        const isDark = document.documentElement.classList.contains('dark');
        knob.textContent = isDark ? '🌙' : '☀️';
      }
      // Re-render SVG elements so CSS variables take effect
      renderSupplyChainFlow();
      renderDonutChart(records);
      renderEnvironmental(records);
    });
  }

  // Export CSV
  const exportBtn = document.getElementById('btn-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (typeof exportToCSV === 'function') {
        exportToCSV(records);
        showToast('CSV exported successfully!', 'success');
      }
    });
  }

  // Analyse panel
  document.getElementById('btn-run-analyse').addEventListener('click', handleAnalyse);
  document.getElementById('btn-save-return').addEventListener('click', handleSaveReturn);
  document.getElementById('btn-close-panel').addEventListener('click', () => {
    closePanel('analyse-panel'); currentAnalysis = null;
  });

  document.getElementById('analyse-panel').addEventListener('click', (e) => {
    if (e.target.id === 'analyse-panel') { closePanel('analyse-panel'); currentAnalysis = null; }
  });

  // Reset modal
  document.getElementById('btn-confirm-reset').addEventListener('click', handleReset);
  document.getElementById('btn-cancel-reset').addEventListener('click', () => closeModal('reset-modal'));
  document.getElementById('reset-modal').addEventListener('click', (e) => {
    if (e.target.id === 'reset-modal') closeModal('reset-modal');
  });

  // Table controls
  document.getElementById('filter-action').addEventListener('change', () => {
    renderTable(records, getFilterValue(), getSearchValue());
  });
  document.getElementById('search-box').addEventListener('input', () => {
    renderTable(records, getFilterValue(), getSearchValue());
  });

  // Delete (delegated)
  document.getElementById('table-body').addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-btn');
    if (btn) handleDelete(btn.dataset.id);
  });

  // Simulator sliders (delegated)
  const simSliders = document.getElementById('sim-sliders');
  if (simSliders) {
    simSliders.addEventListener('input', (e) => {
      if (e.target.type === 'range') {
        const action = e.target.dataset.action;
        const val = parseInt(e.target.value);
        if (typeof updateSimulatorRate === 'function') updateSimulatorRate(action, val);
        const valDisplay = document.getElementById(`sim-val-${action}`);
        if (valDisplay) valDisplay.textContent = val + '%';
        updateSimulatorPreview(records);
      }
    });
  }

  const simReset = document.getElementById('sim-reset');
  if (simReset) {
    simReset.addEventListener('click', () => {
      if (typeof resetSimulator === 'function') resetSimulator();
      renderSimulator(records);
      showToast('Simulator reset to defaults', 'info');
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanel('analyse-panel');
      closeModal('reset-modal');
      currentAnalysis = null;
    }
    // Ctrl+E = Export
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      if (typeof exportToCSV === 'function') { exportToCSV(records); showToast('CSV exported!', 'success'); }
    }
    // Ctrl+N = New analysis
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      clearForm();
      openPanel('analyse-panel');
    }
  });
}

// ── Form Validation ───────────────────────────────────────────
function validateForm() {
  const errors = {};
  const id = document.getElementById('input-id').value.trim();
  const product = document.getElementById('input-product').value.trim();
  const priceStr = document.getElementById('input-price').value.trim();
  const condition = document.getElementById('input-condition').value;
  const reason = document.getElementById('input-reason').value;

  if (!id) errors.id = 'Return ID is required';
  if (!product) errors.product = 'Product Name is required';
  const price = parseFloat(priceStr);
  if (!priceStr) errors.price = 'Price is required';
  else if (isNaN(price) || price <= 0) errors.price = 'Price must be a positive number';
  if (!condition) errors.condition = 'Condition is required';
  if (!reason) errors.reason = 'Reason is required';

  return Object.keys(errors).length > 0 ? errors : null;
}

function showFormErrors(errors) {
  document.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
  if (!errors) return;
  for (const [field, message] of Object.entries(errors)) {
    const err = document.getElementById(`error-${field}`);
    const inp = document.getElementById(`input-${field}`);
    if (err) { err.textContent = message; err.classList.add('visible'); }
    if (inp) inp.classList.add('error');
  }
}

function clearForm() {
  ['input-id', 'input-product', 'input-price', 'input-condition', 'input-reason', 'input-expected'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  showFormErrors(null);
  document.getElementById('result-card').classList.remove('visible');
  currentAnalysis = null;
}

// ── Analyse ───────────────────────────────────────────────────
function handleAnalyse() {
  const errors = validateForm();
  if (errors) { showFormErrors(errors); showToast('Please fix the form errors', 'error'); return; }
  showFormErrors(null);

  const condition = document.getElementById('input-condition').value;
  const reason = document.getElementById('input-reason').value;
  const price = parseFloat(document.getElementById('input-price').value);

  const result = recommend(condition, reason);
  const recoveryValue = calculateRecoveryValue(price, result.action);
  const confidence = typeof confidenceScore === 'function' ? confidenceScore(result.scores) : 0;

  currentAnalysis = { ...result, recoveryValue, price, confidence };

  // Show result card
  const card = document.getElementById('result-card');
  document.getElementById('result-action').textContent = result.action;
  document.getElementById('result-recovery-pct').textContent = result.recoveryPct + '%';
  document.getElementById('result-recovery-value').textContent = formatINR(recoveryValue);
  document.getElementById('result-confidence').textContent = confidence + '%';
  document.getElementById('result-reasoning').textContent = result.reasoning || '';

  const breakdownEl = document.getElementById('result-scores');
  breakdownEl.innerHTML = ACTIONS.map((action, idx) => {
    const score = result.scores[idx] || 0;
    const isWinner = action === result.action;
    const short = ACTION_SHORT[action] || action;
    return `<span class="score-item ${isWinner ? 'winner' : ''}">${escapeHTML(short)}: ${score}</span>`;
  }).join('');

  card.classList.add('visible');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Add Return ────────────────────────────────────────────────
function handleAddReturn() {
  const panel = document.getElementById('analyse-panel');
  if (!panel.classList.contains('active')) { clearForm(); openPanel('analyse-panel'); return; }
  handleSaveReturn();
}

function handleSaveReturn() {
  if (!currentAnalysis) { handleAnalyse(); if (!currentAnalysis) return; }

  const id = document.getElementById('input-id').value.trim();
  const product = document.getElementById('input-product').value.trim();
  const price = parseFloat(document.getElementById('input-price').value);
  const condition = document.getElementById('input-condition').value;
  const reason = document.getElementById('input-reason').value;
  const expected = document.getElementById('input-expected').value;

  if (records.some(r => r.id === id)) { showToast(`Return ID "${id}" already exists!`, 'error'); return; }

  const knownAnswer = expected || null;
  let matchStatus = 'Pending';
  if (knownAnswer) matchStatus = currentAnalysis.action === knownAnswer ? 'Match' : 'Mismatch';

  const envImpact = typeof calculateEnvironmentalImpact === 'function'
    ? calculateEnvironmentalImpact(currentAnalysis.action, price) : null;
  const costBenefit = typeof calculateCostBenefit === 'function'
    ? calculateCostBenefit(price, currentAnalysis.recoveryPct) : null;

  const newRecord = {
    id, product, price, condition, reason, knownAnswer,
    aiAction: currentAnalysis.action,
    scores: currentAnalysis.scores,
    reasoning: currentAnalysis.reasoning,
    recoveryPct: currentAnalysis.recoveryPct,
    recoveryValue: currentAnalysis.recoveryValue,
    confidence: currentAnalysis.confidence,
    matchStatus,
    environmentalImpact: envImpact,
    costBenefit
  };

  records.push(newRecord);
  saveRecords(records);
  refreshUI();

  showToast(`Return ${id} added successfully!`, 'success');
  closePanel('analyse-panel');
  currentAnalysis = null;
}

// ── Delete ────────────────────────────────────────────────────
function handleDelete(id) {
  records = records.filter(r => r.id !== id);
  saveRecords(records);
  refreshUI();
  showToast(`Record ${id} deleted`, 'info');
}

// ── Reset ─────────────────────────────────────────────────────
function handleReset() {
  clearRecords();
  records = buildInitialRecords();
  saveRecords(records);
  refreshUI(true);
  closeModal('reset-modal');
  document.getElementById('evaluation-section').classList.remove('visible');
  if (typeof resetSimulator === 'function') resetSimulator();
  renderSimulator(records);
  switchSection('dashboard');
  showToast('Dashboard reset to seed data', 'success');
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
