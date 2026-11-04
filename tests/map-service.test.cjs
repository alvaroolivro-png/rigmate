const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMapEmbedUrl } = require('../map-service.js');

test('buildMapEmbedUrl centers an OpenStreetMap embed on the selected coordinates', () => {
  const url = new URL(buildMapEmbedUrl(36.1627, -86.7816));
  assert.equal(url.origin, 'https://www.openstreetmap.org');
  assert.equal(url.pathname, '/export/embed.html');
  assert.equal(url.searchParams.get('marker'), '36.1627,-86.7816');
  assert.equal(url.searchParams.get('layer'), 'mapnik');
  const bbox = url.searchParams.get('bbox').split(',').map(Number);
  assert.equal(bbox.length, 4);
  assert.ok(bbox[0] < -86.7816 && bbox[2] > -86.7816);
  assert.ok(bbox[1] < 36.1627 && bbox[3] > 36.1627);
});

test('buildMapEmbedUrl rejects invalid coordinates', () => {
  assert.throws(() => buildMapEmbedUrl(91, 0), /Valid latitude and longitude/);
  assert.throws(() => buildMapEmbedUrl(0, NaN), /Valid latitude and longitude/);
});
