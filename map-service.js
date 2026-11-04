(function attachRigmateMap(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RigmateMap = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRigmateMap() {
  function buildMapEmbedUrl(latitude, longitude) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new TypeError('Valid latitude and longitude are required.');
    }

    const lat = Math.max(-85.0511, Math.min(85.0511, latitude));
    const lon = longitude;
    const minLon = Math.max(-180, lon - 0.025);
    const maxLon = Math.min(180, lon + 0.025);
    const minLat = Math.max(-85.0511, lat - 0.015);
    const maxLat = Math.min(85.0511, lat + 0.015);
    const fixed = value => value.toFixed(4);
    const params = new URLSearchParams({
      bbox: [minLon, minLat, maxLon, maxLat].map(fixed).join(','),
      layer: 'mapnik',
      marker: `${fixed(lat)},${fixed(lon)}`
    });
    return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
  }

  return { buildMapEmbedUrl };
});
