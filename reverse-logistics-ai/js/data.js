/**
 * ============================================================================
 *  AI Reverse Logistics — Seed Data & Self-Test
 * ============================================================================
 *  Provides 10 canonical return records used to bootstrap the application,
 *  a self-test harness that validates the Decision Engine against known
 *  answers, and enrichment helpers that annotate each record with confidence,
 *  environmental-impact, and cost-benefit data.
 *
 *  Exports (via window.SeedData):
 *    SEED_RECORDS, PRODUCT_CATEGORIES, PRODUCT_WEIGHTS,
 *    runSelfTest(), buildInitialRecords()
 * ============================================================================
 */

// ── Product Category Mapping ────────────────────────────────────────────────
// Richer categorisation for display, filtering, and analytics.
const PRODUCT_CATEGORIES = {
  'Wireless Earbuds':   'Electronics',
  'Smartphone':         'Electronics',
  'Running Shoes':      'Footwear',
  'Laptop Bag':         'Accessories',
  'Bluetooth Speaker':  'Electronics',
  'Smartwatch':         'Electronics',
  'Coffee Maker':       'Appliances',
  'Tablet':             'Electronics',
  'Gaming Mouse':       'Electronics',
  'Mixer Grinder':      'Appliances'
};

// ── Product Weight Estimates (kg) ───────────────────────────────────────────
// Used to scale environmental impact calculations.
const PRODUCT_WEIGHTS = {
  'Wireless Earbuds':   0.05,
  'Smartphone':         0.20,
  'Running Shoes':      0.65,
  'Laptop Bag':         0.80,
  'Bluetooth Speaker':  0.55,
  'Smartwatch':         0.08,
  'Coffee Maker':       3.20,
  'Tablet':             0.45,
  'Gaming Mouse':       0.12,
  'Mixer Grinder':      3.80
};

// ── Seed Records ────────────────────────────────────────────────────────────
// The 10 canonical return records that ship with the application.
// `knownAnswer` is the domain-expert expectation used by the self-test.
const SEED_RECORDS = [
  {
    id:          'R-1001',
    product:     'Wireless Earbuds',
    price:       3999,
    condition:   'Unopened / New',
    reason:      'Changed mind',
    knownAnswer: 'Restock'
  },
  {
    id:          'R-1002',
    product:     'Smartphone',
    price:       24999,
    condition:   'Functional Defect',
    reason:      'Defective',
    knownAnswer: 'Repair'
  },
  {
    id:          'R-1003',
    product:     'Running Shoes',
    price:       4499,
    condition:   'Opened - Like New',
    reason:      'Wrong size',
    knownAnswer: 'Restock'
  },
  {
    id:          'R-1004',
    product:     'Laptop Bag',
    price:       2799,
    condition:   'Missing Packaging/Accessories',
    reason:      'Changed mind',
    knownAnswer: 'Repackage and Resell'
  },
  {
    id:          'R-1005',
    product:     'Bluetooth Speaker',
    price:       5499,
    condition:   'Minor Cosmetic Damage',
    reason:      'Damaged in transit',
    knownAnswer: 'Refurbish and Resell'
  },
  {
    id:          'R-1006',
    product:     'Smartwatch',
    price:       8999,
    condition:   'Major Damage / Broken',
    reason:      'Damaged in transit',
    knownAnswer: 'Recycle'
  },
  {
    id:          'R-1007',
    product:     'Coffee Maker',
    price:       6499,
    condition:   'Functional Defect',
    reason:      'Defective',
    knownAnswer: 'Refurbish and Resell'
    // Engine produces "Repair" — known mismatch (FAIL expected).
  },
  {
    id:          'R-1008',
    product:     'Tablet',
    price:       19999,
    condition:   'Opened - Like New',
    reason:      'Not as described',
    knownAnswer: 'Restock'
  },
  {
    id:          'R-1009',
    product:     'Gaming Mouse',
    price:       2499,
    condition:   'Minor Cosmetic Damage',
    reason:      'Changed mind',
    knownAnswer: 'Repackage and Resell'
    // Engine produces "Refurbish and Resell" — known mismatch (FAIL expected).
  },
  {
    id:          'R-1010',
    product:     'Mixer Grinder',
    price:       4299,
    condition:   'Major Damage / Broken',
    reason:      'Defective',
    knownAnswer: 'Recycle'
  }
];

// ── Self-Test Harness ───────────────────────────────────────────────────────

/**
 * Run the decision engine against every seed record and compare with
 * the domain-expert `knownAnswer`.
 *
 * Expected result: **8 / 10 PASS**.
 *   • R-1007 mismatches (engine → Repair, expert → Refurbish and Resell)
 *   • R-1009 mismatches (engine → Refurbish and Resell, expert → Repackage and Resell)
 *
 * @returns {{ total: number, passed: number, failed: number, results: object[] }}
 */
function runSelfTest() {
  const engine  = window.DecisionEngine;
  const results = [];
  let passed    = 0;
  let failed    = 0;

  SEED_RECORDS.forEach(record => {
    const { action, scores } = engine.recommend(record.condition, record.reason);
    const match = action === record.knownAnswer;

    if (match) {
      passed++;
    } else {
      failed++;
    }

    results.push({
      id:          record.id,
      product:     record.product,
      condition:   record.condition,
      reason:      record.reason,
      expected:    record.knownAnswer,
      predicted:   action,
      scores,
      confidence:  engine.confidenceScore(scores),
      status:      match ? 'PASS' : 'FAIL'
    });
  });

  return {
    total:   SEED_RECORDS.length,
    passed,
    failed,
    results
  };
}

// ── Initial Record Builder ──────────────────────────────────────────────────

/**
 * Build the initial enriched records array from the seed data.
 *
 * Each record is augmented with:
 *   • recommendation   — engine-predicted action
 *   • scores           — raw score array
 *   • recoveryValue    — estimated monetary recovery (INR)
 *   • confidence       — 0-100 confidence score
 *   • environmentalImpact — { co2Avoided, wasteDiverted, landfillSaved }
 *   • costBenefit      — { recoveryValue, lostValue, savingsVsDisposal }
 *   • category         — product category (Electronics, Footwear, etc.)
 *   • weight           — estimated product weight in kg
 *
 * @returns {object[]} Enriched record objects ready for storage and display.
 */
function buildInitialRecords() {
  const engine = window.DecisionEngine;

  return SEED_RECORDS.map(seed => {
    const { action, scores, recoveryPct, reasoning } = engine.recommend(seed.condition, seed.reason);
    const recoveryValue       = engine.calculateRecoveryValue(seed.price, action);
    const confidence          = engine.confidenceScore(scores);
    const environmentalImpact = engine.calculateEnvironmentalImpact(action, seed.price);
    const costBenefit         = engine.calculateCostBenefit(seed.price, recoveryPct);
    const category            = PRODUCT_CATEGORIES[seed.product] || 'General';
    const weight              = PRODUCT_WEIGHTS[seed.product]    || 0.5;
    const matchStatus         = action === seed.knownAnswer ? 'Match' : 'Mismatch';

    return {
      id:          seed.id,
      product:     seed.product,
      price:       seed.price,
      condition:   seed.condition,
      reason:      seed.reason,
      aiAction:    action,
      knownAnswer: seed.knownAnswer,
      matchStatus,
      scores,
      reasoning,
      recoveryPct,
      recoveryValue,
      confidence,
      environmentalImpact,
      costBenefit,
      category,
      weight
    };
  });
}

// ── Module Exports ──────────────────────────────────────────────────────────

window.SeedData = {
  SEED_RECORDS,
  PRODUCT_CATEGORIES,
  PRODUCT_WEIGHTS,
  runSelfTest,
  buildInitialRecords
};
