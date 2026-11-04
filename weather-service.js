(function attachRigmateWeather(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RigmateWeather = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRigmateWeather() {
  const API = 'https://api.weather.gov';

  async function fetchWeather(latitude, longitude, fetchImpl = globalThis.fetch) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new TypeError('Valid latitude and longitude are required.');
    }
    if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');

    const lat = latitude.toFixed(4);
    const lon = longitude.toFixed(4);
    const options = { headers: { Accept: 'application/geo+json' }, referrerPolicy: 'origin' };
    const pointResponse = await fetchImpl(`${API}/points/${lat},${lon}`, options);
    if (!pointResponse.ok) throw new Error(`NWS location lookup returned ${pointResponse.status}`);

    const point = await pointResponse.json();
    const hourlyUrl = point?.properties?.forecastHourly;
    if (typeof hourlyUrl !== 'string' || !hourlyUrl.startsWith(API + '/')) {
      throw new Error('NWS does not provide a forecast for this location.');
    }

    const alertUrl = `${API}/alerts/active?point=${lat},${lon}`;
    const [forecastResponse, alertResult] = await Promise.all([
      fetchImpl(hourlyUrl, options),
      fetchImpl(alertUrl, options)
        .then(async response => ({ available: response.ok, body: response.ok ? await response.json() : null }))
        .catch(() => ({ available: false, body: null }))
    ]);
    if (!forecastResponse.ok) throw new Error(`NWS forecast returned ${forecastResponse.status}`);

    const forecast = await forecastResponse.json();
    const period = forecast?.properties?.periods?.[0];
    if (!period) throw new Error('NWS returned no hourly forecast.');

    const alerts = alertResult.available && Array.isArray(alertResult.body?.features)
      ? alertResult.body.features.slice(0, 3).map(feature => ({
          event: typeof feature?.properties?.event === 'string' ? feature.properties.event : 'Weather alert',
          headline: typeof feature?.properties?.headline === 'string' ? feature.properties.headline : ''
        }))
      : [];

    return {
      temperature: period.temperature,
      temperatureUnit: period.temperatureUnit,
      periodName: typeof period.name === 'string' && period.name ? period.name : 'Next hour',
      summary: typeof period.shortForecast === 'string' ? period.shortForecast : 'Forecast unavailable',
      windSpeed: typeof period.windSpeed === 'string' ? period.windSpeed : 'Unknown',
      windDirection: typeof period.windDirection === 'string' ? period.windDirection : '',
      alerts,
      alertsAvailable: alertResult.available
    };
  }

  return { fetchWeather };
});
