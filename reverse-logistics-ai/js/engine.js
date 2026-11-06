/**
 * ============================================================================
 *  AI Reverse Logistics Decision Engine
 * ============================================================================
 *  Core scoring model that recommends the optimal reverse-logistics action
 *  for returned products. Uses a weighted matrix of condition scores and
 *  return-reason modifiers to produce ranked recommendations with confidence
 *  scores, environmental-impact estimates, and cost-benefit analysis.
 *
 *  Exports:
 *    ACTIONS, CONDITIONS, REASONS,
 *    recommend(), calculateRecoveryValue(), formatINR(),
 *    confidenceScore(), calculateEnvironmentalImpact(), calculateCostBenefit()
 * ============================================================================
 */

// ── Possible Reverse-Logistics Actions ──────────────────────────────────────
const ACTIONS = [
  'Restock',
  'Repackage and Resell',
  'Refurbish and Resell',
  'Repair',
  'Recycle'
];

// ── Product Conditions ──────────────────────────────────────────────────────
const CONDITIONS = [
  'Unopened / New',
  'Opened - Like New',
  'Missing Packaging/Accessories',
  'Minor Cosmetic Damage',
  'Functional Defect',
  'Major Damage / Broken'
];

// ── Return Reasons ──────────────────────────────────────────────────────────
const REASONS = [
  'Changed mind',
  'Wrong size',
  'Wrong item shipped',
  'Defective',
  'Damaged in transit',
  'Not as described',
  'Packaging damaged'
];

// ── Condition Base-Score Matrix ──────────────────────────────────────────────
// Each row maps to a condition (same order as CONDITIONS).
// Columns: [Restock, Repackage, Refurbish, Repair, Recycle]
const CONDITION_SCORES = {
  'Unopened / New':                 [10, 6, 1, 0, 0],
  'Opened - Like New':             [ 7, 7, 3, 0, 0],
  'Missing Packaging/Accessories': [ 2, 9, 3, 0, 0],
  'Minor Cosmetic Damage':         [ 0, 3, 9, 4, 0],
  'Functional Defect':             [ 0, 0, 4, 9, 2],
  'Major Damage / Broken':         [ 0, 0, 0, 3, 10]
};

// ── Return-Reason Modifier Matrix ───────────────────────────────────────────
// Sparse modifiers — only non-zero entries are listed.
// Index mapping: 0=Restock, 1=Repackage, 2=Refurbish, 3=Repair, 4=Recycle
const REASON_MODIFIERS = {
  'Changed mind':       { 0: 2, 1: 1 },   // Restock +2, Repackage +1
  'Wrong size':         { 0: 2, 1: 1 },   // Restock +2, Repackage +1
  'Wrong item shipped': { 0: 2, 1: 1 },   // Restock +2, Repackage +1
  'Defective':          { 3: 2, 2: 1 },   // Repair +2, Refurbish +1
  'Damaged in transit': { 2: 2, 3: 1 },   // Refurbish +2, Repair +1
  'Not as described':   { 0: 2, 2: 1 },   // Restock +2, Refurbish +1
  'Packaging damaged':  { 1: 2 }           // Repackage +2
};

// ── Recovery Percentages ────────────────────────────────────────────────────
// Fraction of original price recoverable for each action.
const RECOVERY_PCT = {
  'Restock':              95,
  'Repackage and Resell': 80,
  'Refurbish and Resell': 70,
  'Repair':               50,
  'Recycle':              10
};

// ── Environmental Impact Factors ────────────────────────────────────────────
// Per-action factors for sustainability estimation.
//   co2      → kg CO₂ avoided (base, scaled by normalised price)
//   waste    → kg waste diverted (base, scaled by normalised price)
//   landfill → % of landfill space saved (fixed per action)
const ENV_FACTORS = {
  'Restock':              { co2: 8.2, waste: 0.1, landfill: 98 },
  'Repackage and Resell': { co2: 6.5, waste: 0.3, landfill: 95 },
  'Refurbish and Resell': { co2: 5.1, waste: 0.8, landfill: 88 },
  'Repair':               { co2: 3.2, waste: 1.5, landfill: 72 },
  'Recycle':              { co2: 1.8, waste: 2.5, landfill: 45 }
};

// Average product price used to normalise environmental scaling.
const AVG_PRODUCT_PRICE = 5000;

// ── Core Recommendation Engine ──────────────────────────────────────────────

/**
 * Recommend the best reverse-logistics action for a returned product.
 *
 * @param   {string} condition – One of CONDITIONS.
 * @param   {string} reason    – One of REASONS.
 * @returns {{ action: string, scores: number[] }}
 *          The top-ranked action and the full score array.
 */
function recommend(condition, reason) {
  // 1. Start with base condition scores (defensive copy).
  const scores = [...(CONDITION_SCORES[condition] || [0, 0, 0, 0, 0])];

  // 2. Apply return-reason modifiers.
  const mods = REASON_MODIFIERS[reason] || {};
  for (const [idx, bonus] of Object.entries(mods)) {
    scores[Number(idx)] += bonus;
  }

  // 3. Determine the action with the highest score.
  let bestIdx = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[bestIdx]) {
      bestIdx = i;
    }
  }

  const action = ACTIONS[bestIdx];
  const recoveryPct = RECOVERY_PCT[action] || 0;

  // Build a human-readable reasoning line.
  const condVerbs = {
    'Restock': 'restocking',
    'Repackage and Resell': 'repackaging',
    'Refurbish and Resell': 'refurbishment',
    'Repair': 'repair',
    'Recycle': 'recycling'
  };
  const reasoning = `Condition '${condition}' favors ${condVerbs[action] || action.toLowerCase()}; reason '${reason}' adds weight.`;

  return {
    action,
    scores,
    recoveryPct,
    reasoning
  };
}

// ── Financial Helpers ───────────────────────────────────────────────────────

/**
 * Calculate the estimated recovery value for a product.
 *
 * @param   {number} originalPrice – Original product price in INR.
 * @param   {string} action        – Recommended action.
 * @returns {number} Recovery value in INR.
 */
function calculateRecoveryValue(originalPrice, action) {
  const pct = RECOVERY_PCT[action];
  if (pct === undefined) return 0;
  return Math.round(originalPrice * (pct / 100));
}

/**
 * Format a number as Indian Rupees (₹) with locale grouping.
 *
 * @param   {number} amount
 * @returns {string} e.g. "₹24,999"
 */
function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// ── Confidence Scoring ──────────────────────────────────────────────────────

/**
 * Calculate a 0–100 confidence score for the recommendation.
 *
 * The score reflects how decisively the top action outperforms the runner-up.
 * A large margin means the engine is very confident; a near-tie yields low
 * confidence.
 *
 * Formula:  margin = (topScore − secondScore) / topScore × 100
 *           Clamped to [0, 100].
 *
 * @param   {number[]} scores – Score array from recommend().
 * @returns {number}   Confidence percentage (0–100), rounded to one decimal.
 */
function confidenceScore(scores) {
  if (!scores || scores.length < 2) return 0;

  // Sort descending to find top two scores.
  const sorted = [...scores].sort((a, b) => b - a);
  const top    = sorted[0];
  const second = sorted[1];

  // Edge case: top score is 0 → no meaningful recommendation.
  if (top === 0) return 0;

  const margin = ((top - second) / top) * 100;
  return Math.round(Math.min(100, Math.max(0, margin)) * 10) / 10;
}

// ── Environmental Impact ────────────────────────────────────────────────────

/**
 * Estimate the environmental benefit of the recommended action.
 *
 * CO₂ avoided and waste diverted are scaled by a price normalisation factor
 * (price / AVG_PRODUCT_PRICE) so higher-value products carry proportionally
 * more environmental weight. Landfill savings are a fixed percentage per
 * action type.
 *
 * @param   {string} action – Recommended action (one of ACTIONS).
 * @param   {number} price  – Original product price in INR.
 * @returns {{ co2Avoided: number, wasteDiverted: number, landfillSaved: number }}
 */
function calculateEnvironmentalImpact(action, price) {
  const factors = ENV_FACTORS[action];
  if (!factors) {
    return { co2Avoided: 0, wasteDiverted: 0, landfillSaved: 0 };
  }

  const priceScale = price / AVG_PRODUCT_PRICE;

  return {
    co2Avoided:    Math.round(factors.co2 * priceScale * 100) / 100,
    wasteDiverted: Math.round(factors.waste * priceScale * 100) / 100,
    landfillSaved: factors.landfill
  };
}

// ── Cost-Benefit Analysis ───────────────────────────────────────────────────

/**
 * Calculate a simple cost-benefit breakdown for the recommendation.
 *
 * @param   {number} originalPrice – Original product price in INR.
 * @param   {number} recoveryPct   – Recovery percentage for the chosen action.
 * @returns {{ recoveryValue: number, lostValue: number, savingsVsDisposal: number }}
 *          - recoveryValue:    money recovered through the action.
 *          - lostValue:        money lost vs. original price.
 *          - savingsVsDisposal: how much is saved compared to pure disposal
 *                               (disposal cost = 15 % of original price).
 */
function calculateCostBenefit(originalPrice, recoveryPct) {
  const recoveryValue    = Math.round(originalPrice * (recoveryPct / 100));
  const lostValue        = originalPrice - recoveryValue;
  const disposalCost     = Math.round(originalPrice * 0.15);
  const savingsVsDisposal = recoveryValue + disposalCost; // value recovered + disposal avoided

  return {
    recoveryValue,
    lostValue,
    savingsVsDisposal
  };
}

// ── Module Exports ──────────────────────────────────────────────────────────
// Attach to `window` so every other module can reach them via the global scope.

window.DecisionEngine = {
  // Constants
  ACTIONS,
  CONDITIONS,
  REASONS,
  CONDITION_SCORES,
  REASON_MODIFIERS,
  RECOVERY_PCT,

  // Core
  recommend,
  calculateRecoveryValue,
  formatINR,

  // Enhanced analytics
  confidenceScore,
  calculateEnvironmentalImpact,
  calculateCostBenefit
};
