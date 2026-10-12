# Kit Taxi — Admin Dashboard

Internal admin panel for the Kit Taxi driver platform.

Built with React 19, Vite, and React Router 7.

## Running

From the project root:

```bash
npm run dev
```

Runs on `http://localhost:5173`.

## Environment

Vite reads `admin-web/.env.development` automatically in dev mode.

The only variable needed:

```
VITE_API_BASE_URL=http://localhost:4000
```

## Auth

Admins sign up at `/signup`. The first account is auto-activated as Super Admin.
All subsequent accounts are pending until an existing admin approves them at `/admin-roles`.
