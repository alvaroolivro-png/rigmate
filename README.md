# Rigmate — Installable prototype

Rigmate is a mobile-first owner-operator app concept. The current build is a **demo PWA with a live road-data layer**.

**Live, no key required (runs only when the driver asks):**
- NOAA/NWS hourly forecast and active weather alerts after the driver approves location access; coordinates go to NWS for that lookup and are not shared with brokers.[8]
- Geocoding of a typed city or ZIP, used to place a search on the map (Photon, with Nominatim as a backup).[17][11]
- Real road distance and drive time between two places, geocoded and routed live (OSRM, **car profile only**).[16]
- Live truck stops, truck parking, weigh scales, and truck repair shops near a point, from OpenStreetMap data via the Overpass API.[12]
- On-demand current-area OpenStreetMap preview (general-purpose map, not truck-safe routing).[13][14]
- Rigmate preloads the truck-stop list for the destination already listed in the trip, so the list is usually ready before the driver opens Locations. Results are cached on the device for 12 hours.

**Still sample data — and it says so in the app:**
- Load listings, rates, brokers, and booking. No free, no-key live load feed exists; load boards such as 123Loadboard, DAT, and Truckstop gate search and booking behind a partner agreement.[4][1][2]
- The trip fixture (Memphis → Nashville), arrival window, and the sample truck-stop list under the live one.

Booking remains driver-approved, and location sharing stays opt-in and scoped to a confirmed load.

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

Covers the weather, live-data, and map services: geocoding with fallback, unit conversion for distance and drive time, Overpass query building and tag categorisation, mirror retry, rate-limit and timeout messaging, the total time budget, and the persistent place cache.

## Install on a Google Pixel

For an installable link on the Pixel, Rigmate must be hosted at an HTTPS address. After it is hosted, open that URL in Chrome on the Pixel, then use Chrome's menu and choose **Install app** or **Add to Home screen**.

Public demo: https://alvaroolivro-png.github.io/rigmate/. It is a publicly visible prototype and the source code is public. A load-board button opens C.H. Robinson's public board externally; that is not a feed into Rigmate and full board access needs a carrier login.[15]

## Showing this to a trucker

1. Open the app and go to **Preferences → Integration status** — it lists exactly what is live and what is not.
2. On **Trip overview**, type two real cities and tap **Calculate live route**. Real distance and drive time come back in a couple of seconds; the card states plainly that it is a car-profile estimate, not truck-legal routing.
3. Tap **Use my location** in **Weather & road alerts** for the real forecast and any active NWS alerts.
4. Open **Locations**. The preloaded list shows real nearby truck stops, truck parking, scales, and repair shops with distances; tap a category to filter. The first search for a new area can take 30–60 seconds on the free public Overpass service, and it is instant afterwards from cache.
5. Be straight about the load board: Rigmate demonstrates the concept with sample listings, a rate floor, and a booking-approval flow. Real listings arrive once a load-board partner is connected.

## Free data limits — and the commercial path

The live layer deliberately uses free, no-key services so a trucker can test it today without an account. None of them are licensed for a commercial launch:

- The public Overpass instance is run by FOSSGIS for the community and is frequently overloaded. Its policy allows roughly 10,000 queries/day for one-off use, expects scripts and apps to stay near 100/day, counts every user of an app together, and states that **commercial use should use self-hosted or paid Overpass servers**.[12] Rigmate caches results and enforces a total time budget to stay a good citizen, but a paying product must move this server-side.
- Nominatim's usage policy forbids heavy use, requires about one request per second, and expects applications not to rely on the public instance.[11]
- The OSRM demo server is a demonstration service with no availability guarantee, and it offers a car profile rather than a truck profile.[16]
- Photon's public endpoint is a fair-use community service, not a commercial SLA.[17]

The production shape is therefore: a small backend holds provider keys and does the caching, plus a commercial data agreement for truck-legal routing and POIs. HERE documents truck routing that applies legal, physical (height, weight, axle), hazmat, and tunnel restrictions — exactly what a rig needs and what the free stack cannot give.[9] Load search and booking need load-board partner access.[4] Keep API secrets out of the client and out of chat; production credentials belong server-side, with booking and location sharing remaining driver-approved.

## Sources

[1] https://www.dat.com/api-integration
[2] https://developer.truckstop.com/reference/general-overview
[4] https://www.123loadboard.com/api
[8] https://www.weather.gov/documentation/services-web-api
[9] https://docs.here.com/routing/docs/routing-v8-truck-routing
[11] https://operations.osmfoundation.org/policies/nominatim
[12] https://wiki.openstreetmap.org/wiki/Overpass_API
[13] https://operations.osmfoundation.org/policies/tiles
[14] https://wiki.openstreetmap.org/wiki/Export
[15] https://www.chrobinson.com/en-us/carriers/loadboard
[16] https://project-osrm.org
[17] https://photon.komoot.io
