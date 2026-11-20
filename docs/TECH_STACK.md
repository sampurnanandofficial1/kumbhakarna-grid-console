# Technical stack

Detected from the Lovable scaffold on 20 November 2026.

| Layer | Implementation |
|---|---|
| Framework | TanStack Start |
| Router | TanStack Router, file-based routes |
| UI | React 19 + TypeScript |
| Bundler | Vite 8 |
| Styling | Tailwind CSS v4 + shadcn/ui primitives |
| Charts | Recharts 2 |
| Icons | lucide-react |
| Tests | Vitest 4 |
| Package manager | Bun; lockfile: bun.lock |
| Hosting | Lovable publish / Cloudflare edge |
| Data | Static, versioned reference data; deterministic browser simulation |
| External API | Open-Meteo forecast only; 6-second timeout and modelled fallback |

No backend, database, authentication, secrets or utility/device connections are used.
