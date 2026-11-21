# Kumbhakarna Grid-Edge Console

**Live prototype:** [https://kumbhakarna-grid-console.lovable.app](https://kumbhakarna-grid-console.lovable.app)

A frontend-only simulation prototype for Project Kumbhakarna. It demonstrates two coordinated control loops using compatible residential inverter capabilities, with a household Reserve Guard protecting backup.

## The two control loops

1. **Smart Recharge — restoration protection.** After supply returns, coordinate inverter charger current and start times to reduce coincident post-outage charging and the restoration rebound peak. This addresses the restoration surge.
2. **Battery-Switch — short-duration flexibility.** On a DISCOM request, eligible homes briefly serve backed loads from existing inverter batteries. The on-device **Reserve Guard** checks projected post-event SOC against the household's reserve before dispatch. This addresses the evening ramp.

The loops solve different operating problems. Staggering recharge moves charging demand; it does not make the energy requirement disappear. Rebound is modelled explicitly. Contracted, available and delivered capacity are distinct.

## How to verify

1. Open the [live prototype](https://kumbhakarna-grid-console.lovable.app).
2. Go to **Restoration Lab**.
3. Select **Reproduce report base cell**.
4. Compare **No control** with **Smart Recharge · transformer-aware**.
5. Open the **Validation** tab to inspect report targets, simulated outputs, deltas and indicative tolerances.

The Overview restoration chart is generated from the restoration engine using seed 2026 and 60 runs. Its plotted series are mean loading at five-minute intervals, and its summary reports mean run-peak loading.

## Validation snapshot

The deterministic base-cell simulation (seed 2026, 60 runs) produces mean peak loading of **128.91%** for No control and **117.85%** for transformer-aware Smart Recharge. Mean overload energy is **45.72 kVAh** and **23.27 kVAh**, respectively. The 200-event flex model produces firm P90 estimates of **9.02 / 14.46 / 21.15 kVA** at 25% / 40% / 60% enrolment in the default synthetic population.

These are engine outputs, not field measurements. The base-cell comparison has two known report-review deltas: Smart local minutes above 120% is 9.1 vs 4.0 in the report; counterfactual overload energy is 10.6 vs 7.7 kVAh. They are disclosed model differences, not software errors or claims of calibration. See [docs/VALIDATION.md](docs/VALIDATION.md) for the complete metrics, deltas, tolerances, firm-capacity scenarios and rebound comparison.

## Provenance legend

- **PUBLISHED** — externally published source or reference.
- **TEAM MODEL** — calculations and assumptions from the team's case research.
- **SIMULATED** — output produced by the deterministic prototype engine.
- **ILLUSTRATIVE** — synthetic household, feeder or scenario used to demonstrate the interface.
- **LIVE** — live data from the explicitly identified source (currently the Open-Meteo forecast only).

## About this prototype

- Eight-page experience: Overview, Restoration Lab, 81 Scenarios, Flex Events, Household App, DISCOM Console, Business Case and Method & Evidence.
- Deterministic seeded browser simulation; no backend, database, authentication, API keys or personal data.
- Open-Meteo is the only permitted external request, used for the solar forecast with a six-second timeout and a modelled fallback.
- No live device or utility-system connection. No field performance is claimed.
- Reserve Guard uses projected post-event SOC ≥ household reserve; event energy is not double-counted.
- Deferral value is a one-time timing benefit, not a recurring annual saving. BESS benchmarks represent different services and are not directly interchangeable.

## Team AA Jewels

- Sampurn Anand
- Mayank Kumar
- Zia Ur Rahman
- Keren Megha Tudu

IIM Lucknow · Yuva Yodha Energy Tech Hackathon by Schneider Electric · Challenge 03
