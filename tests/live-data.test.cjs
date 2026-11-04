const test = require('node:test');
const assert = require('node:assert/strict');
const live = require('../live-data.js');

test.beforeEach(() => {
  live.clearPlaceCache();
});

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('geocode returns coordinates from Photon', async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    return response({ features: [{ geometry: { coordinates: [-86.7743, 36.1623] }, properties: { name: 'Nashville', state: 'Tennessee' } }] });
  };
  const result = await live.geocode('Nashville, TN', fetchImpl);
  assert.equal(result.latitude, 36.1623);
  assert.equal(result.longitude, -86.7743);
  assert.match(result.label, /Nashville/);
  assert.match(calls[0], /^https:\/\/photon\.komoot\.io\/api\//);
});

test('geocode falls back to Nominatim when Photon fails', async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    if (url.includes('photon.komoot.io')) return response({}, 503);
    return response([{ lat: '36.1622767', lon: '-86.7742984', display_name: 'Nashville, Davidson County, Tennessee, United States' }]);
  };
  const result = await live.geocode('Nashville, TN', fetchImpl);
  assert.equal(result.latitude, 36.1622767);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /nominatim\.openstreetmap\.org/);
});

test('geocode throws when no place matches', async () => {
  const fetchImpl = async () => response({ features: [] });
  await assert.rejects(live.geocode('zzzzz nowhere', fetchImpl), /No matching place/);
});

test('route converts OSRM metres and seconds into miles and minutes', async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    return response({ code: 'Ok', routes: [{ distance: 341372.2, duration: 14049.4 }] });
  };
  const result = await live.route({ latitude: 35.1495, longitude: -90.049 }, { latitude: 36.1627, longitude: -86.7816 }, fetchImpl);
  assert.equal(result.miles, 212);
  assert.equal(result.minutes, 234);
  assert.equal(result.profile, 'car-estimate');
  assert.match(calls[0], /^https:\/\/router\.project-osrm\.org\/route\/v1\/driving\/-90\.049,35\.1495;-86\.7816,36\.1627/);
});

test('route reports a clear error when no route is returned', async () => {
  const fetchImpl = async () => response({ code: 'NoRoute', routes: [] });
  await assert.rejects(live.route({ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 }, fetchImpl), /No driving route/);
});

test('nearbyTruckPlaces queries Overpass and categorises results by distance', async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(decodeURIComponent(url));
    return response({
      elements: [
        { type: 'node', id: 901, lat: 36.2, lon: -86.8, tags: { amenity: 'weighbridge' } },
        { type: 'node', id: 902, lat: 36.17, lon: -86.79, tags: { amenity: 'fuel', hgv: 'yes', name: 'Pilot Travel Center', brand: 'Pilot' } },
        { type: 'way', id: 903, center: { lat: 36.18, lon: -86.8 }, tags: { shop: 'truck_repair', name: 'Diesel Repair Co' } }
      ]
    });
  };
  const result = await live.nearbyTruckPlaces(36.1623, -86.7743, fetchImpl);
  assert.match(calls[0], /overpass/);
  assert.match(calls[0], /\[amenity=fuel\]\[hgv=yes\]/);
  assert.match(calls[0], /around:\d+,36\.1623,-86\.7743/);
  assert.equal(result.length, 3);
  assert.equal(result[0].name, 'Pilot Travel Center');
  assert.equal(result[0].kind, 'Fuel');
  assert.equal(result[1].kind, 'Repair');
  assert.equal(result[2].kind, 'Scale');
  assert.ok(result[0].miles < result[2].miles, 'closest place should sort first');
});

test('nearbyTruckPlaces retries the next mirror after a server error', async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    if (url.includes(live.OVERPASS_MIRRORS[0])) return response('at capacity', 502);
    return response({ elements: [{ type: 'node', lat: 36.17, lon: -86.79, tags: { amenity: 'fuel', hgv: 'yes', name: 'Live Stop' } }] });
  };
  const result = await live.nearbyTruckPlaces(36.1623, -86.7743, fetchImpl);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Live Stop');
  assert.ok(calls.some(u => u.includes(live.OVERPASS_MIRRORS[1])));
});

test('nearbyTruckPlaces fails clearly when every mirror is unavailable', async () => {
  const fetchImpl = async () => response('busy', 502);
  await assert.rejects(live.nearbyTruckPlaces(36.1623, -86.7743, fetchImpl), /live place service/i);
});

test('nearbyTruckPlaces defaults to a 15 mile radius and honours an override', async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(decodeURIComponent(url));
    return response({ elements: [] });
  };
  await live.nearbyTruckPlaces(36.1623, -86.7743, fetchImpl, { cache: false });
  assert.match(calls[0], /around:24140,36\.1623,-86\.7743/);
  await live.nearbyTruckPlaces(36.1623, -86.7743, fetchImpl, { cache: false, radiusMiles: 50 });
  assert.match(calls[1], /around:80467,36\.1623,-86\.7743/);
});

test('nearbyTruckPlaces explains rate limiting instead of hanging', async () => {
  const fetchImpl = async () => response('too many requests', 429);
  await assert.rejects(live.nearbyTruckPlaces(36.1623, -86.7743, fetchImpl, { cache: false }), /rate-limiting/i);
});

test('nearbyTruckPlaces caches a successful lookup for the same point', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response({ elements: [{ type: 'node', id: 1, lat: 36.17, lon: -86.79, tags: { amenity: 'fuel', hgv: 'yes', name: 'Cached Stop' } }] });
  };
  live.clearPlaceCache();
  const first = await live.nearbyTruckPlaces(35.5, -87.5, fetchImpl);
  const second = await live.nearbyTruckPlaces(35.5, -87.5, fetchImpl);
  assert.equal(calls, 1);
  assert.deepEqual(second, first);
});

test('nearbyTruckPlaces aborts a mirror that never answers', async () => {
  const fetchImpl = (url, options = {}) => new Promise((resolve, reject) => {
    if (options.signal) options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  });
  await assert.rejects(
    live.nearbyTruckPlaces(36.1623, -86.7743, fetchImpl, { cache: false, timeoutMs: 50 }),
    /live place service/i
  );
});

test('nearbyTruckPlaces allows for the slow public Overpass queue', () => {
  assert.equal(live.DEFAULT_TIMEOUT_MS, 40000);
  assert.equal(live.DEFAULT_DEADLINE_MS, 80000);
  assert.equal(live.DEFAULT_RADIUS_MILES, 15);
});

test('nearbyTruckPlaces stops trying once the total deadline passes', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response('at capacity', 502);
  };
  await assert.rejects(
    live.nearbyTruckPlaces(36.1623, -86.7743, fetchImpl, { cache: false, retryDelayMs: 30, deadlineMs: 10 }),
    /live place service/i
  );
  assert.equal(calls, 1, 'a single attempt should run before the deadline cuts the rest off');
});

function fakeStorage() {
  const data = new Map();
  return {
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
    _size: () => data.size
  };
}

test('nearbyTruckPlaces saves a successful lookup into persistent storage', async () => {
  const storage = fakeStorage();
  const fetchImpl = async () => response({ elements: [{ type: 'node', id: 7, lat: 36.17, lon: -86.79, tags: { amenity: 'fuel', hgv: 'yes', name: 'Stored Stop' } }] });
  await live.nearbyTruckPlaces(34.05, -118.25, fetchImpl, { storage });
  const raw = storage.getItem('rigmatePlacesCache');
  assert.ok(raw, 'expected a cache entry');
  assert.match(raw, /Stored Stop/);
});

test('nearbyTruckPlaces serves a warm cache without touching the network', async () => {
  const storage = fakeStorage();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response({ elements: [{ type: 'node', id: 8, lat: 34.06, lon: -118.26, tags: { amenity: 'fuel', hgv: 'yes', name: 'Warm Stop' } }] });
  };
  live.clearPlaceCache();
  await live.nearbyTruckPlaces(34.05, -118.25, fetchImpl, { storage });
  live.clearPlaceCache();
  const second = await live.nearbyTruckPlaces(34.05, -118.25, fetchImpl, { storage });
  assert.equal(calls, 1);
  assert.equal(second[0].name, 'Warm Stop');
});

test('nearbyTruckPlaces retries a struggling mirror once before giving up on it', async () => {
  let attempts = 0;
  const fetchImpl = async url => {
    if (!url.includes(live.OVERPASS_MIRRORS[0])) return response('gone', 502);
    attempts += 1;
    if (attempts === 1) return response('at capacity', 502);
    return response({ elements: [{ type: 'node', id: 9, lat: 36.17, lon: -86.79, tags: { amenity: 'fuel', hgv: 'yes', name: 'Second Try Stop' } }] });
  };
  const places = await live.nearbyTruckPlaces(36.1623, -86.7743, fetchImpl, { cache: false, retryDelayMs: 1 });
  assert.equal(attempts, 2);
  assert.equal(places[0].name, 'Second Try Stop');
});
