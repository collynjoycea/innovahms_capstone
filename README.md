# Innova HMS

Hotel management system with a React/Vite frontend, Flask backend, and optional Rasa assistant.

## Project Directory Guide

```text
innovahms-main/
|-- backend/
|   |-- app.py                 Flask routes and API
|   |-- database/              SQL schema, migrations, seeds, bootstrap helpers
|   |-- static/uploads/        User-uploaded room, document, and housekeeping files
|   |-- tests/                 Backend automated tests
|   `-- requirements.txt       Python dependencies
|-- frontend/
|   |-- public/                Public images and static assets
|   `-- src/
|       |-- components/        Shared interface components
|       |-- customer/          Customer dashboard and booking screens
|       |-- data/              Frontend data constants
|       |-- hooks/             Shared React hooks
|       |-- layouts/           Shared page layouts
|       |-- pages/             Route screens grouped by role and feature
|       `-- utils/             Shared frontend helpers
|-- rasa/
|   |-- actions/               Custom Rasa actions
|   `-- data/                  Intent examples, stories, and rules
|-- README.md                  Project overview and setup notes
|-- TODO.md                    Project task list
`-- .vscode/                   Workspace editor settings
```

### Existing folder names

Some frontend role folders use older names, including `frontend/src/pages/Maneger/`, `frontend/src/pages/Staff/frontdesktop/`, and `frontend/src/pages/Staff/inventorysupply/`. Current route imports depend on these paths. Keep their spelling and capitalization unchanged unless doing a dedicated migration that updates and tests every import, route, and deployment reference.

### Generated and local-only folders

`node_modules/`, `frontend/dist/`, Python `__pycache__/`, and `.git/` are dependency, build, cache, or version-control data—not application source folders. Do not manually move or rename them. The frontend build recreates `frontend/dist/`; package managers recreate `node_modules/`.

## Backend Database

SQL schema, data seeds, and migrations live under `backend/database/`. Shared database bootstrap helpers live in `backend/database/bootstrap.py`.

For existing databases, apply `backend/database/inventory_supplier_purchase_orders.sql` once before deploying inventory API changes. Inventory endpoints do not run schema DDL during requests.

For existing databases, apply `backend/database/staff_duty_schedules.sql` once before deploying manager duty scheduling. Managers assign and update dated staff shifts; staff can view their schedules in the Front Desk or Housekeeping portal and receive an in-app notification when a shift changes.

For existing databases, apply `backend/database/room_pricing.sql` once to backfill weekday/weekend rates and existing hourly prices. Room APIs also bootstrap missing pricing columns for legacy databases. New rooms use flat rates by default; enable weekday/weekend rates to configure separate overnight and 3-, 6-, 9-, 12-, and 24-hour rates. Owner special discounts apply once to the whole booking subtotal.

## Nova Guest Assistant

Nova supports English, Tagalog, and Taglish. The built-in concierge uses live room, rate, capacity, amenity, hotel-policy, offer, and customer-reservation data where configured. It understands weekday/weekend and short-stay rates, can check a signed-in guest's recent reservations or a specific booking reference, and guides guests to booking pages. It identifies unknown property details as unconfirmed rather than inventing answers. An optional `RASA_WEBHOOK_URL` can handle hotel-related questions not covered by the built-in concierge.

Rasa configuration and training data are in `rasa/`; train the model after changing its domain, rules, stories, or NLU examples.

## Frontend Commands

Run these commands from `frontend/`:

```powershell
npm run dev
npm run build
```

The production build is written to `frontend/dist/`.

## Where to Start

1. Check `frontend/src/App.jsx` for the active route and page imports.
2. Check the relevant screen under `frontend/src/pages/` or `frontend/src/customer/`.
3. Check `backend/app.py` for the matching API route.
4. Check `backend/database/` for the related schema or migration.
5. Check `frontend/src/components/` and `frontend/src/layouts/` for shared UI.
