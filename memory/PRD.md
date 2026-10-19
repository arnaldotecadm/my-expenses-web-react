# My Expenses — React Modernization PRD

## Original problem statement
Modernize the Angular financial app (github.com/arnaldotecadm/my-expenses-web) into React with a modern, clean fintech UI (dashboard, charts, cards), preserving all functionality. Skip login (mock data). Currency BRL (R$). Language English.

## Architecture
- Backend: FastAPI `/app/backend/server.py` replicating the original API contract, seeded mock data in MongoDB (no Cognito).
- Frontend: React 19 + React Router + TanStack Query + Recharts + shadcn/ui + framer-motion. Design: `/app/design_guidelines.json`.

## Implemented
- 2026-10: Foundation, layout (sidebar, account switcher, dark mode), Overview, Transactions, Distribution, History.
- 2026-10: Monthly Analysis, Four Months Review, Month Comparison, Parties/Debts, Tags, Planning (CRUD, toggle paid, copy over, clean up), Import & Export (JSON import, CSV/JSON export).
- 2026-10: Fixes from iteration_1: import validation (skips invalid rows, new uuids), per-account copy-over dedup, case-insensitive sort, sticky Transactions header, mobile wrapping, error toasts, Distribution drill-down list, localized dates.
- Tests: backend 17/17 pytest passing (`/app/backend/tests/test_expenses_api.py`); frontend flows verified (iteration_1).

## Backlog
- P0 (user deferred): Budgets list/form, Budget Analysis list/detail, Settings (record stats + delete all) — backend endpoints already exist.
- P1: Confirmation dialog before deleting planning events; shadcn Calendar date picker.
- P2: Real auth, if wanted later.
