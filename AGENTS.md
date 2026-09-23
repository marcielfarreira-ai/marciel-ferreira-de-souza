# DriverFina — Setup Guide

## Overview
SaaS platform for financial, operational, and running cost management for ride-hailing drivers and light fleet. Supports EV, Hybrid, Flex, Gasoline, Ethanol, and GNV vehicles. Multi-tenant SaaS with subscription plans.

## Roles & Routes
- **Admin** (`/admin`): SuperAdmin dashboard with MRR, Churn, Inadimplência, driver management, plan management
- **Driver** (`/app`): Dashboard with maintenance alerts, economy comparator, daily closings, transactions, reports
- **Onboarding** (`/onboarding`): 5-step wizard (vehicle → odometer → fuel prices → fixed costs → previous vehicle) required before dashboard access
- **Register** (`/register`): Self-registration with 7-day trial

## Stack
- Frontend: React + Vite + Tailwind CSS (port 5173 → host 3000) — Dark Mode by default, mobile-first
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
- Seed runs on every container start (upsert — safe to re-run) — seeds vehicle, fuel prices, fixed costs, previous vehicle, and daily closings
- `node --watch` provides backend live reload; Vite provides frontend live reload
- The client waits for the server health endpoint before starting so its `/api` proxy cannot race the backend initialization.
- Daily closing auto-calculates: KM driven, energy consumed, fuel cost, fixed costs (daily rate), provisions (per km), total operational cost, net profit, and per-km metrics.
- CSV export available at `/api/finance/reports?format=csv`; PDF via browser print.
- Multi-fuel support: each daily closing can have multiple fuel entries (e.g., Ethanol + Gasoline).
