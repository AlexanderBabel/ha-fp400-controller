let token = '', state, pairing = false;
const byId = id => document.getElementById(id);
const messages = {
  idle: 'Not paired yet.', checking: 'Checking for an existing pairing …',
  discovering: 'Looking for the shared FP400 on the network …',
  pairing: 'Pairing. This can take a few minutes.',
  paired: 'The FP400 is paired.',
  invalid_code: 'That code is not valid. Create a new one with Share device and paste all of it.',
  one_device_only: 'Use the code of one FP400 only.',
  wrong_device: 'The device found is not an FP400. Nothing was paired.',
  not_discovered: 'No matching FP400 found. Open a new sharing window and try again.',
  ambiguous_device: 'Several devices match the code. Close other sharing windows and create a new code.',
  unexpected_controller_device: 'This controller holds another device. Stopped; nothing was removed.',
  verification_pending: 'Not confirmed yet. Wait a moment before using a new code.',
  pairing_failed: 'Pairing not confirmed. Wait a minute; if the FP400 still does not show as paired, create a new code.',
  pairing_uncertain: 'The attempt did not clearly finish. Wait a minute, then restart only this app before trying again.',
};
const yesNo = value => value === true ? 'Yes' : value === false ? 'No' : 'Unknown';
function updateButton() {
  byId('pair').disabled = !state?.controller || state?.paired !== false || pairing ||
    state?.pairing.phase === 'uncertain' || !byId('only-fp400').checked || !byId('code').value.trim();
}
async function refresh() {
  try {
    const reply = await fetch('api/state', { cache: 'no-store' });
    if (!reply.ok) throw new Error();
    state = await reply.json(); token = state.csrf;
    pairing = ['checking', 'discovering', 'pairing'].includes(state.pairing.phase);
    byId('connection').textContent = state.controller ? 'Controller ready · regular Matter Server untouched' : 'Controller not ready yet. Give it a minute after the first start.';
    byId('controller-state').textContent = state.controller ? 'Ready' : 'Not ready';
    byId('saved-state').textContent = yesNo(state.paired);
    byId('sensor-state').textContent = yesNo(state.available);
    byId('app-version').textContent = state.appVersion || 'Unknown';
    byId('pair-section').hidden = state.paired === true;
    byId('pair-state').textContent = messages[state.pairing.error || state.pairing.phase] || '';
    byId('pair-state').className = ['error', 'uncertain'].includes(state.pairing.phase) ? 'error' : '';
  } catch {
    state = undefined;
    byId('connection').textContent = 'The app is not reachable. Reopen its web UI.';
  }
  updateButton();
}
byId('only-fp400').addEventListener('change', updateButton);
byId('code').addEventListener('input', updateButton);
byId('pair-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (byId('pair').disabled) return;
  pairing = true; updateButton();
  try {
    const response = await fetch('api/pair', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FP400-Token': token },
      body: JSON.stringify({ code: byId('code').value, onlyFP400: byId('only-fp400').checked }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Pairing failed to start.');
    byId('code').value = ''; // never keep the pairing code in the page
  } catch (error) { byId('pair-state').textContent = error.message; }
  await refresh();
});
refresh();
setInterval(refresh, 5000);
