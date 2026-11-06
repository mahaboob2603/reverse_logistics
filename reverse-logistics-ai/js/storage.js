/**
 * ============================================================================
 *  AI Reverse Logistics — Local Storage Manager
 * ============================================================================
 *  Provides a robust persistence layer for records and application settings,
 *  plus a CSV-export utility. Every localStorage call is wrapped in try/catch
 *  so the app degrades gracefully in private-browsing mode or when storage
 *  is full.
 *
 *  Exports (via window.StorageManager):
 *    loadRecords(), saveRecords(), clearRecords(), recordExists(),
 *    loadSettings(), saveSettings(),
 *    exportToCSV()
 * ============================================================================
 */

// ── Storage Keys ────────────────────────────────────────────────────────────
const STORAGE_KEY  = 'reverseLogisticsRecords';
const SETTINGS_KEY = 'reverseLogisticsSettings';

// ── Default Settings ────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  darkMode:       false,
  onboardingDone: false
};

// ─────────────────────────────────────────────────────────────────────────────
//  Records CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load all records from localStorage.
 *
 * @returns {object[]} Parsed records array, or an empty array on failure.
 */
function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[StorageManager] Failed to load records:', err);
    return [];
  }
}

/**
 * Persist the full records array to localStorage.
 *
 * @param {object[]} records – Array of record objects to save.
 * @returns {boolean} True if the save succeeded.
 */
function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (err) {
    console.error('[StorageManager] Failed to save records:', err);
    return false;
  }
}

/**
 * Remove all records from localStorage.
 *
 * @returns {boolean} True if the clear succeeded.
 */
function clearRecords() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.error('[StorageManager] Failed to clear records:', err);
    return false;
  }
}

/**
 * Check whether a record with the given ID already exists.
 *
 * @param   {string}  id – Record ID to look for (e.g. "R-1001").
 * @returns {boolean} True if a record with that ID is in storage.
 */
function recordExists(id) {
  const records = loadRecords();
  return records.some(r => r.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Application Settings
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load application settings from localStorage.
 *
 * Returns a merged object of DEFAULT_SETTINGS overridden by any persisted
 * values, so newly added settings always have a sane default.
 *
 * @returns {object} Settings object.
 */
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.warn('[StorageManager] Failed to load settings:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persist application settings.  Accepts a partial object — only the
 * provided keys are updated; existing keys are preserved.
 *
 * @param {object} partialSettings – Key/value pairs to merge into settings.
 * @returns {boolean} True if the save succeeded.
 */
function saveSettings(partialSettings) {
  try {
    const current = loadSettings();
    const merged  = { ...current, ...partialSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    return true;
  } catch (err) {
    console.error('[StorageManager] Failed to save settings:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  CSV Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a CSV string from the records array and trigger a browser
 * download.  Handles field escaping (commas, quotes, newlines) per RFC 4180.
 *
 * Columns exported:
 *   ID, Product, Category, Price, Condition, Reason, Recommendation,
 *   Recovery Value, Confidence, CO₂ Avoided (kg), Waste Diverted (kg),
 *   Landfill Saved (%), Savings vs Disposal
 *
 * @param {object[]} records – The records to export.
 */
function exportToCSV(records) {
  if (!records || records.length === 0) {
    console.warn('[StorageManager] No records to export.');
    return;
  }

  // ── Column headers ────────────────────────────────────────────────────
  const headers = [
    'ID',
    'Product',
    'Category',
    'Price',
    'Condition',
    'Reason',
    'Recommendation',
    'Recovery Value',
    'Confidence (%)',
    'CO2 Avoided (kg)',
    'Waste Diverted (kg)',
    'Landfill Saved (%)',
    'Savings vs Disposal'
  ];

  // ── Row builder ───────────────────────────────────────────────────────
  const escapeField = (value) => {
    const str = String(value === undefined || value === null ? '' : value);
    // Wrap in quotes if the field contains a comma, quote, or newline.
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const rows = records.map(r => {
    const env  = r.environmentalImpact || {};
    const cost = r.costBenefit || {};
    return [
      r.id,
      r.product,
      r.category || '',
      r.price,
      r.condition,
      r.reason,
      r.recommendation,
      r.recoveryValue,
      r.confidence,
      env.co2Avoided,
      env.wasteDiverted,
      env.landfillSaved,
      cost.savingsVsDisposal
    ].map(escapeField).join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');

  // ── Trigger browser download ──────────────────────────────────────────
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `reverse_logistics_${Date.now()}.csv`);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL after a short delay.
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    console.error('[StorageManager] CSV download failed:', err);
  }
}

// ── Module Exports ──────────────────────────────────────────────────────────

window.StorageManager = {
  // Records
  loadRecords,
  saveRecords,
  clearRecords,
  recordExists,

  // Settings
  loadSettings,
  saveSettings,

  // Export
  exportToCSV
};
