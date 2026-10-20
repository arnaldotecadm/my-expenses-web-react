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
- 2026-10: Overview: charts on separate rows + Category Details table (current vs last month vs variation). Month Comparison panels stacked.
- 2026-10: Planning calendar (month grid, click day to add, click bill to edit, Calendar/List toggle, copied indicator).
- 2026-10: Calendar paid check button + "Mark as paid" in dialog, drag-to-reschedule, Settings page (record stats + wipe EVERYTHING; meta.wiped flag prevents re-seed), brand link to home, no-data empty state. Verified iteration_4 (100%).
- To restore demo data after a wipe: delete collections meta/accounts/transactions/budgets/plannings and restart backend.

## Backlog
- P0 (user deferred): Budgets list/form, Budget Analysis list/detail — backend endpoints already exist.
- P1: Touch-friendly reschedule on mobile; shadcn Calendar date picker.
- P2: Real auth, if wanted later.
