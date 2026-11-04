# Rigmate — Installable prototype

Rigmate is a mobile-first owner-operator app concept. The current build is a **demo PWA**: load listings, truck stops, route, and ETA are sample data. The optional weather card uses the live NOAA/NWS API after the driver taps to grant browser location access; coordinates are sent to NWS for that lookup and are not shared with brokers. There is still no live load board, truck-safe map/routing, or booking service connected.

## Run locally on Al's PC

From Git Bash:

```bash
python -m http.server 8765 --bind 127.0.0.1 --directory C:/Users/Al/TruckerAgent
```

Open `http://127.0.0.1:8765/index.html` in Chrome. The install prompt and service worker require a secure context; localhost is accepted for local testing.

## Tests

```bash
node --test tests/*.test.cjs
```

## Install on a Google Pixel

For an installable link on the Pixel, Rigmate must be hosted at an HTTPS address. After it is hosted, open that URL in Chrome on the Pixel, then use Chrome's menu and choose **Install app** or **Add to Home screen**.

Public demo: https://alvaroolivro-png.github.io/rigmate/. It is a publicly visible prototype and the source code is public. Weather and alerts are live from NOAA/NWS only after the user requests a location lookup; listings, route, ETA, and truck-stop locations are still sample data. No load-board, broker, or booking integration is connected.

## Current screens

- Trip overview with truck background and sample route.
- Load board with minimum-rate filtering and sample listings.
- Load details and a demo-only booking approval flow.
- Nearby locations with category filtering and sample places.
- On-demand live NOAA/NWS forecast and active alerts using browser location permission.
- Integration status panel for NWS, 123Loadboard, and HERE; the latter two remain pending access/credentials.
- Preferences saved locally in the browser.

## Live integration prerequisites

Live load search, booking, broker messages, truck-safe routes, and truck-stop data require provider access, commercial terms, credentials, and permission for each operation. The current NWS weather/alerts lookup is the only live external data integration; it requests device location only after a user action. Next integrations: 123Loadboard API access and HERE truck routing/search credentials. Do not put API secrets in source code or chat; production credentials should be held server-side, with booking and location sharing remaining driver-approved.
