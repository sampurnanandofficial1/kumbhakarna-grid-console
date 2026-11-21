# Kumbhakarna Grid-Edge Console — agent rules

This is a Lovable-synced TanStack Start repository. Keep the default branch and pushed history intact. Do not force-push, rebase, amend or squash commits already on main. Make one pull request per milestone.

## Product
A frontend-only prototype for Project Kumbhakarna. It demonstrates:
1. Smart Recharge: staggered, current-limited inverter charging after restoration to reduce distribution-transformer (DT) stress.
2. Battery-Switch: short, DISCOM-requested flexibility from existing home inverter batteries.
3. Reserve Guard: on-device eligibility rule that protects each household's backup reserve.
4. DISCOM M&V: device-metered delivery, smart-meter cross-check, randomised holdout and settlement.

## Stack and Lovable compatibility
- Detect and preserve the existing stack: TanStack Start, React, TypeScript, Vite, Tailwind v4, Bun, shadcn/ui.
- Routes use file-based routing under src/routes. Do not hand-edit src/routeTree.gen.ts; the build regenerates it.
- Interactive routes should use ssr:false and a lightweight pending component. Browser APIs only in effects, event handlers or client-only components.
- Do not change framework, router, bundler, build scripts, Vite plugins, Cloudflare/Nitro config, Tailwind setup, path aliases or root entry files.
- Do not add dependencies unless already present. Reuse Recharts, lucide-react and Vitest.

## Hard constraints
- Frontend only: no server functions, API routes, edge functions, database, authentication, Supabase, Lovable Cloud, environment variables, secrets or API keys.
- Only permitted network request: Open-Meteo forecast API, client-side, 6-second timeout, visible LIVE or MODELLED fallback badge. All other features must work offline.
- No Web Workers. Chunk long jobs and yield to the UI with progress/cancel controls.
- All random values must come from seeded mulberry32; same seed and inputs must reproduce the same result.
- Every number must carry a provenance label: PUBLISHED, TEAM MODEL, SIMULATED, ILLUSTRATIVE or LIVE. Never present model outputs as field results or sourced facts.
- Persistent banner: “Prototype · simulated data · not connected to real devices or utility systems”.
- Schneider Electric logo is permitted only as hackathon credit in the header/footer. Do not use IIM Lucknow, DISCOM or OEM logos; use text credit only for those entities.
- No personal data, real device connection or utility-system connection.

## Model and safety rules
- Use common random numbers across restoration strategies.
- Use IEC 60076-7 difference equations for the transformer thermal model.
- Reserve Guard: projected post-event SOC must remain at or above the household reserve. Do not add event energy to reserve a second time.
- Distinguish contracted, available and delivered capacity.
- Charger staggering addresses restoration rebound; battery-switch relief addresses the evening ramp.
- Measure rebound; deferred recharge must not create a synchronised return to grid.
- Gate 0 requires OEM model-by-model confirmation of telemetry, charge-current control, forced battery mode (if used), latency, fallback, BMS, warranty, BIS and cybersecurity.
- Label all team-report results as TEAM MODEL and live engine output as SIMULATED. Field performance remains TO VALIDATE until a pilot.

## Design
- Light, white/green, responsive from 360px to 1440px.
- Schneider-inspired palette: primary #009E4D, accent #3DCD58, deep #005C30, info #2F7FB5, warning #E39B1B, danger #C8423F, neutral #8C9C93. Define colors as theme tokens.
- Rounded-xl cards, generous whitespace, AA contrast, visible focus, labeled inputs, chart summaries and Indian number formatting.
- Charts render only on the client.

## Quality gates
Run Bun install, build, lint and Vitest. Smoke-test all eight routes for HTTP 200. Do not commit node_modules, dist, .output, .wrangler, .env files or OS files.
Every PR must state changes, commands/results, validation deltas, known gaps and a manual QA checklist.
