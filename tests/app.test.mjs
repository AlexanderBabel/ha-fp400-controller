import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCode, selectDevice, FP400_VENDOR, FP400_PRODUCT } from '../fp400_controller/server/pair.mjs';
import { createWizard } from '../fp400_controller/server/http.mjs';

const fp400 = { vendor_id: FP400_VENDOR, product_id: FP400_PRODUCT, long_discriminator: 0x234 };

test('pairing accepts only one FP400', () => {
  assert.equal(normalizeCode('3497-011-2332'), '34970112332');
  assert.throws(() => normalizeCode('abc'), /invalid_code/);
  const manual = { type: 'manual', short_discriminator: 0x2, setup_pin_code: 20202021 };
  assert.deepEqual(selectDevice(manual, [fp400]).filter, 0x234);
  assert.throws(() => selectDevice(manual, [fp400, { ...fp400 }]), /ambiguous_device/);
  assert.throws(() => selectDevice(manual, [{ ...fp400, vendor_id: 0x1234 }]), /wrong_device/);
  assert.throws(() => selectDevice(manual, []), /not_discovered/);
});

async function wizard(allow) {
  const started = [];
  const pairer = { state: { phase: 'idle' }, nodes: async () => [], start: code => started.push(code) };
  const server = createWizard({ pairer, controllerReady: () => true, allowAddress: () => allow });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, server, started };
}

test('web UI refuses anything but the ingress proxy', async () => {
  const { url, server } = await wizard(false);
  assert.equal((await fetch(`${url}/api/state`)).status, 403);
  server.close();
});

test('pairing needs the CSRF token and the confirmation', async () => {
  const { url, server, started } = await wizard(true);
  const { csrf, paired } = await (await fetch(`${url}/api/state`)).json();
  assert.equal(paired, false);
  const post = (headers, body) => fetch(`${url}/api/pair`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  assert.equal((await post({ 'X-FP400-Token': 'x'.repeat(64) }, { code: '1', onlyFP400: true })).status, 403);
  assert.equal((await post({ 'X-FP400-Token': csrf }, { code: '1' })).status, 400);
  assert.equal((await post({ 'X-FP400-Token': csrf }, { code: '34970112332', onlyFP400: true })).status, 202);
  assert.deepEqual(started, ['34970112332']);
  server.close();
});
