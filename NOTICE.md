# Origin

- `fp400_controller/server/pair.mjs`, `rpc.mjs`, `style.css`, and the structure of `launch.mjs`,
  `http.mjs` and `health.mjs` come from [ckundel2008/fp400-card](https://github.com/ckundel2008/fp400-card)
  (`fp400_setup`, app 0.2.2, commit d162da8), MIT. Changes: no integration installer and no
  `/config` mapping, no migration mode, English UI, matterjs-server 1.6.0.
- The image is [matterjs-server](https://github.com/matter-js/matterjs-server) 1.6.0 (Apache-2.0),
  pulled from ghcr.io by digest at build time; it is not included here.
