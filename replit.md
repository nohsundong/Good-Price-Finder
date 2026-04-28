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

### Database
- `stores`: id, external_id, category, name, main_item, price, phone, address, latitude, longitude, naver_map_url, created_at, updated_at.
- `store_suggestions`: id, store_id (FK→stores, cascade), content, status (`pending`|`confirmed`), created_at, updated_at.

### API Endpoints
- `GET /api/stores` — list all stores
- `GET /api/stores/stats` — totals, average price, category breakdown, last updated
- `POST /api/stores/import` — MERGE upload by `naverMapUrl` (update on match, insert otherwise; rows w/o url are inserted). Returns `{inserted, updated, total}`.
- `PATCH/DELETE /api/stores/:id` — update/delete a single store
- `GET /api/suggestions?status=pending|confirmed|all` — list user-submitted edit suggestions (admin)
- `POST /api/suggestions` — create a suggestion `{storeId, content}` (public)
- `PATCH /api/suggestions/:id` — change status (admin)
- `DELETE /api/suggestions/:id` — delete (admin)
- `GET /api/healthz`

### Frontend
- Geolocation-based distance calculation (Haversine).
- Radius filter (100m–전국), sort by distance/price, Naver map links, tel: links.
- Each store card has a "[정보 수정 제안]" button → dialog → `window.alert("요청되었습니다")` on success.
- Admin page parses .xlsx client-side via `xlsx` package and POSTs to `/stores/import` (merge mode).
- Admin store table always shows the naverMapUrl text (no longer hidden on small screens).
- Admin includes a "정보 수정 제안" panel with tabs (대기 / 확인됨 / 전체), confirm + delete actions.
- Korean column mapping: 번호, 업종명, 업소명, 주요품목, 가격, 업소 전화번호, 주소, 위도, 경도, 네이버지도URL.
- Admin password: `tbelltassi1!` (sessionStorage key `good-price-admin-auth`).

### Codegen note
`lib/api-spec/package.json` codegen script overwrites `lib/api-zod/src/index.ts` with a single re-export of `./generated/api` to avoid `ImportStoresBody`/`ImportStoresResponse` name collision between zod schemas and the generated types/.
