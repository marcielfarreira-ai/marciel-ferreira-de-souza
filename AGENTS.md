# DriverFina — Setup Guide

## Overview
SaaS financial control app for ride-hailing drivers (Uber, 99, etc.). Two roles:
- **Admin** (`/admin`): manages drivers, plans, and subscriptions
- **Driver** (`/app`): tracks income/expenses, views reports

## Stack
- Frontend: React + Vite + Tailwind CSS (port 5173 → host 3000)
- Backend: Express + Prisma + PostgreSQL (port 4000, internal only)
- Vite dev server proxies `/api` to the backend — single origin, no CORS

## Running
```
docker compose -f docker-compose.base44.yml up -d --build
```

## Default Credentials
- Admin: `admin@driver.finance` / `admin123`
- Driver: `motorista@exemplo.com` / `driver123`

## Key Details
- JWT_SECRET required at boot — generated as dev placeholder via platform secrets
- Prisma uses `db push` (not migrations) for schema sync
- Seed runs on every container start (upsert — safe to re-run)
- `node --watch` provides backend live reload; Vite provides frontend live reload
- The client waits for the server health endpoint before starting so its `/api` proxy cannot race the backend initialization.
