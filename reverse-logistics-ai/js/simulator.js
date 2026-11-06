/**
 * simulator.js — What-If Scenario Simulator Engine
 * AI Reverse Logistics Decision Assistant
 *
 * Provides scenario modelling: users can tweak recovery-rate percentages
 * for each disposition action and instantly see the projected impact on
 * total value recovery compared to baseline defaults.
 *
 * No external dependencies.
 */

/* ------------------------------------------------------------------ */
/*  Default Recovery Rates (%)                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_RECOVERY_RATES = Object.freeze({
  Restock:   95,
  Repackage: 80,
  Refurbish: 70,
  Repair:    50,
  Recycle:   10,
});

/* ------------------------------------------------------------------ */
/*  Simulator State                                                   */
/* ------------------------------------------------------------------ */

/**
 * Mutable state object that tracks the user's custom recovery
 * percentages.  Starts as a copy of the defaults.
 */
const SimulatorState = {
  customRates: { ...DEFAULT_RECOVERY_RATES },
};

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Reset every custom rate back to the factory defaults.
 */
function resetSimulator() {
  SimulatorState.customRates = { ...DEFAULT_RECOVERY_RATES };
}

/**
 * Update a single action's recovery rate.
 *
 * @param {string} action  — Disposition action name (e.g. "Restock").
 * @param {number} newRate — New recovery percentage (clamped 0-100).
 */
function updateSimulatorRate(action, newRate) {
  if (!(action in DEFAULT_RECOVERY_RATES)) {
    console.warn(`[Simulator] Unknown action: "${action}"`);
    return;
  }
  // Clamp to [0, 100]
  SimulatorState.customRates[action] = Math.max(0, Math.min(100, Number(newRate) || 0));
}

/**
 * Simulate the financial impact of applying custom recovery rates to
 * an array of decision records.
 *
 * Each record is expected to have at least:
 *   - record.recommended  (string)  — the disposition action
 *   - record.product_value (number) — original product value (₹)
 *
 * @param {Array}  records     — Current decision records.
 * @param {Object} customRates — Map of action → recovery % (0-100).
 *                                Defaults to SimulatorState.customRates.
 * @returns {Object} Impact summary.
 */
function simulateImpact(records, customRates) {
  const rates = customRates || SimulatorState.customRates;

  // Aggregate per-action counts and value sums
  const actionMap = {}; // action → { count, totalValue }

  records.forEach((rec) => {
    const action = rec.recommended || rec.action || 'Unknown';
    const value  = Number(rec.product_value) || 0;

    if (!actionMap[action]) {
      actionMap[action] = { count: 0, totalValue: 0 };
    }
    actionMap[action].count    += 1;
    actionMap[action].totalValue += value;
  });

  let originalTotalRecovery  = 0;
  let projectedTotalRecovery = 0;
  const perActionBreakdown   = [];

  Object.keys(actionMap).forEach((action) => {
    const { totalValue } = actionMap[action];
    const defaultRate    = DEFAULT_RECOVERY_RATES[action] ?? 0;
    const customRate     = rates[action] ?? defaultRate;

    const originalValue  = totalValue * (defaultRate / 100);
    const projectedValue = totalValue * (customRate  / 100);

    originalTotalRecovery  += originalValue;
    projectedTotalRecovery += projectedValue;

    perActionBreakdown.push({
      action,
      originalValue:  Math.round(originalValue  * 100) / 100,
      projectedValue: Math.round(projectedValue * 100) / 100,
      change:         Math.round((projectedValue - originalValue) * 100) / 100,
    });
  });

  const changeAmount  = projectedTotalRecovery - originalTotalRecovery;
  const changePercent = originalTotalRecovery === 0
    ? 0
    : (changeAmount / originalTotalRecovery) * 100;

  return {
    originalTotalRecovery:  Math.round(originalTotalRecovery  * 100) / 100,
    projectedTotalRecovery: Math.round(projectedTotalRecovery * 100) / 100,
    changeAmount:           Math.round(changeAmount           * 100) / 100,
    changePercent:          Math.round(changePercent           * 100) / 100,
    perActionBreakdown,
  };
}

/**
 * Sensitivity analysis: for one disposition action, sweep its recovery
 * rate across a range and report the resulting total recovery at each
 * step.  All other rates stay at the current custom values.
 *
 * @param {Array}  records   — Current decision records.
 * @param {string} action    — The action to vary (e.g. "Refurbish").
 * @param {Object} rateRange — { min: Number, max: Number } (0-100).
 *                              Defaults to { min: 0, max: 100 }.
 * @returns {Array<{rate: number, totalRecovery: number}>}
 */
function sensitivityAnalysis(records, action, rateRange) {
  const min  = Math.max(0,   (rateRange && rateRange.min) ?? 0);
  const max  = Math.min(100, (rateRange && rateRange.max) ?? 100);
  const step = 5;

  const results = [];

  for (let rate = min; rate <= max; rate += step) {
    // Build a one-off rates map with the varied action
    const tempRates = { ...SimulatorState.customRates, [action]: rate };
    const impact    = simulateImpact(records, tempRates);

    results.push({
      rate,
      totalRecovery: impact.projectedTotalRecovery,
    });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Exports (module-compatible & global)                              */
/* ------------------------------------------------------------------ */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_RECOVERY_RATES,
    SimulatorState,
    resetSimulator,
    updateSimulatorRate,
    simulateImpact,
    sensitivityAnalysis,
  };
}
