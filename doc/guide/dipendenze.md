# Dependencies — audit and open advisories

> `WORKFLOW.md` rule 8: every session starts with `pnpm audit --json` and compares it with this file.
> A new advisory is added here with the owner's decision; upgrades happen in a session of their own.

- **Last audit**: 2026-10-27 (`pnpm audit --json`, after the upgrade below)
- **Package manager**: pnpm 11.13.1 (CI: pnpm 11, Node 22)
- **Framework**: `next` 16.4.3 · `react` / `react-dom` 19.2.4 · `next-auth` 5.0.0-beta.32 (`@auth/core` 0.41.3)
- **Totals**: before the upgrade 9 critical / 45 high / 57 moderate / 8 low; after it 0 critical / 1 high / 1 moderate / 0 low

## Open advisories

| Package | Version | Direct / transitive | Dev-only | Severity | First fixed | Decision | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `zod` | 4.6.5 | transitive: `@serwist/next` 9.5.13 → `@serwist/build`, `@serwist/webpack-plugin` (exact pin `4.6.5`) | yes — build-time only (`next.config.ts` plugin; not in `public/sw.js`, the app itself resolves `zod` 4.6.7) | high (GHSA-mrhx-c7xc-m3w5) | 4.6.6 | accepted — dev-only; lifts with the first `@serwist/next` release that pins `zod` ≥ 4.6.6 (9.5.13 is the latest) | 2026-10-27 |
| `esbuild` | 0.18.20 | transitive: `drizzle-kit` 0.31.10 → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` | yes | moderate (GHSA-67mh-4wv8-2f99, dev server only) | 0.24.3 — the only fix the audit offers is a `drizzle-kit` downgrade | accepted — dev-only | 2026-10-27 |

The `shadcn` CLI chain (`@modelcontextprotocol/sdk`, `express`, `body-parser`, `proxy-addr`,
`hono`, `@hono/node-server`, `undici`, `fast-uri`, `ip-address`, `qs`, `postcss-selector-parser`)
has no open advisory with `shadcn` 4.22.1. `shadcn` is a devDependency since 2026-10-27 and is not
imported by the app: a future advisory in that chain is `accepted — dev tool, not imported by the app`.

## Upgraded on 2026-10-27

Direct (`package.json`):

- `next` 16.2.10 → 16.4.3, `eslint-config-next` 16.2.10 → 16.4.3
- `next-auth` 5.0.0-beta.31 → 5.0.0-beta.32 (`@auth/core` 0.41.2 → 0.41.3)
- `zod` 4.4.3 → 4.6.7
- `@serwist/next`, `serwist` 9.5.11 → 9.5.13 (9.5.11 pinned `browserslist` 4.28.2)
- `shadcn` 4.13.0 → 4.22.1, moved from `dependencies` to `devDependencies` (exact pin: 4.23.0 was
  released the same day)
- `vitest` 4.1.10 → 4.1.12, `sharp` 0.35.3 → 0.35.5

Transitive (lockfile refresh within existing ranges, no overrides):

- `vite` 8.1.5 → 8.3.5 (a peer of `vitest`: `pnpm update` does not lift it; removing and re-adding
  `vitest` did), `@vitest/mocker` 4.1.10 → 4.1.12
- `postcss` 8.4.31 / 8.5.19 → 8.5.23 (pinned by `next`) / 8.5.31, `nanoid` 3.3.16 → 3.3.20,
  `source-map-js` 1.2.1 → 1.2.2
- `browserslist` 4.28.2 / 4.28.6 → 4.29.4, `baseline-browser-mapping` 2.10.43 → 2.11.33
- `brace-expansion` 1.1.16 / 5.0.7 → 1.1.21 / 5.0.12, `js-yaml` 4.3.0 → 4.3.2
- `sharp` under `next` 0.34.5 → 0.35.5
- `shadcn` chain: `@modelcontextprotocol/sdk` 1.29.0 → 1.32.2, `express` 5.2.1 → 5.3.0,
  `hono` 4.12.30 → 4.13.14, `undici` 7.28.0 → 7.30.1, `proxy-addr` 2.0.7 → 2.0.8 and the rest of
  the chain to its fixed versions; `zod` 3.25.76 left the tree

Notes (2026-10-27): pnpm 11 accepts `--config.minimum-release-age=<minutes>` on `pnpm update`, but
it checks the whole lockfile, so a cutoff newer than an entry already installed fails the command
(`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`). `eslint` 9.39.5 prints a deprecation warning
(ESLint 9 out of support): moving to ESLint 10 is a separate upgrade.
