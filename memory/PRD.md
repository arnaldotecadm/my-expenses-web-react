# My Expenses — React Modernization PRD

## Original problem statement
Modernize the Angular financial app (github.com/arnaldotecadm/my-expenses-web) into React with a modern, clean fintech UI (dashboard, charts, cards), preserving all functionality. Initially skip login with mock data (BRL, English). Later: add sign-in using the EXISTING Amplify/Cognito setup (auth resource myexpensesweb9c0c423c9c0c423c) and use the same endpoints as the old version.

## Architecture (current)
- Auth: AWS Amplify v6 + @aws-amplify/ui-react Authenticator (sign in, sign up, email code, forgot password) on existing pool eu-north-1_SvrSoIYDY / client 2hsdfb6vb1fmq7p2apbucov6lq (env REACT_APP_COGNITO_*).
- Backend: FastAPI gateway `/app/backend/server.py`. It verifies the Cognito ID token (RS256 via JWKS, iss, aud, exp, token_use=id), then proxies `/api/*` to UPSTREAM_API_URL (https://api-my-expenses.vertice-sistemas.com/api/v1) with Authorization and selectedAccount (taken from the `?account=` param). `/api/health` and `/api/me` are local. The mock data/Mongo seed was removed.
- Frontend: React 19 + Router + TanStack Query + Recharts + shadcn/ui. `lib/api.js` adds the token, retries a 401 once with a refreshed token, and adapts upstream shapes (abs of expenses, expense-only category charts, comparison built from two category charts because the upstream comparison endpoint mixes months). Currency follows the selected account (EUR/BRL).

## Implemented
- 2026-10: All pages: Overview (+ Category Details), Transactions, Distribution, History, Monthly Analysis, Four Months Review, Month Comparison, Parties/Debts, Tags, Planning (calendar + list, paid toggle, drag to reschedule), Import & Export, Settings (record stats + delete all transactions).
- 2026-10: Amplify/Cognito sign-in + JWT gateway to the real API. Verified in iteration_5 (backend 18/18) and iteration_6 (frontend 100%).

## Backlog
- P0 (user deferred): Budgets list/form, Budget Analysis list/detail (upstream /budget endpoints exist; /budget/analysis returned 400 without params).
- P1: Touch-friendly reschedule on mobile; admin-only features using the cognito:groups ADMIN claim.
- P2: Stable legend order on Month Comparison chart.
