# ausm visualizer

every [ausm](https://github.com/foundation-interface/ausm) sensor on one live timeline, with the materials you open and the tasks it detects.

- **timeline**: windows, typing, selection, clipboard, screenshots, cursor and materials, one track each. tasks appear as they're recognized
- **screen**: a live preview of your displays
- **overlay**: draws the focused window, the field you're typing in and your selection right on screen

it runs from the menu bar. open the timeline or the overlay from its icon.

## run

needs macos and node 18+.

```sh
git clone https://github.com/foundation-interface/ausm-visualizer && cd ausm-visualizer
npm install
npm start
```

`npm install` gets ausm from npm, as [`@ausm/ausm`](https://www.npmjs.com/package/@ausm/ausm). its native helpers ship prebuilt, so there is no swift or xcode step.

macos gives permissions to the app you start this from (terminal, iterm…). give that app **accessibility** and **screen recording** in system settings → privacy & security, quit it and run again.

- **tasks** need a model: put `CEREBRAS_API_KEY=...` in a `.env` here
- **materials** need python 3.9+ and a few packages. without them the material track stays empty:

  ```sh
  python3 -m venv .venv
  .venv/bin/pip install -r node_modules/@ausm/device-macos-material-manager/py/requirements.txt -r node_modules/@ausm/core/src/memory/py/requirements.txt
  ```
- **camera**: set `AUSM_VISUALIZER_CAMERA=1`

everything stays on your mac, with one exception: with a task model set, the focused window's latest frame and your recent events go to that model.

## develop

```sh
npm run dev   # hot reload for both windows
```

- `app/runtime.ts`: the ausm config. start here to turn sensors on or off
- to run against a local ausm checkout instead of npm, build it and install with `AUSM_ROOT=../ausm npm install`
- `app/timeline/`, `app/overlay/`: the two windows
