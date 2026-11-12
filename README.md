# CIS4375-Team1: The Executive Parlor

A web app for The Executive Parlor, a salon in Houston that specializes in hair replacement systems. It was built for CIS 4375 (Capstone).

## What it does

**Customers** can:
- browse services and the hair system catalog;
- order and pay for a hair system online with Stripe;
- reorder their saved custom system;
- see their orders, payments and appointments.

**The owner (admin)** can:
- see bookings synced from Setmore and mark them completed or as a no-show;
- invoice and track hair system orders from payment to pickup;
- manage inventory;
- view sales, customer spending and inventory reports.

Appointments are booked in **Setmore**. Services are paid in person at the salon. **Stripe** (test mode) is used only for hair system orders.

## Tech stack

| Part | Tools |
|---|---|
| Frontend | React, Vite |
| Backend | Python 3.14, Flask, Flask-SQLAlchemy, Flask-JWT-Extended |
| Database | MySQL on AWS RDS |
| Integrations | Stripe (payments), Setmore (appointments), AWS (contact form) |
| Quality | ruff (lint), pytest (tests), GitHub Actions (CI) |

## Running it locally

You need Python 3.14, Node.js and the team's `.env` values: `backend/.env` (database, JWT secrets, Stripe secret key and webhook secret, Setmore token, contact Lambda) and `frontend/.env` (Stripe publishable key; leave `VITE_API_URL` blank). Ask Matias privately.

**Backend** (first terminal):

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
copy .env.example .env   # then fill in the real values
python run.py            # http://localhost:5000
```

**Frontend** (second terminal):

```powershell
cd frontend
npm install
npm run dev              # http://localhost:5173
```

The frontend sends `/api` requests to the backend through the Vite proxy, so both must be running.

**Stripe webhooks** (third terminal, only when testing payments):

```powershell
stripe listen --all-snapshot --forward-to localhost:5000/api/webhooks/stripe
```

## Checks before a pull request

```powershell
cd backend
ruff check .
pytest -q

cd ../frontend
npm run lint
npm run build
```

## Documentation

- `backend/README.txt`: backend structure, setup, Stripe, tests and the full endpoint list
- `frontend/API_GUIDE.txt`: how the frontend calls each endpoint, with request and response examples

## Branches

`feature/...` → `BackTest` / `FrontTest` → `FinalTest` → `main`. Every merge goes through a pull request using the template in `.github/pull_request_template.md`.