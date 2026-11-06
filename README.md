# AI Reverse Logistics Decision Assistant

> **MBA Operations Management — Presentation-Grade Decision Support System**

A professional, zero-dependency web application that uses an AI-powered scoring engine to recommend the optimal reverse-logistics action for returned products. Built with vanilla HTML, CSS, and JavaScript — runs by opening `index.html` directly in any modern browser.

![Built with](https://img.shields.io/badge/Built%20With-Vanilla%20JS-F7DF1E?style=flat-square)
![No Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen?style=flat-square)
![Currency](https://img.shields.io/badge/Currency-₹%20INR-blue?style=flat-square)

---

## 🚀 How to Run

1. **Open** `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
2. That's it — no server, no build step, no installation required.

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New analysis |
| `Ctrl+E` | Export CSV |
| `Esc`    | Close panel / modal |

---

## 🧠 How the Decision Engine Works

The engine evaluates each returned product across **5 possible actions** using a two-factor scoring model:

### Actions & Recovery Rates
| Action | Recovery % | Description |
|--------|-----------|-------------|
| **Restock** | 95% | Return to inventory as-is |
| **Repackage and Resell** | 80% | New packaging, then resell |
| **Refurbish and Resell** | 70% | Cosmetic/minor repairs, then resell |
| **Repair** | 50% | Functional repair needed |
| **Recycle** | 10% | Material recovery only |

### Scoring Model

**Step 1 — Condition Base Scores** (matrix lookup):

| Condition | Restock | Repackage | Refurbish | Repair | Recycle |
|-----------|---------|-----------|-----------|--------|---------|
| Unopened / New | 10 | 6 | 1 | 0 | 0 |
| Opened - Like New | 7 | 7 | 3 | 0 | 0 |
| Missing Packaging/Accessories | 2 | 9 | 3 | 0 | 0 |
| Minor Cosmetic Damage | 0 | 3 | 9 | 4 | 0 |
| Functional Defect | 0 | 0 | 4 | 9 | 2 |
| Major Damage / Broken | 0 | 0 | 0 | 3 | 10 |

**Step 2 — Reason Modifiers** (additive):

| Reason | Modifier |
|--------|----------|
| Changed mind / Wrong size / Wrong item | Restock +2, Repackage +1 |
| Defective | Repair +2, Refurbish +1 |
| Damaged in transit | Refurbish +2, Repair +1 |
| Not as described | Restock +2, Refurbish +1 |
| Packaging damaged | Repackage +2 |

**Step 3** — Highest combined score wins. Ties broken by higher recovery %.

### Confidence Score
Measures margin between top-scoring and second-best action:

$$\text{Confidence} = \frac{\text{Top Score} - \text{Second Score}}{\text{Top Score}} \times 100\%$$

### Environmental Impact
Each action has CO₂, waste diversion, and landfill savings factors, scaled by product price relative to the average (₹5,000).

---

## 📊 Accuracy Calculation

$$\text{Accuracy} = \frac{\text{Correct Predictions}}{\text{Total Evaluated}} \times 100$$

- **Evaluated** = records with a Known Answer (not "Pending")
- **Correct** = AI recommendation exactly matches Known Answer
- **Pending** records are excluded from the denominator

### Seed Data Results (8/10 = 80.0%)

| ID | Product | AI Decision | Expert Answer | Match? |
|----|---------|-------------|---------------|--------|
| R-1001 | Wireless Earbuds | Restock | Restock | ✅ |
| R-1002 | Smartphone | Repair | Repair | ✅ |
| R-1003 | Running Shoes | Restock | Restock | ✅ |
| R-1004 | Laptop Bag | Repackage and Resell | Repackage and Resell | ✅ |
| R-1005 | Bluetooth Speaker | Refurbish and Resell | Refurbish and Resell | ✅ |
| R-1006 | Smartwatch | Recycle | Recycle | ✅ |
| R-1007 | Coffee Maker | **Repair** | Refurbish and Resell | ❌ |
| R-1008 | Tablet | Restock | Restock | ✅ |
| R-1009 | Gaming Mouse | **Refurbish and Resell** | Repackage and Resell | ❌ |
| R-1010 | Mixer Grinder | Recycle | Recycle | ✅ |

**R-1007 Mismatch**: Functional Defect + Defective → Repair scores 11 vs Refurbish 5. The engine prioritises repair for defective items.

**R-1009 Mismatch**: Minor Cosmetic Damage + Changed mind → Refurbish scores 9 vs Repackage 4. The engine sees cosmetic damage as needing refurbishment, while the expert prefers repackaging.

---

## 🏗️ Project Structure

```
reverse-logistics-ai/
├── index.html          Main HTML shell (SPA layout)
├── css/
│   └── styles.css      Premium design system (41KB)
│                        • Light + Dark themes
│                        • Glassmorphism effects
│                        • Responsive breakpoints
│                        • Print stylesheet
├── js/
│   ├── engine.js       Decision engine (pure functions)
│   ├── data.js         Seed data + self-test harness
│   ├── storage.js      localStorage persistence + CSV export
│   ├── charts.js       SVG donut, confidence, progress ring
│   ├── animations.js   Scroll animations + dark mode manager
│   ├── simulator.js    What-if scenario engine
│   ├── ui.js           DOM rendering (KPIs, table, charts)
│   └── app.js          Event wiring + initialization
└── README.md           This file
```

---

## ✨ Features

### Core
- **AI Decision Engine** — Weighted scoring model with confidence scores
- **10 Seed Records** — Pre-loaded with 8/10 accuracy self-test
- **CRUD Operations** — Analyse, add, delete, reset returns
- **Form Validation** — Inline errors, toast notifications
- **Duplicate Detection** — Prevents duplicate Return IDs
- **Data Persistence** — localStorage with try/catch safety

### Analytics & Visualization
- **6 KPI Cards** — Animated counters, live-updating
- **SVG Donut Chart** — Interactive with hover tooltips
- **Action Distribution** — Bar breakdown per action
- **Environmental Impact** — CO₂, waste, landfill metrics with progress ring
- **Supply Chain Flow** — SVG pipeline visualization
- **What-If Simulator** — Slider-based recovery rate modeling

### Quality
- **Dark Mode** — Toggle with persistence, system preference detection
- **CSV Export** — RFC 4180 compliant, Ctrl+E shortcut
- **Responsive** — Desktop, tablet, mobile breakpoints
- **Accessible** — ARIA roles, focus management, keyboard navigation
- **Print-Friendly** — @media print stylesheet for PDF export
- **XSS Safe** — All user input escaped before DOM insertion
- **Zero Console Errors** — Clean runtime

---

## 💡 Assumptions

1. The scoring model is deterministic — same inputs always produce the same recommendation.
2. Recovery percentages are fixed per action type (not per product category).
3. Environmental factors are normalised against an average product price of ₹5,000.
4. The self-test expects exactly 8/10 matches; R-1007 and R-1009 are intentional mismatches that demonstrate the engine's rule-based limitations vs. expert nuance.
5. Currency is always displayed in Indian Rupees (₹) using `Intl.NumberFormat("en-IN")`.

---

## 📝 License

Academic project — MIT License.
