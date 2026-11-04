const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchWeather } = require('../weather-service.js');

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('fetchWeather returns live hourly forecast and active alert summaries', async () => {
  const calls = [];
  const hourlyUrl = 'https://api.weather.gov/gridpoints/OHX/50,50/forecast/hourly';
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/points/')) return response({ properties: { forecastHourly: hourlyUrl } });
    if (url === hourlyUrl) return response({ properties: { periods: [{ name: 'Next hour', temperature: 72, temperatureUnit: 'F', shortForecast: 'Mostly Cloudy', windSpeed: '5 mph', windDirection: 'NW' }] } });
    if (url.includes('/alerts/active?point=')) return response({ features: [{ properties: { event: 'Wind Advisory', headline: 'Windy conditions expected' } }] });
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await fetchWeather(36.1627, -86.7816, fetchImpl);

  assert.equal(result.temperature, 72);
  assert.equal(result.summary, 'Mostly Cloudy');
  assert.deepEqual(result.alerts, [{ event: 'Wind Advisory', headline: 'Windy conditions expected' }]);
  assert.equal(calls.length, 3);
  assert.match(calls[0].url, /\/points\/36\.1627,-86\.7816$/);
  assert.equal(calls[0].options.headers.Accept, 'application/geo+json');
});

test('fetchWeather keeps a forecast when active-alert lookup is unavailable', async () => {
  const hourlyUrl = 'https://api.weather.gov/gridpoints/OHX/50,50/forecast/hourly';
  const fetchImpl = async url => {
    if (url.includes('/points/')) return response({ properties: { forecastHourly: hourlyUrl } });
    if (url === hourlyUrl) return response({ properties: { periods: [{ temperature: 68, temperatureUnit: 'F', shortForecast: 'Clear' }] } });
    return response({}, 503);
  };
  const result = await fetchWeather(36.1627, -86.7816, fetchImpl);
  assert.equal(result.temperature, 68);
  assert.equal(result.alertsAvailable, false);
  assert.deepEqual(result.alerts, []);
});

test('fetchWeather rejects invalid coordinates before making a request', async () => {
  let called = false;
  await assert.rejects(fetchWeather(91, 0, async () => { called = true; }), /Valid latitude and longitude/);
  assert.equal(called, false);
});
