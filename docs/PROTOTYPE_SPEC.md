# Kumbhakarna Grid-Edge Console — implementation brief

## Goal
A deployed, browser-only prototype that lets a judge explore restoration protection, short-duration inverter flexibility, household reserve protection, DISCOM measurement & verification, economics and evidence in under five minutes.

## Eight routes
1. Overview (/)
2. Restoration Lab (/restoration)
3. 81 Scenarios (/scenarios)
4. Flex Events (/flex)
5. Household App (/household)
6. DISCOM Console (/console)
7. Business Case (/economics)
8. Method & Evidence (/method)

## Two control loops
**Smart Recharge:** after an outage, jitter each inverter's start by 0–10 minutes, charge at 50% for 60 minutes, ramp over 10 minutes, apply transformer-aware caps (35% above nameplate; 70% above 95% during the restoration window) and retain low-SOC priority below 45%.

**Battery-Switch:** on a DISCOM request, eligible homes switch backed loads to battery for 15–30 minutes. Stagger event end, defer recharge to solar/off-peak windows, and verify delivery with device meters, smart-meter cross-check and 10% randomised holdout.

**Reserve Guard:** eventFrac = backedKW × eventMultiplier × loadNoise × (duration/60) / (0.85 × 1.8); projectedSOC = preEventSOC − eventFrac; reserve = max(householdFloor, backedKW × P90OutageHours / (0.85 × 1.8)) + SOC margin. Dispatch only when projectedSOC ≥ reserve. Event energy is not added to reserve again.

## Restoration simulation
- 250 kVA ONAN transformer, 332 homes at 80% pre-load, 50% inverter share, 20% AC ownership, 2-hour outage, 32°C ambient, 1-minute steps and 240-minute restoration window.
- Five strategies: no control, random delay, Smart Recharge local, Smart Recharge transformer-aware, counterfactual with no inverter recharge.
- Sample a population once per run and share all behavioural draws across strategies (common random numbers).
- Track P/Q, apparent kVA, loading, charger draw, SOC, hot-spot temperature and ageing using IEC 60076-7 difference equations.
- 81 combinations: pre-load 70/80/90%, inverter share 30/50/70%, outage 1/2/4 hours, AC ownership 10/20/30%.
- Use deterministic mulberry32 seeded RNG.

## Evidence and claim discipline
Every metric is tagged PUBLISHED, TEAM MODEL, SIMULATED, ILLUSTRATIVE or LIVE. The report's modelled values are not field results. Keep the distinction between contracted, available and delivered kVA. Show baseline error and all calibration deltas. Never tune hidden factors to force a match.

## Gate 0 and pilot
Before actuation, obtain a signed OEM capability matrix per model covering telemetry, charge-current setpoints, forced battery mode where used, latency, local fallback, BMS/chemistry, firmware path, cybersecurity, warranty, BIS and hardware revision. Phase A is engineering feasibility and shadow mode. Phase B measures efficacy and economics. Proposed pilot: 12 DTs (6 treated, 6 matched controls), about 3,000 consumers, about 1,200 inverter homes, target 500 enrolled, six months spanning peak summer.

## Safety and out of scope
No new batteries, grid-side hardware, export, real device control, real utility data, database, authentication, payments, ML forecasting or geographic maps. No reserve override remotely. On connectivity loss, local Smart Recharge remains; events expire. Customer opt-out, per-DT caps, anomaly lock-out and kill-switch are mandatory design controls.

## Economics
Compare discounted network-upgrade deferral value with full programme cost over the same period. Deferral is a one-time timing benefit, not recurring annual savings. Battery comparisons are service-specific: Kumbhakarna sells rare-event local capacity, not daily 2-hour energy shifting. Include low-income affordability and unit economics.

## Source hierarchy
The machine-readable source excerpt is in docs/reference-data.json and the original research/report/architecture files supplied with the project. Source IDs and links are in src/data/sources.ts. If evidence is absent, label it as an assumption or TO VALIDATE.
