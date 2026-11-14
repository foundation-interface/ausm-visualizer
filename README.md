# ausm visualizer

every [ausm](https://github.com/foundation-interface/ausm) sensor on one live timeline, with the materials you open and the tasks it detects.

- **timeline**: windows, typing, selection, clipboard, screenshots, cursor and materials, one track each. tasks appear as they're recognized
- **screen**: a live preview of your displays
- **overlay**: draws the focused window, the field you're typing in and your selection right on screen

it runs from the menu bar. open the timeline or the overlay from its icon.

## run

needs macos and node 18+.

this is an internal test version. ausm isn't on npm yet, so download and build it locally first, next to this repo:

```sh
git clone https://github.com/foundation-interface/ausm
(cd ausm && npm install && npm run build)
```

then:

```sh
git clone https://github.com/foundation-interface/ausm-visualizer && cd ausm-visualizer
npm install
npm start
```

`npm install` links your local ausm: `AUSM_ROOT` if set, otherwise a checkout next to this one (`../ausm`). without one, the install fails.

macos gives permissions to the app you start this from (terminal, iterm…). give that app **accessibility** and **screen recording** in system settings → privacy & security, quit it and run again.

- **tasks** need a model: put `CEREBRAS_API_KEY=...` in a `.env` here
- **materials** need ausm's python helpers (see ausm's setup)
- **camera**: set `AUSM_VISUALIZER_CAMERA=1`

everything stays on your mac.

## develop

```sh
npm run dev   # hot reload for both windows
```

- `app/runtime.ts`: the ausm config. start here to turn sensors on or off
- `app/timeline/`, `app/overlay/`: the two windows
