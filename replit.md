# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: 착한가격업소 찾기 (Good Price Stores Finder)

Korean web app helping users find nearby cheap restaurants from public open data.

### Artifacts
- `artifacts/good-price` (web, `/`): Main user-facing app + `/admin` page for Excel re-upload.
- `artifacts/api-server` (api, `/api`): REST API for stores.

### Database (table `stores`)
Columns: id, external_id, category, name, main_item, price, phone, address, latitude, longitude, naver_map_url, created_at, updated_at. Schema in `lib/db/src/schema/stores.ts`.

### API Endpoints
- `GET /api/stores` — list all stores
- `GET /api/stores/stats` — totals, average price, category breakdown, last updated
- `POST /api/stores/import` — replace all stores in a single transaction (TRUNCATE + INSERT)
- `GET /api/healthz`

### Frontend
- Geolocation-based distance calculation (Haversine).
- Radius filter (100m–전국), sort by distance/price, Naver map links, tel: links.
- Admin page parses .xlsx client-side via `xlsx` package and POSTs to `/stores/import`.
- Korean column mapping: 번호, 업종명, 업소명, 주요품목, 가격, 업소 전화번호, 주소, 위도, 경도, 네이버지도URL.

### Codegen note
`lib/api-spec/package.json` codegen script overwrites `lib/api-zod/src/index.ts` with a single re-export of `./generated/api` to avoid `ImportStoresBody`/`ImportStoresResponse` name collision between zod schemas and the generated types/.
