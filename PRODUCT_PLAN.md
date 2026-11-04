# Rigmate — Product Plan (Draft v0.1)

## Product in one sentence
A mobile-first all-in-one app that helps owner-operators manage the road and uses an agent to find the next suitable load while they are hauling the current one.

## First customer
Independent owner-operators and very small carriers. The first version is for one truck and one driver; fleet dispatch can come later.

## Core workflow
1. The driver enters their truck/equipment details, preferred lanes, availability, and minimum acceptable rate.
2. They enter or confirm the current trip destination and estimated arrival time.
3. The agent searches an approved load-board connection for suitable loads near that destination and arrival window.
4. It filters and ranks options using equipment, pickup timing, deadhead distance, rate, and the driver's preferences.
5. It sends a notification with the options; the driver reviews while safely stopped.
6. The driver sees the complete load terms and explicitly approves before the app contacts the broker or books anything.
7. For a confirmed load, the driver can opt in to share location and ETA with that broker. Sharing stops when the load ends or the driver turns it off.

## MVP — validate the unique value first

### MVP screens and functions
- **Live Load Board:** current loads near the destination, filtered by equipment, pickup window, radius, and the driver's minimum rate. Real listings require one approved provider integration; the prototype uses clearly labeled sample listings.
- **Booking:** load details and terms, followed by a separate driver approval step. With a partner connection, submit only after approval and show the provider's booking confirmation. The prototype simulates this and does not place real bookings.
- **Locations:** a map/list of truck stops, parking, fuel, scales, and repair locations near the route or destination. Live location data and availability require licensed data integrations; the prototype uses sample locations.

- Driver/carrier profile and truck details.
- Trip destination, ETA, and availability window.
- Configurable minimum rate and search radius.
- One authorized load-board integration for search and load details.
- Ranking that shows pay, pickup distance/deadhead, timing, and estimated trip costs where data is available.
- Push alerts and a review/approval screen.
- Booking only after explicit driver approval; keep a record of the displayed terms and action.
- Optional location/ETA sharing for an accepted load.

## All-in-one roadmap
### Phase 1: Next-load agent
Prove that destination-aware load suggestions save time or empty miles. Use one load-board provider first.

### Phase 2: Road tools
Add truck-safe routing, trip planning, parking, fuel, weigh stations/scales, and truck-stop/repair points of interest through licensed data or integration partners.

### Phase 3: Owner-operator business tools
Consider load documents, expense tracking, settlements, maintenance reminders, and accounting integrations after drivers validate the core product.

## Integration candidates and gates
- **Load data/booking:** evaluate 123Loadboard, DAT, and Truckstop. Public API information describes relevant capabilities, but access, commercial terms, sandbox credentials, and permission to search or book must be approved by each provider.
- **Truck routing and road POIs:** select a provider that supports truck dimensions, weight restrictions, and commercial-use licensing before implementation.
- **Location/ETA:** use opt-in device location during an active trip; share only for the accepted load and with the selected broker.
- **Notifications and broker communication:** start with in-app/push notifications. Use load-board messaging or another approved channel where permitted; do not assume email/SMS or automated booking is authorized.

## Safety and control
- Do not require the driver to read, type, or approve loads while driving; queue options for a safe stop.
- Search and recommendations can run automatically. Booking, sending a binding offer, and sharing live location require clear driver authorization.
- Make location access optional, visible, limited to the active load, and easy to stop.
- Use vendor-approved APIs and agreements, not scraping or shared account passwords.

## Pilot success measures
- How many suggestions are relevant and opened?
- How long does it take to find the next load?
- How many empty/deadhead miles do drivers report avoiding?
- How often does a suggested load meet the driver's minimum after considering pickup distance and trip costs?
- Do drivers trust the approval and location-sharing controls?

## Immediate next steps
1. Interview 5–10 owner-operators and confirm their biggest pain points and preferred load sources.
2. Choose one load-board provider to approach first; request partner/API access, a test environment, and the exact permissions for search, messaging, and booking.
3. Make a clickable phone prototype of profile → current trip → ranked loads → review/approve → ETA sharing.
4. Build only after the API provider confirms access and test terms.

## Reference links
- DAT API Integration: https://www.dat.com/api-integration
- 123Loadboard API Integrations: https://www.123loadboard.com/api/
- Truckstop API Overview: https://developer.truckstop.com/reference/general-overview
- Trucker Path app features: https://framer.truckerpath.com/trucker-path-app
- Trucker Path load board features: https://truckerpath.com/pricing/load-board
