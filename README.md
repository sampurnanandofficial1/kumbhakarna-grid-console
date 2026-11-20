# Kumbhakarna Grid-Edge Console

A frontend-only simulation prototype for Project Kumbhakarna. It demonstrates two coordinated control loops on compatible residential inverters: Smart Recharge after outages and short Battery-Switch flexibility on a DISCOM request, with an on-device Reserve Guard protecting household backup.

## Run locally
Requires Bun. Install and run:

```bash
bun install
bun run dev
bun run build
bun run lint
bun x vitest run
```

## About this prototype
- Eight-page experience: Overview, Restoration Lab, 81 Scenarios, Flex Events, Household App, DISCOM Console, Business Case and Method & Evidence.
- Deterministic seeded browser simulation; no backend, database, authentication, API keys or personal data.
- Open-Meteo is the only permitted external request, used for a 48-hour solar forecast with a six-second timeout and modelled fallback.
- All outputs are explicitly labelled PUBLISHED, TEAM MODEL, SIMULATED, ILLUSTRATIVE or LIVE.
- No live device or utility-system connection. No field performance is claimed.
- Reserve Guard uses projected post-event SOC ≥ household reserve; event energy is not double-counted.
- Deferral value is a one-time timing benefit; BESS benchmarks are different services and are not directly interchangeable.

## Credits
Team AA Jewels · IIM Lucknow · Yuva Yodha Energy Tech Hackathon by Schneider Electric · Challenge 03.
