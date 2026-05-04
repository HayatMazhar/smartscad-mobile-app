/* eslint-disable */
// Demo / dev-only HTTP-to-HTTPS proxy.
//
// Why: iOS does not trust the UAT API's TLS cert, so Expo Go can't talk to
// https://uatmobileapi.adsmartsupport.ae directly. Phones CAN talk to plain
// HTTP on the laptop's LAN address (Expo Go allows local-network HTTP).
// This proxy listens on plain HTTP, forwards every request to UAT over HTTPS
// (using the laptop's trust store which already trusts the corporate cert),
// and pipes the response back unchanged.
//
// Run: node dev-proxy.js
// Then set EXPO_PUBLIC_API_BASE_URL in .env to:
//   http://<your-lan-ip>:3001/SmartSCADMobileAPI/api/v1
// and restart `npx expo start --clear`.

const http = require('http');
const https = require('https');
const { URL } = require('url');

const UPSTREAM = process.env.UPSTREAM || 'https://uatmobileapi.adsmartsupport.ae';
const PORT = parseInt(process.env.PROXY_PORT || '3001', 10);

const upstreamUrl = new URL(UPSTREAM);

const server = http.createServer((req, res) => {
  const headers = { ...req.headers };
  // Rewrite Host so IIS on the upstream serves the correct vhost / cert SNI.
  headers['host'] = upstreamUrl.host;
  delete headers['connection'];
  delete headers['proxy-connection'];

  const opts = {
    protocol: upstreamUrl.protocol,
    hostname: upstreamUrl.hostname,
    port: upstreamUrl.port || 443,
    path: req.url,
    method: req.method,
    headers,
    // Accept the corporate cert from the laptop side. The laptop has already
    // proven it can reach this host (Safari/curl works), so we are not
    // weakening security further than the user's own browser already does.
    rejectUnauthorized: false,
  };

  const upstream = https.request(opts, (uRes) => {
    res.writeHead(uRes.statusCode || 502, uRes.headers);
    uRes.pipe(res);
  });

  upstream.on('error', (err) => {
    console.error(`[proxy] ${req.method} ${req.url} -> upstream error:`, err.message);
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: `Proxy upstream error: ${err.message}` }));
  });

  req.on('error', (err) => {
    console.error(`[proxy] ${req.method} ${req.url} -> client error:`, err.message);
    upstream.destroy();
  });

  req.pipe(upstream);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[proxy] listening http://0.0.0.0:${PORT}  ->  ${UPSTREAM}`);
  console.log(`[proxy] point EXPO_PUBLIC_API_BASE_URL at  http://<lan-ip>:${PORT}/SmartSCADMobileAPI/api/v1`);
});
