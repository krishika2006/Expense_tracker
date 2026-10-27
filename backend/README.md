# FinanceFlow Backend

A working REST API for the FinanceFlow React/Vite finance tracker. Uses Express, SQLite (persistent local database), JWT bearer authentication, bcrypt password hashing, Zod validation, Helmet, CORS, and rate limiting.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and set `JWT_SECRET` to a random secret of at least 32 characters. Then run:

```bash
npm run dev
```

API runs at `http://localhost:4000`. Health check: `http://localhost:4000/api/health`. The SQLite database is created automatically at `backend/data/financeflow.sqlite`.

Set `FRONTEND_URL=http://localhost:3000` to match the Vite development server. For multiple origins, separate origins with commas. Keep `.env` private and never expose secrets through `VITE_` variables.

## Authentication

Register or log in to receive a JWT. Send it on protected requests as:

```http
Authorization: Bearer YOUR_TOKEN
```

Example registration:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo User","email":"demo@example.com","password":"ChangeThis123!"}'
```

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Current user |
| PATCH | `/api/auth/profile` | Update name/currency |
| GET/POST | `/api/accounts` | List/create accounts |
| GET/PUT/DELETE | `/api/accounts/:id` | Read/update/delete account |
| GET/POST | `/api/transactions` | List/create transactions |
| GET/PUT/DELETE | `/api/transactions/:id` | Read/update/delete transaction |
| GET | `/api/dashboard/summary?month=YYYY-MM` | Dashboard totals and recent transactions |
| GET | `/api/analytics/cash-flow?from=YYYY-MM-DD&to=YYYY-MM-DD` | Cash flow by date |
| GET | `/api/analytics/category-breakdown?month=YYYY-MM` | Expense category totals |
| GET | `/api/analytics/monthly-trends` | Monthly income/expense totals |
| GET | `/api/budgets?month=10&year=2026` | Budgets and spending |
| POST | `/api/budgets` | Create/update budget for category/month/year |
| DELETE | `/api/budgets/:id` | Delete budget |
| POST | `/api/ai/spending-insights` | Aggregated spending insights; Gemini optional |

Transactions accept `amount`, `description`, `date` (`YYYY-MM-DD`), `category`, `type` (`INCOME` or `EXPENSE`), optional `accountId`, and optional `source` (`MANUAL` or `PLAID`). Account creation accepts `name`, `type` (`Bank`, `Cash`, `Credit Card`, `Savings`), optional `balance`, `color`, and `currency`.

## Frontend integration note

This backend is provided alongside the existing frontend. The current `src/App.tsx` uses localStorage for transactions and accounts; it will need a frontend API-client/auth integration pass before the UI is fully database-backed. API calls must use the JWT in the `Authorization` header. Configure the API base URL to `http://localhost:4000/api` during local development.

## Important notes

- SQLite is chosen to make local development easy; the database persists in a local file. For hosted multi-instance production, migrate to PostgreSQL and use managed database backups.
- Plaid endpoints are not enabled in this initial backend. The existing Plaid docs are reference material; real bank integration requires provider credentials, token encryption, webhook verification, and provider/regional support checks.
- The optional Gemini integration reads `GEMINI_API_KEY` on the server. Without it, the endpoint returns clearly labeled rule-based insights.
- Do not use the development fallback JWT secret in production.
