# FP400 Controller (Home Assistant app)

A second Matter controller for one device: the **Aqara Spatial Multi-Sensor FP400**.

On firmware before 1.2.0.6 the FP400 refuses its vendor clusters (zones, regions, settings,
live positions) from a fabric with vendor ID 0x134B, the one the Home Assistant Matter Server
app commissions with. Home Assistant's Matter integration takes only one server, so this app
runs its own [matterjs-server](https://github.com/matter-js/matterjs-server) **1.6.0** on the
Matter test vendor ID 0xFFF1 and you add only the FP400 to it with *Share device*. Your other
Matter devices stay where they are.

It is meant for [RAR/ha-aqara-fp400](https://github.com/RAR/ha-aqara-fp400) 1.4.1 with a small
patch that lets it talk to this controller (`ws://127.0.0.1:5581/ws`). The patch comes from
[ckundel2008/fp400-card](https://github.com/ckundel2008/fp400-card), which this app is based on.

## Install

1. Settings → Apps → App store → ⋮ → Repositories → add
   `https://github.com/AlexanderBabel/ha-fp400-controller`.
2. Install **FP400 Controller** and start it. It builds locally, which takes a few minutes.
3. Matter → the FP400 → **Share device**, then paste the fresh code into the app's web UI.
4. Add the FP400 integration with controller address `ws://127.0.0.1:5581/ws`.

## What it does and doesn't do

- The Matter server listens on `127.0.0.1:5581` only. OTA and its dashboard are off.
- The web UI answers only Supervisor's ingress proxy and needs a CSRF token for pairing. Each
  pairing code must match exactly one advertising device with the FP400's vendor and product IDs.
- **Several FP400s** can be paired, one code at a time. Every node on this controller must be an
  FP400; pairing the same sensor twice is reported instead of counted. Each FP400 must already be
  in Home Assistant's Matter integration, which the integration uses to match it by serial.
- The Supervisor token is removed before the Matter server starts.
- No access to `/config`, the Home Assistant API or the Supervisor API beyond reading its own info.
- Its `/data` holds the pairing: keep it in your backups.

When Aqara's firmware 1.2.0.6 is on the sensor, HA's own Matter server should reach the vendor
clusters. Then clear the controller address in the integration, uninstall this app and remove
its fabric from the FP400.

## Tests

```bash
node --test tests/app.test.mjs
```

## License

MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
