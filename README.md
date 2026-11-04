# Rigmate — Installable prototype

Rigmate is a mobile-first owner-operator app concept. The current build is a **demo PWA**: its load listings, locations, route, and ETA are sample data. It does not connect to a load board, broker, map, GPS, or booking service and cannot place real bookings.

## Run locally on Al's PC

From Git Bash:

```bash
python -m http.server 8765 --bind 127.0.0.1 --directory C:/Users/Al/TruckerAgent
```

Open `http://127.0.0.1:8765/index.html` in Chrome. The install prompt and service worker require a secure context; localhost is accepted for local testing.

## Install on a Google Pixel

For an installable link on the Pixel, Rigmate must be hosted at an HTTPS address. After it is hosted, open that URL in Chrome on the Pixel, then use Chrome's menu and choose **Install app** or **Add to Home screen**.

Public demo: https://alvaroolivro-png.github.io/rigmate/. It is a publicly visible prototype and the source code is public. The listings, trip, ETA, and locations are sample data only; no live load-board or booking integration is connected.

## Current screens

- Trip overview with truck background and sample route.
- Load board with minimum-rate filtering and sample listings.
- Load details and a demo-only booking approval flow.
- Nearby locations with category filtering and sample places.
- Preferences saved locally in the browser.

## Live integration prerequisites

Real loads, bookings, broker communications, location data, and ETA updates require provider-approved API access, credentials, commercial terms, and permissions. Do not place API secrets in source code or chat. Start with one load-board provider and one location/routing provider, then expand after the pilot.
