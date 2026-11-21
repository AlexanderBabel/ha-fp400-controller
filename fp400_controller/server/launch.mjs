import fs from 'node:fs/promises';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { Pairer } from './pair.mjs';
import { rpc } from './rpc.mjs';
import { createWizard } from './http.mjs';

async function freePort(port) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', resolve);
  });
  await new Promise(resolve => probe.close(resolve));
}

try {
  const reply = await fetch('http://supervisor/addons/self/info', {
    headers: { Authorization: `Bearer ${process.env.SUPERVISOR_TOKEN}` }, signal: AbortSignal.timeout(10000),
  });
  if (!reply.ok) throw new Error('Supervisor not reachable');
  const { data } = await reply.json();
  if (!Number.isInteger(data.ingress_port) || data.ingress_port < 62000 || data.ingress_port > 65500)
    throw new Error('No valid ingress port');
  await freePort(5581);
  const options = JSON.parse(await fs.readFile('/data/options.json', 'utf8'));
  const network = options.network_interface || '';
  if (network && !/^[a-zA-Z0-9_.:-]{1,40}$/.test(network)) throw new Error('Invalid network interface');
  await fs.mkdir('/data/matter', { recursive: true, mode: 0o700 });
  let ready = false;
  // The Matter server never gets the Supervisor token.
  const env = { ...process.env, ...(network ? { PRIMARY_INTERFACE: network } : {}) };
  delete env.SUPERVISOR_TOKEN;
  delete env.HASSIO_TOKEN;
  const controller = spawn(process.execPath, ['/app/node_modules/matter-server/dist/esm/MatterServer.js'], {
    env, stdio: ['ignore', 'inherit', 'inherit'],
  });
  const pairer = new Pairer(rpc);
  const wizard = createWizard({ pairer, controllerReady: () => ready, appVersion: data.version ?? null });
  await new Promise((resolve, reject) => {
    wizard.once('error', reject);
    wizard.listen(data.ingress_port, '172.30.32.1', resolve);
  });
  const check = setInterval(async () => {
    try { ready = Number((await rpc('server_info', {}, 4000)).fabric_id) === 400; }
    catch { ready = false; }
  }, 5000);
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    clearInterval(check);
    wizard.close();
    controller.kill('SIGTERM');
    setTimeout(() => { controller.kill('SIGKILL'); process.exit(1); }, 50000).unref();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  controller.on('error', () => { console.error('FP400 controller failed to start.'); stop(); });
  controller.on('exit', code => { clearInterval(check); wizard.close(); process.exit(stopping ? 0 : code || 1); });
  console.log('FP400 Controller started. Open its web UI in Home Assistant.');
} catch (error) {
  console.error(error.code === 'EADDRINUSE'
    ? 'Port 5581 is in use. Is another FP400 controller running? Do not touch the regular Matter Server.'
    : `Start failed: ${error.message}`);
  process.exit(1);
}
