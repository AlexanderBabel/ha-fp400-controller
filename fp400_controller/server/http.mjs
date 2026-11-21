import http from 'node:http';
import fs from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Supervisor's ingress proxy is the only client allowed in.
export function trustedAddress(address) { return address === '172.30.32.2' || address === '::ffff:172.30.32.2'; }
const errors = {
  invalid_code: 'Paste a fresh pairing code from "Share device", not the one on the sticker.',
  pairing_busy: 'Pairing is already running.',
  pairing_uncertain: 'The last attempt did not clearly finish. Restart only this app before trying again.',
};
const files = { '/': 'index.html', '/ui.js': 'ui.js', '/style.css': 'style.css' };
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css' };

export function createWizard({ pairer, controllerReady, appVersion = null, allowAddress = trustedAddress }) {
  const csrf = randomBytes(32).toString('hex');
  const json = (response, status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
  };
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'");
    if (!allowAddress(request.socket.remoteAddress)) return json(response, 403, { error: 'Open this through Home Assistant.' });
    const pathname = new URL(request.url, 'http://local').pathname;
    try {
      if (request.method === 'GET' && files[pathname]) {
        const file = files[pathname];
        response.setHeader('Content-Type', `${types[file.split('.').pop()]}; charset=utf-8`);
        return response.end(await fs.readFile(fileURLToPath(new URL(`./public/${file}`, import.meta.url))));
      }
      if (request.method === 'GET' && pathname === '/api/state') {
        let nodes = [], ready = false;
        try { ready = controllerReady(); if (ready) nodes = await pairer.nodes(); }
        catch { ready = false; }
        return json(response, 200, { csrf, appVersion, controller: ready, pairing: pairer.state,
          sensors: ready ? nodes.map(node => ({ name: node.attributes?.['0/40/5'] || 'FP400', available: node.available === true })) : null });
      }
      if (request.method !== 'POST' || pathname !== '/api/pair') return json(response, 404, { error: 'Not found.' });
      const token = request.headers['x-fp400-token'];
      if (typeof token !== 'string' || token.length !== csrf.length ||
          !timingSafeEqual(Buffer.from(token), Buffer.from(csrf)) || request.headers['content-type'] !== 'application/json')
        return json(response, 403, { error: 'Reload the page.' });
      let body = '';
      for await (const chunk of request) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 4096) return json(response, 413, { error: 'Input too long.' });
      }
      let input;
      try { input = JSON.parse(body); } catch { return json(response, 400, { error: 'Invalid input.' }); }
      if (input.onlyFP400 !== true) return json(response, 400, { error: 'Confirm that the code belongs to the FP400.' });
      if (!controllerReady()) return json(response, 503, { error: 'The controller is still starting.' });
      pairer.start(input.code);
      return json(response, 202, { started: true });
    } catch (error) {
      return json(response, 400, { error: errors[error.message] || 'That step failed. The regular Matter setup was not changed.' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}
