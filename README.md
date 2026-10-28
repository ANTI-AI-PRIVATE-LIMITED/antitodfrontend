# ANTITODE Frontend

Web dashboard for the Xyberah / ANTITODE honeypot threat intelligence platform (ANTI AI Private Limited). It talks to the antitode-backend API and shows honeypot events, host scores, IOCs, vulnerabilities, ransomware activity and network tools.

Built with React 18, TypeScript, Vite 5, Tailwind CSS 3, Recharts, react-globe.gl / three.js, react-leaflet and reactflow.

## Release 1.0 (what ships today)

| Area | Page (URL) |
|------|-----------|
| Overview | Dashboard (`/dashboard`), SOC Wall (`/soc-wall`), Threat Map (`/threat-map`) |
| Honeypot data | Honeypot Logs (`/honeypot-logs`), Log Analysis (`/log-analysis`) |
| Intelligence | Vulnerabilities (`/vulnerabilities`), Exploit DB (`/exploit-db`), Intel Feed (`/intel-feed`), IOC Manager (`/ioc-manager`), Ransomware Monitor (`/ransomware-monitor`) |
| Tools | Network Tools (`/network-tools`), Web Check (`/web-check`) |
| Admin | Infrastructure, SIEM Connectors, Access Control, Billing, Settings, System Guide |

Not in v1: Intel Grounding (needs a Gemini key on the backend; hidden unless built with `VITE_AI_ENABLED=true`), Threat Actors (hidden outside demo mode), and a set of URL only modules that show "Module unavailable" (investigation bench, playbooks, graph investigation, network forensics, email forensic, dynamic sandbox, topology, threat canvas, MITRE navigator).

Navigation lives in `src/data/navigation.ts` (what appears in the sidebar and command palette) and URLs in `src/data/routes.ts`. Views are wired in `src/components/ViewRouter.tsx`.

## Requirements

- Node 20+ and npm
- A running antitode-backend (local or remote)

## Run locally

```bash
npm ci
VITE_BACKEND_URL=http://localhost:3000 npm run dev
```

The dev server also provides a small `/api/proxy` helper (see `vite.config.ts`).

## Build and environment variables

```bash
VITE_BACKEND_URL=https://<your-api-host> npm run build    # output in dist/
```

| Variable | Purpose |
|----------|---------|
| `VITE_BACKEND_URL` | Base URL of the backend API. Set at build time. |
| `VITE_AI_ENABLED` | `true` shows Intel Grounding. Also needs `GEMINI_API_KEY` on the API. Default off. |
| `VITE_RAZORPAY_KEY_ID` | Razorpay Checkout key id (never the secret). Needed only for Billing checkout. |
| `VITE_PUBLIC_DEMO` | `true` builds the public demo with sample data. Leave unset for real accounts. |

No secrets belong in the frontend: provider keys stay on the backend proxy.

## Application shell and routing

- Collapsible left sidebar, command palette with `Ctrl/Cmd + K`, sidebar toggle with `Ctrl/Cmd + B`; Settings is an in-app modal.
- Every module has a real URL (pushed with `history.pushState`, handled in `src/App.tsx`), so pages are deep linkable. The static host must send unknown paths to `/index.html`: `vercel.json` does this on Vercel, and on CloudFront map 403 and 404 to `/index.html` with status 200.
- The original Xyberah service layer, API clients, types and views are retained in `services/`, `api/`, `types.ts` and `components/`; many of those modules are not exposed in v1 (see above).

## Deploy (static hosting)

Reference setup: S3 bucket behind CloudFront (Vercel also works, `vercel.json` is included).

1. Build with the right `VITE_BACKEND_URL`.
2. `index.html` carries a strict Content Security Policy meta tag. `connect-src` must list your API host and the CloudFront API domain, or the app cannot call the backend. Update it when the API domain changes.
3. Upload `dist/assets/*` first (correct content types, JavaScript as `application/javascript`), then `index.html`.
4. Invalidate `/index.html` and `/` on CloudFront.
5. Check that every file referenced by `index.html` returns 200.

Full migration steps (new AWS account) are in the backend repo: `docs/migration/MIGRATION_RUNBOOK.md`.

## Project layout

```
src/            App, router, pages, layout, data (navigation, routes), contexts
components/     Legacy and shared views (e.g. views/NetworkToolsView.tsx)
services/       API clients and analysis helpers (dns, netTools, cve, ransomwatch ...)
api/            Axios client (adds the authtoken header)
config/         Endpoint paths
public/         Static assets
```

## How the app talks to the backend

- Login returns a token stored in `localStorage` as `admin-auth-token`; every request sends it in the `authtoken` header.
- Third party data (NVD, CISA, DNS over HTTPS, crt.sh, ransomware.live ...) goes through the backend proxy `/AdminRoutes/proxy/fetch`, which only allows listed hosts.
- Heavy requests are cached on the backend; the Vulnerabilities page loads in about a second when warm.

## Notes for contributors

- Line endings: this repo uses CRLF.
- Longer background reading: `KNOWLEDGE_TRANSFER.md` and `FRONTEND_UNSUPPORTED_FEATURES_AUDIT.md` in this repo.
- Run `npx tsc --noEmit -p .` before pushing.
- Plan limits and billing text come from the backend (`/AdminRoutes/billing`).
