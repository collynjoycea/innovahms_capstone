# Innova HMS

Hotel management school project with:
- `frontend/` for the React + Vite client
- `backend/` for the Flask API and database setup
- `rasa/` for the chatbot configuration

## Technology Stack

### Core application

- **Frontend:** React 18, Vite, React Router, Axios, and JavaScript.
- **Backend:** Python, Flask, Flask-CORS, and REST API endpoints.
- **Database:** PostgreSQL through `psycopg2-binary`.
- **Authentication and password security:** Google OAuth verification and Werkzeug password hashing. JWT is not implemented in the current codebase.

### Implemented integrations and modules

- **Email notifications:** Gmail SMTP is the primary email delivery path. SendGrid REST API is also implemented as an optional fallback/configuration-based provider; it is not a frontend package or a required Python dependency.
- **SMS notifications:** Twilio SMS delivery is implemented in the backend when Twilio credentials are configured. There is no separate SMS replacement provider currently implemented.
- **Payments:** PayMongo API integration for booking and subscription payment flows.
- **Maps and location services:** Leaflet and React-Leaflet, using OpenStreetMap tiles and Nominatim search/geocoding.
- **Analytics and forecasting:** Python pandas and Prophet, with a linear-forecast fallback. Plotly is not currently installed or used.
- **AI chatbot:** Rasa project and Rasa SDK, accessed through the backend chatbot endpoint with built-in fallback replies.
- **360-degree room viewer:** Marzipano for panorama/virtual-tour rendering.
- **QR-related features:** QR key/payment-related flows and QR icons exist in the application. The `qrcode` npm dependency is present, but a confirmed runtime QR-code generation call is not currently documented in the source.

### Frontend support libraries

- Framer Motion for animations.
- Lucide React for icons.
- SweetAlert2 and React Hot Toast for alerts and feedback.
- jsPDF and jsPDF AutoTable for PDF reports.

### Not currently implemented

- Plotly visualization library.
- JWT authentication.
- Browser Geolocation API usage (`navigator.geolocation`).
- Android CameraX.
- Android Geofencing API.

CameraX and Android Geofencing would require a separate Android application/module; this repository currently contains a web frontend, Flask backend, PostgreSQL setup, and Rasa project only.

## Main Folder Guide

### `frontend/src`
- `App.jsx`
  Main route map for the whole frontend.
- `components/`
  Shared UI parts used across multiple pages and layouts.
- `customer/`
  Customer-only pages such as dashboard and bookings.
- `hooks/`
  Reusable React hooks.
- `layouts/`
  Shared page shells per role or section.
- `pages/`
  Route pages grouped by feature or role.
- `utils/`
  Small helper functions.

### `backend`
- `app.py`
  Main Flask backend file and API routes.
- `database/`
  SQL setup, schema, seed files, and database bootstrap helpers.
- `static/uploads/`
  Uploaded room images and static file assets served by backend.

## Database Files

The active SQL setup is kept in `backend/database/` and reduced to these five files:
- `schema.sql`
- `features.sql`
- `membership.sql`
- `notifications.sql`
- `seed.sql`

Extra database-safe bootstrap helpers now live in `backend/database/bootstrap.py`.
That keeps `backend/app.py` focused on routes, request handling, and database access instead of schema definitions.

## Folder Rules

To keep debugging simple:
- SQL files live in `backend/database/`
- backend Python code lives in `backend/`
- frontend code lives in `frontend/`
- Rasa YAML files live in `rasa/` and `rasa/data/`
- uploaded backend files live in `backend/static/uploads/`

## Suggested Debugging Flow

1. Check `frontend/src/App.jsx` to see which page or route is active.
2. Check the matching page inside `frontend/src/pages/` or `frontend/src/customer/`.
3. If the page fetches data, search the API path inside `backend/app.py`.
4. If the issue is layout-only, inspect the related file in `frontend/src/components/` or `frontend/src/layouts/`.

## Cleanup Done

Removed unused or template-style files to make the project easier to understand:
- old CRA test/template files
- unused sample components
- unused extra layout/page files

This cleanup was limited to files that were not referenced by the current app structure.
