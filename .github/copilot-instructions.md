## Repo snapshot for AI coding agents

This repository is a Vite + React + TypeScript frontend with Firebase backend functions. Key pieces:

- Frontend: root TypeScript files and React entry at `index.tsx`, built with Vite (`vite` scripts in `package.json`).
- Dev server: `npm run dev` (Vite, port 5173). Build: `npm run build` → `dist`.
- Hosting: Firebase Hosting serves `dist` (see `firebase.json`). Vite copies `locales`, `locales.json`, `languages.json`, and `sw.js` into `dist` via `vite.config.ts`.
- Backend: `functions/` — Firebase Functions written in TypeScript, built with `npm run build` (see `functions/package.json`). Deploy via `firebase deploy --only functions`.

## What to know first (big picture)

- The single-page app is built by Vite and deployed to Firebase Hosting. The build output is in `dist` and expected to include `locales/` and `sw.js` (see `vite.config.ts`).
- Server-side logic lives in `functions/src/*`. Important files: `functions/src/index.ts` (Shippo, Sea Rates, Stripe payment intent), `functions/src/subscription.ts` (Stripe subscription handlers), `functions/src/geoapify.ts`, `nvidia.ts`.
- Environment and secrets: frontend uses `VITE_GEMINI_API_KEY` (set in `.env.local`), backend functions read secrets from environment variables in Firebase Console (e.g. `SHIPPO_API_KEY`, `SEARATES_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). Do not commit secrets.
- Firebase Admin uses Application Default Credentials on deploy — no service account file required when deployed. In local testing you may need firebase CLI auth or service account configured for emulators.

## Common developer workflows & commands

- Frontend dev: 1) `npm install` at repo root, 2) `npm run dev` → open http://localhost:5173.
- Frontend build: `npm run build` (produces `dist`). Preview: `npm run preview`.
- Functions: cd into `functions/` then `npm install`. Build: `npm run build` (runs `tsc`). Local emulators: `npm run serve` → runs `tsc` then `firebase emulators:start --only functions` (requires Firebase CLI).
- Deploy hosting + functions: `firebase deploy` (or `firebase deploy --only functions` / `--only hosting`). `firebase.json` already contains a `predeploy` for functions to build.

## Project-specific conventions & patterns

- Environment keys for frontend are prefixed with `VITE_` (Vite exposes only env vars that start with `VITE_`). Example: `VITE_GEMINI_API_KEY` is referenced via `process.env.GEMINI_API_KEY` in `vite.config.ts` (defined with `define`).
- Functions mix `v1` and `v2` APIs cautiously — `functions/src/index.ts` purposely avoids mixing v1/v2 for the same exports (see comments). When adding new functions, prefer following the style used in the file you edit.
- Rate limits and subscription gating: `functions/src/index.ts` contains logic for Sea Rates usage limits (50 calls/month for free users) and caching patterns (`sea_rates_cache`) — changes here require awareness of both Firestore structure and frontend fallbacks.
- Payment flows: `createPaymentIntent` (express app) is exported as a v2 HTTP function in `functions/src/index.ts`. Subscription management is in `functions/src/subscription.ts` (v2 callable + webhook). Keep webhook raw body handling and Stripe signature verification intact.

## Integration points to watch

- External APIs: Shippo, SeaRates, Geoapify, Google Maps, Gemini (AI), Stripe. Keys are read from env vars in functions or the frontend.
- Firestore schema: various collections used include `users`, `api_stats`, `sea_rates_cache`, `quote_inquiries`. Modifying cloud code that writes/reads these must maintain compatibility.
- Hosting routing: `firebase.json` rewrites all routes to `/index.html` (single-page app). Static caching headers are set for assets.

## Useful file references (quick examples)

- Build and copy of locales + SW: `vite.config.ts` (plugin `copy-locales` writes `locales` into `dist`).
- Firebase hosting + predeploy: `firebase.json` — hosting `public: dist`, functions `predeploy` builds functions.
- Sea Rates + subscription limits: `functions/src/index.ts` — see `getSeaRates`, `getMonthlySeaRatesCalls`, `incrementMonthlySeaRatesCalls`.
- Stripe subscription & webhooks: `functions/src/subscription.ts` — `createSubscriptionCheckout`, `stripeWebhook`.

## Agent behavior rules (short)

- Never insert secrets in code. If adding env var references, name them and mention where to configure them (local `.env.local` for frontend; Firebase Console for functions).
- Follow existing API patterns and function names when adding endpoints (use `onCall` for callable functions and `onRequest`/v2 HTTP for webhooks/express apps). Keep consistent memory/time config used in existing functions.
- Respect the Firestore collections and field names used by existing code (see `users`, `api_stats`, `sea_rates_cache`, `quote_inquiries`). If migrating schema, add a migration plan.

## When you need more info

- If any runtime behavior (emulator ports, CI deploy, or secret locations) is missing, ask the repo owner for their Firebase project id, hosting target, and which secrets are in the Firebase environment.

---
Please review this draft and tell me if you'd like more details (CI, tests, or explicit call examples for the front-end <-> functions calls). I can iterate quickly.

# AUTO-COMMIT AFTER DEPLOYMENT
Whenever a Firebase deployment succeeds, automatically:
1. Run `git add . --all`
2. Commit with message "AUTO: Deployment $(date)"
3. Push to origin/main
4. Notify user in chat

# AUTO-DEPLOY ON PUSH
When code is pushed to main branch:
1. Run TypeScript compilation check
2. Run `firebase deploy --only functions`
3. Report deployment status
