# Innova HMS Frontend

The customer and staff web application built with React and Vite.

## Folder Guide

- `public/` — public images and static assets copied into the app.
- `src/components/` — reusable interface components.
- `src/customer/` — customer dashboard and booking views.
- `src/data/` — frontend data constants.
- `src/hooks/` — reusable React hooks.
- `src/layouts/` — shared page shells.
- `src/pages/` — route screens, grouped by role and feature.
- `src/utils/` — shared frontend helpers.
- `src/App.jsx` — route declarations and page imports.

Some role folders retain legacy names such as `src/pages/Maneger/` and `src/pages/Staff/frontdesktop/`. App imports depend on these existing paths; do not rename them without updating and validating all references.

## Development

Run commands from this directory:

```powershell
npm install
npm run dev
```

## Production Build

```powershell
npm run build
```

Vite writes the production output to `dist/`. This generated folder is not source code and can be recreated by running the build.
