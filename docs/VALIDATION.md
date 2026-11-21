# Engine validation snapshot

> **Provenance: SIMULATED.** Deterministic browser-engine output, not field evidence. All values below use the committed model parameters and seed 2026. The report column is the separate team-model reference in `docs/reference-data.json`.

## Restoration base cell vs report

**Run:** `simulateRestoration`, default 80% pre-load, 50% inverter share, two-hour outage, 20% AC share, 32°C ambient, generic thermal design, seed 2026, 60 runs. The table reports means across runs. Delta = engine − report. Tolerances reproduce the indicative validation bands used in the Restoration Lab: ±3 percentage points peak, ±10 minutes above 100%, ±3 minutes above 120%, ±20% of report value for overload energy and ageing, and ±3°C maximum hot-spot.

| Strategy | Metric | Team report | Engine | Delta | Indicative tolerance | Assessment |
|---|---|---:|---:|---:|---:|---|
| No control | Peak loading (%) | 127.40 | 128.91 | +1.51 | ±3.00 | Within |
| No control | Minutes above 100% | 66.00 | 70.77 | +4.77 | ±10.00 | Within |
| No control | Minutes above 120% | 28.10 | 29.50 | +1.40 | ±3.00 | Within |
| No control | Overload energy (kVAh) | 43.90 | 45.72 | +1.82 | ±8.78 | Within |
| No control | Ageing equivalent minutes | 190.00 | 219.88 | +29.88 | ±38.00 | Within |
| No control | Maximum hot-spot (°C) | 101.00 | 101.35 | +0.35 | ±3.00 | Within |
| Random delay | Peak loading (%) | 127.40 | 128.14 | +0.74 | ±3.00 | Within |
| Random delay | Minutes above 100% | 66.00 | 72.25 | +6.25 | ±10.00 | Within |
| Random delay | Minutes above 120% | 21.10 | 22.25 | +1.15 | ±3.00 | Within |
| Random delay | Overload energy (kVAh) | 38.10 | 40.24 | +2.14 | ±7.62 | Within |
| Random delay | Ageing equivalent minutes | 180.00 | 208.39 | +28.39 | ±36.00 | Within |
| Random delay | Maximum hot-spot (°C) | 100.00 | 100.16 | +0.16 | ±3.00 | Within |
| Smart local | Peak loading (%) | 118.30 | 120.26 | +1.96 | ±3.00 | Within |
| Smart local | Minutes above 100% | 60.00 | 63.55 | +3.55 | ±10.00 | Within |
| Smart local | Minutes above 120% | 4.00 | 9.12 | +5.12 | ±3.00 | Review |
| Smart local | Overload energy (kVAh) | 24.90 | 27.98 | +3.08 | ±4.98 | Within |
| Smart local | Ageing equivalent minutes | 159.00 | 183.92 | +24.92 | ±31.80 | Within |
| Smart local | Maximum hot-spot (°C) | 97.00 | 97.58 | +0.58 | ±3.00 | Within |
| Transformer-aware Smart Recharge | Peak loading (%) | 116.20 | 117.85 | +1.65 | ±3.00 | Within |
| Transformer-aware Smart Recharge | Minutes above 100% | 58.00 | 55.57 | −2.43 | ±10.00 | Within |
| Transformer-aware Smart Recharge | Minutes above 120% | 1.70 | 4.52 | +2.82 | ±3.00 | Within |
| Transformer-aware Smart Recharge | Overload energy (kVAh) | 21.20 | 23.27 | +2.07 | ±4.24 | Within |
| Transformer-aware Smart Recharge | Ageing equivalent minutes | 144.00 | 167.04 | +23.04 | ±28.80 | Within |
| Transformer-aware Smart Recharge | Maximum hot-spot (°C) | 97.00 | 97.49 | +0.49 | ±3.00 | Within |
| Counterfactual | Peak loading (%) | 108.80 | 110.60 | +1.80 | ±3.00 | Within |
| Counterfactual | Minutes above 100% | 31.00 | 32.47 | +1.47 | ±10.00 | Within |
| Counterfactual | Minutes above 120% | 0.00 | 0.83 | +0.83 | ±1.00* | Within |
| Counterfactual | Overload energy (kVAh) | 7.70 | 10.62 | +2.92 | ±1.54 | Review |
| Counterfactual | Ageing equivalent minutes | 54.00 | 63.61 | +9.61 | ±10.80 | Within |
| Counterfactual | Maximum hot-spot (°C) | 90.00 | 91.08 | +1.08 | ±3.00 | Within |

\* For a zero report target, the UI's fallback band is ±20% of `max(1, |target|)`, i.e. ±1 minute.

### Interpreting the two Review rows

- **Smart local minutes above 120%: 9.1 vs 4.0.** The engine retains the current per-home local ramp and seeded population; the report's aggregate result is lower by 5.1 minutes. This is a known model delta outside the indicative ±3-minute band, not a test failure or a field-performance result.
- **Counterfactual overload energy: 10.6 vs 7.7 kVAh.** The engine's no-charging counterfactual remains 2.9 kVAh above the report reference, outside the ±20% band. This is a known difference between model implementations, not a reason to alter the restoration or flex numbers in this polish.

The report targets are retained as references; the engine has not been calibrated or tuned to force a match. All results remain synthetic until validated against utility transformer and household data.

## Firm capacity by enrolment

**Run:** `runFlexEvents`, 332 homes, 50% inverter share, 30-minute event, 60% reserve floor, two-hour P90 outage reserve, 200 events, seed 2026. Firm P90 is the 10th percentile of simulated event delivery.

| Enrolment | Enrolled homes | Mean event capacity (kVA) | Firm P90 (kVA) |
|---:|---:|---:|---:|
| 25% | 42 | 10.67 | 9.02 |
| 40% | 67 | 16.91 | 14.46 |
| 60% | 100 | 24.59 | 21.15 |

These are synthetic capacity estimates after the engine's opt-out, communications, battery-health, critical-backup, inverter-rating and Reserve Guard eligibility checks. They are not contracted or field-delivered capacity.

## Rebound by end strategy

**Run:** 50 seeded rebound realisations per scenario, 30-minute prior event, seed 2026. Each run simulates 80% of the enrolled participant count (minimum 20 participants); that participant count already captures enrolment, so no second enrolment multiplier is applied. Values are mean 90-minute coincident recharge peak. Lower peak indicates less synchronised return-to-grid demand; it does not mean recharge energy has disappeared.

| Enrolment | Before fix · naive (kVA) | Before fix · half (kVA) | Before fix · deferred (kVA) | Corrected · naive (kVA) | Corrected · half (kVA) | Corrected · deferred (kVA) |
|---:|---:|---:|---:|---:|---:|---:|
| 25% | 5.33 | 2.62 | 0.31 | 8.53 | 4.19 | 0.50 |
| 40% | 13.49 | 6.61 | 0.77 | 13.49 | 6.61 | 0.77 |
| 60% | 30.07 | 14.73 | 1.72 | 20.05 | 9.82 | 1.15 |

The previous output applied an enrolment multiplier even though the simulated participant count already changed with enrolment. The corrected output removes that second scaling; 40% is unchanged because its former multiplier was 1. Deferred recharge reduces the immediate rebound peak by moving energy later; the schedule and household reserve constraints still need operational validation.

## Reproduction

- Restoration: `simulateRestoration({ ...DEFAULT_RESTORATION, seed: 2026, runs: 60 })`.
- Flex: `runFlexEvents({ ...DEFAULT_FLEX, enrolment: 0.25 | 0.4 | 0.6, events: 200, seed: 2026 })`.
- Rebound: the same flex result's `rebound` profile, generated from the seeded rebound stream.
- Overview chart: mean loading at 5-minute intervals from `NO_CONTROL` and `SMART_DT_AWARE`; the committed data is checked against a fresh engine run by `overview-profile.test.ts`.

No restoration or flex model values were changed to produce this documentation.

## Typography and responsive implementation

The November 2017 Schneider Electric Brand Guidelines specify **Nunito** for digital applications and advertisements (page 39), with Arial as a substitute typeface in the wider typography system. The guide directs employees and agencies to the controlled Brand Book 2.0 portals for current brand assets. This prototype therefore uses a local/system-first `Nunito, Arial, sans-serif` stack and makes no third-party font request; it does not bundle a proprietary desktop font or fetch a font from a CDN. The brand guide is a November 2017 edition, so the current controlled brand portal remains the authority for any later revisions.

Responsive guardrails added: grid/flex content children are allowed to shrink, visual media are constrained to their containers, and the not-found card and guided-demo panel use narrow-screen padding rules. These are code-level safeguards, not a substitute for real-device/browser validation.

Reference: [Schneider Electric Brand Guidelines, November 2017, pp. 35–39](https://www.eventservice.kr/2018/_guide/SE_Brand_Guidelines.pdf) (the document identifies itself as confidential Schneider Electric material and points to the controlled Brand Book 2.0 portals for access).
