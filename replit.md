# TerraFuse

TerraFuse is an environmental decision firewall that helps organizations review procurement choices before approval.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/terrafuse/src/App.tsx` — the single-page review room and deterministic impact model
- `artifacts/terrafuse/src/index.css` — TerraFuse visual tokens and responsive component styling
- `artifacts/terrafuse/.replit-artifact/artifact.toml` — web artifact routing and run configuration
- `attached_assets/` — the original TerraFuse concept and NextStep Hacks reference material

## Architecture decisions

- The first demo is intentionally client-side so judges can use it without credentials or external-service setup.
- Environmental outputs are deterministic estimates derived from visible assumptions; the UI does not present invented LLM numbers as measured facts.
- The initial surface focuses on one procurement decision loop: assumptions, consequence estimate, alternatives/evidence, and approval.
- Upload intake is represented as a local demo state for the first build; persistent document storage and extraction can be added after the judging MVP.

## Product

- Preloaded college-festival procurement case with a clear environmental risk review.
- Editable quantity, reuse cycles, and supplier distance assumptions with live recalculation.
- Impact summary for estimated CO₂e, waste, water, recyclability, landfill risk, freight share, and confidence.
- Alternative comparison with selectable recommendation, evidence inspection, and an approval state.
- New-intake state that accepts procurement files and can fall back to the demo case.

## User preferences

_None recorded._

## Gotchas

- Keep all environmental outputs labeled as estimates and keep assumptions visible in the user flow.
- The NextStep submission requires a 3–5 minute demo video, repository/code link, and live app link; verify the current deadline and rules on Devpost before submitting.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
