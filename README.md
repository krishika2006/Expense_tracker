# FinanceFlow — frontend + connected backend

This package includes the React/Vite frontend and the Express + SQLite backend. The frontend now uses the backend for email/password registration and login, session restoration, accounts, transactions, and currency preference. Accounts and transactions are no longer read from or written to the old localStorage demo data; they are stored per user in SQLite.

## Requirements

- Node.js 20 or newer (Node.js 22 LTS recommended)
- npm
- Windows PowerShell, macOS Terminal, or Linux terminal

## 1. Configure the backend

Open a terminal in the project root (`finance-tracker-main`) and run:

```powershell
cd backend
Copy-Item .env.example .env
```

Open `backend/.env` and set `JWT_SECRET` to a private random string of at least 32 characters. Keep this file private. For local development, leave `PORT=4000` and `FRONTEND_URL=http://localhost:3000` as they are.

Install and start the API:

```powershell
npm install
npm run dev
```

The backend creates `backend/data/financeflow.sqlite` automatically. Test it by opening <http://localhost:4000/api/health>; the response should contain `"status":"ok"`.

## 2. Configure and run the frontend

Open a **second terminal** in the project root (`finance-tracker-main`, not the `backend` folder):

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Open <http://localhost:3000>.

The frontend API URL defaults to `http://localhost:4000/api`. If you need a different local API URL, set `VITE_API_URL` in the root `.env` file. Restart Vite after changing `.env`.

## 3. Use the app

1. Select **Sign Up** and register with a name, email, and password (minimum 8 characters).
2. The backend returns a JWT, which the frontend stores for the session and sends with protected API calls.
3. The first account setup creates `Main Bank` and `Cash` accounts if the user has none.
4. Create, edit, or delete transactions and accounts. Changes are persisted in the SQLite database for the signed-in user.
5. Sign out and sign back in to confirm that the records remain available.

## Notes / limitations

- Google, GitHub, Apple, and Twitter buttons are visual placeholders; OAuth is not configured. Use email/password.
- The frontend's existing analytics visualizations calculate from the backend-loaded transactions. The backend also exposes analytics and budgets endpoints, but not every endpoint has a dedicated UI yet.
- Plaid/bank sync is not enabled. Never enter real bank credentials into this demo.
- For deployment, host the backend separately, use HTTPS, set a strong `JWT_SECRET`, configure `FRONTEND_URL` to the deployed frontend origin, and set the frontend's `VITE_API_URL` to the deployed API. GitHub Pages alone cannot host this Node backend.
- Do not commit `.env` files or the SQLite database to a public repository.
