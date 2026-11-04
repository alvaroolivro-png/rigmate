(function attachRigmateLiveData(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RigmateLiveData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRigmateLiveData() {
  const PHOTON = 'https://photon.komoot.io/api/';
  const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  const OSRM = 'https://router.project-osrm.org/route/v1/driving';
  const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];
  const METRES_PER_MILE = 1609.344;
  const EARTH_RADIUS_MILES = 3958.7613;
  const DEFAULT_RADIUS_MILES = 15;
  const DEFAULT_TIMEOUT_MS = 40000;
  const DEFAULT_DEADLINE_MS = 80000;
  const CACHE_TTL_MS = 10 * 60 * 1000;
  const PERSIST_KEY = 'rigmatePlacesCache';
  const PERSIST_TTL_MS = 12 * 60 * 60 * 1000;
  const PERSIST_MAX_ENTRIES = 12;
  const DEFAULT_RETRY_DELAY_MS = 1200;
  const placeCache = new Map();

  function clearPlaceCache() {
    placeCache.clear();
  }

  function resolveStorage(options) {
    if (options && options.storage) return options.storage;
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch (error) {
      return null;
    }
  }

  function readPersisted(storage, cacheKey) {
    if (!storage) return null;
    try {
      const raw = storage.getItem(PERSIST_KEY);
      if (!raw) return null;
      const entry = JSON.parse(raw)?.[cacheKey];
      if (!entry || !Array.isArray(entry.places)) return null;
      if (Date.now() - entry.at > PERSIST_TTL_MS) return null;
      return entry.places;
    } catch (error) {
      return null;
    }
  }

  function writePersisted(storage, cacheKey, places) {
    if (!storage) return;
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(storage.getItem(PERSIST_KEY)) || {};
      } catch (error) {
        parsed = {};
      }
      parsed[cacheKey] = { at: Date.now(), places };
      const keys = Object.keys(parsed);
      if (keys.length > PERSIST_MAX_ENTRIES) {
        keys.sort((a, b) => parsed[a].at - parsed[b].at);
        keys.slice(0, keys.length - PERSIST_MAX_ENTRIES).forEach(key => delete parsed[key]);
      }
      storage.setItem(PERSIST_KEY, JSON.stringify(parsed));
    } catch (error) {
      /* a full or unavailable store must never break a live lookup */
    }
  }

  function toRadians(value) {
    return (value * Math.PI) / 180;
  }

  function distanceMiles(aLat, aLon, bLat, bLon) {
    const dLat = toRadians(bLat - aLat);
    const dLon = toRadians(bLon - aLon);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  async function geocode(query, fetchImpl = globalThis.fetch) {
    const text = typeof query === 'string' ? query.trim() : '';
    if (!text) throw new TypeError('A place name is required.');
    if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
    const encoded = encodeURIComponent(text);

    try {
      const response = await fetchImpl(`${PHOTON}?q=${encoded}&limit=1`);
      if (response.ok) {
        const body = await response.json();
        const feature = Array.isArray(body?.features) ? body.features[0] : null;
        const coordinates = feature?.geometry?.coordinates;
        if (Array.isArray(coordinates) && coordinates.length >= 2) {
          const label = [feature.properties?.name, feature.properties?.state, feature.properties?.country]
            .filter(part => typeof part === 'string' && part)
            .join(', ');
          return {
            latitude: Number(coordinates[1]),
            longitude: Number(coordinates[0]),
            label: label || text,
            source: 'Photon (OpenStreetMap)'
          };
        }
      }
    } catch (error) {
      /* fall through to the backup geocoder */
    }

    const backup = await fetchImpl(`${NOMINATIM}?q=${encoded}&format=json&limit=1`);
    if (backup.ok) {
      const body = await backup.json();
      const match = Array.isArray(body) ? body[0] : null;
      if (match && Number.isFinite(Number(match.lat)) && Number.isFinite(Number(match.lon))) {
        return {
          latitude: Number(match.lat),
          longitude: Number(match.lon),
          label: typeof match.display_name === 'string' ? match.display_name.split(',').slice(0, 3).join(', ').trim() : text,
          source: 'Nominatim (OpenStreetMap)'
        };
      }
    }

    throw new Error(`No matching place was found for "${text}".`);
  }

  async function route(origin, destination, fetchImpl = globalThis.fetch) {
    for (const point of [origin, destination]) {
      if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
        throw new TypeError('Both origin and destination coordinates are required.');
      }
    }
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const response = await fetchImpl(`${OSRM}/${coordinates}?overview=false`);
    if (!response.ok) throw new Error(`Routing service returned ${response.status}.`);
    const body = await response.json();
    const best = Array.isArray(body?.routes) ? body.routes[0] : null;
    if (body?.code !== 'Ok' || !best) throw new Error('No driving route was found between those points.');
    return {
      miles: Math.round(best.distance / METRES_PER_MILE),
      minutes: Math.round(best.duration / 60),
      profile: 'car-estimate',
      source: 'OSRM (OpenStreetMap) car profile'
    };
  }

  function categorizePlace(tags = {}) {
    if (tags.shop === 'truck_repair' || tags.shop === 'car_repair') return 'Repair';
    if (tags.amenity === 'weighbridge' || tags.highway === 'weigh_station') return 'Scale';
    if (tags.amenity === 'fuel') return 'Fuel';
    if (tags.highway === 'rest_area' || tags.amenity === 'parking') return 'Parking';
    return 'Other';
  }

  function placeName(tags = {}, kind) {
    const candidate = tags.name || tags.brand || tags.operator || tags.ref;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    return `Unnamed ${kind.toLowerCase()} stop (OpenStreetMap)`;
  }

  function buildOverpassQuery(latitude, longitude, radiusMeters) {
    const around = `around:${radiusMeters},${latitude},${longitude}`;
    const filters = [
      `[amenity=fuel][hgv=yes]`,
      `[amenity=fuel][truck=yes]`,
      `[amenity=parking][hgv=yes]`,
      `[amenity=parking][truck=yes]`,
      `[highway=rest_area]`,
      `[shop=truck_repair]`,
      `[amenity=weighbridge]`
    ];
    return `[out:json][timeout:25];(${filters.map(f => `nwr(${around})${f};`).join('')});out center 60;`;
  }

  function parsePlaces(elements, latitude, longitude) {
    const seen = new Set();
    const places = [];
    for (const element of Array.isArray(elements) ? elements : []) {
      const key = `${element?.type}/${element?.id}`;
      if (!element || seen.has(key)) continue;
      seen.add(key);
      const tags = element.tags || {};
      const lat = Number.isFinite(element.lat) ? element.lat : element.center?.lat;
      const lon = Number.isFinite(element.lon) ? element.lon : element.center?.lon;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const kind = categorizePlace(tags);
      places.push({
        id: key,
        kind,
        name: placeName(tags, kind),
        latitude: lat,
        longitude: lon,
        miles: Math.round(distanceMiles(latitude, longitude, lat, lon) * 10) / 10,
        fuel: typeof tags.fuel === 'string' ? tags.fuel : null,
        showers: typeof tags.shower === 'string' ? tags.shower : (tags.shower === 'yes' ? 'yes' : null),
        truckParking: tags.hgv === 'yes' || tags.truck === 'yes' ? 'yes' : null,
        source: 'OpenStreetMap contributors'
      });
    }
    return places.sort((a, b) => a.miles - b.miles);
  }

  async function nearbyTruckPlaces(latitude, longitude, fetchImpl = globalThis.fetch, options = {}) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new TypeError('Valid latitude and longitude are required.');
    }
    const radiusMiles = Number.isFinite(options.radiusMiles) ? options.radiusMiles : DEFAULT_RADIUS_MILES;
    const radiusMeters = Number.isFinite(options.radiusMeters) ? options.radiusMeters : Math.round(radiusMiles * METRES_PER_MILE);
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    const retryDelayMs = Number.isFinite(options.retryDelayMs) ? options.retryDelayMs : DEFAULT_RETRY_DELAY_MS;
    const deadlineMs = Number.isFinite(options.deadlineMs) ? options.deadlineMs : DEFAULT_DEADLINE_MS;
    const startedAt = Date.now();
    const useCache = options.cache !== false;
    const storage = resolveStorage(options);
    const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)},${radiusMeters}`;

    if (useCache) {
      const hit = placeCache.get(cacheKey);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.places;
      const persisted = readPersisted(storage, cacheKey);
      if (persisted) {
        placeCache.set(cacheKey, { at: Date.now(), places: persisted });
        return persisted;
      }
    }

    const query = buildOverpassQuery(latitude, longitude, radiusMeters);
    const url = mirror => `${mirror}?data=${encodeURIComponent(query)}`;
    const attemptErrors = [];
    let rateLimited = false;
    let timedOut = false;

    for (const mirror of OVERPASS_MIRRORS) {
      if (Date.now() - startedAt > deadlineMs) {
        attemptErrors.push(`stopped after ${Math.round((Date.now() - startedAt) / 1000)}s because the free service is too slow right now`);
        timedOut = true;
        break;
      }
      let lastError = `${mirror} did not respond`;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (attempt > 0 && Date.now() - startedAt > deadlineMs) {
          attemptErrors.push(`stopped retrying ${mirror} after ${Math.round((Date.now() - startedAt) / 1000)}s`);
          timedOut = true;
          break;
        }
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        try {
          const response = await fetchImpl(url(mirror), controller ? { signal: controller.signal } : {});
          if (timer) clearTimeout(timer);
          if (response.status === 429) {
            rateLimited = true;
            lastError = `${mirror} is rate-limiting (HTTP 429)`;
          } else if (!response.ok) {
            lastError = `${mirror} returned ${response.status}`;
          } else {
            const body = await response.json();
            const places = parsePlaces(body?.elements, latitude, longitude);
            if (useCache) {
              placeCache.set(cacheKey, { at: Date.now(), places });
              writePersisted(storage, cacheKey, places);
            }
            return places;
          }
        } catch (error) {
          if (timer) clearTimeout(timer);
          lastError = `${mirror} failed: ${error.message}`;
        }
        if (attempt === 0 && retryDelayMs > 0) await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
      attemptErrors.push(lastError);
      if (timedOut) break;
    }

    if (rateLimited) {
      throw new Error(`The live place service is rate-limiting requests right now (${attemptErrors.join('; ')}). Wait about a minute and try again.`);
    }
    throw new Error(`The live place service is unavailable right now (${attemptErrors.join('; ')}).`);
  }

  return {
    PHOTON,
    NOMINATIM,
    OSRM,
    OVERPASS_MIRRORS,
    DEFAULT_TIMEOUT_MS,
    DEFAULT_DEADLINE_MS,
    DEFAULT_RADIUS_MILES,
    geocode,
    route,
    nearbyTruckPlaces,
    categorizePlace,
    distanceMiles,
    buildOverpassQuery,
    clearPlaceCache
  };
});
