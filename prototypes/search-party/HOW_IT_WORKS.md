# Search Party

## What It Does

A small incremental game that is the site's 404 page: `app/not-found.tsx` renders this prototype's component for every missing address, so changes here change the 404 page too. You search a dark room by torchlight for a page that is never found, hire helpers to search for you, and turn up eight other lost things along the way. The scene is a Rive file that was drawn as SVG, imported and rigged through the Rive MCP, and is driven from React by data binding.

## Architecture

```
tap on the scene ─┐
100ms ticker ─────┼─► useGame (GameState, localStorage "search-party:game")
Hire buttons ─────┘        │
                           ├─► Scoreboard  (places checked, clues, rate, latest find)
                           ├─► HelperList  (cost, owned, Hire)
                           └─► Scene ──► Rive view model "Game"
                                          aim (number, degrees)   ◄── requestAnimationFrame loop in React
                                          find (number, 0 to 8)   ──► "Find" layer shows that object
                                          found, tap (triggers)   ──► "Mood" and "Tap" layers
                                          intern … satellite      ──► one layer each, hidden or in
                                                   │
                                     search-party.riv, artboard "Scene", state machine "Game"
```

The art pipeline, which only runs when the artwork changes:

```
art/build.mjs ──► art/svg/rive-scene.svg ──► Rive (upload_asset, addSvgInstance)
art/rig.mjs  ──► pivots, binds, timelines, state machine ──► export ──► search-party.riv
```

## Frontend

- **State** is one `GameState`: clues (spendable), places checked (lifetime), helpers owned and the save time. `useGame` loads it after mount, ticks it every 100ms, and saves every two seconds and on `pagehide`.
- **Away time** counts. On load the helpers are credited for the time the page was closed, capped at eight hours, so each new visit continues the game.
- **Rules** live in `game.ts` and run without React. Each tap checks one place and earns one clue. A helper costs 15% more per hire. Finds unlock on total places checked, and the page itself is not on the list.
- **Torch.** React owns the angle. A `requestAnimationFrame` loop eases it towards a target with exponential decay, so there is no overshoot. The target is a slow sweep when idle, the tapped point for 2.2 seconds after a tap, and the find spot for 3.2 seconds after a find. Rive binds the same number to the torch and to the beam's clip shape, so the light and the lit room turn together.
- **Lighting.** Every room object exists twice in the file, unlit and lit. The lit copy is clipped by the beam shape, so the beam reveals it.
- **Layout.** One centred column: the scene (44% of the screen height, kept at the artboard's aspect), the scoreboard, and the helper list, which scrolls inside the remaining space. The scene is a dark room in both themes; in light mode it reads as a dark window.
- **Input.** The whole scene is one button. A pointer tap aims the torch at that point. A keyboard press searches and lets the torch pick a spot. Hire buttons are 44px tall.
- **Reduced motion.** The torch does not sweep or ease, and the tap squash and find hop are not triggered. The file's ambient loop still runs: a blink, a 1.6% breath, the spider's sway and drifting dust.
- There is no API and no control panel, because the game has no tunable parameters.

### Rive file contract

- Artboard `Scene`, 390×380. State machine `Game`. View model `Game`, bound to the artboard.
- `aim`: number, degrees, zero points right and negative points up. Rive attached its own "Degrees to Radians" converter to the bind.
- `find`: number. 0 shows nothing, 1 to 8 show the find at that index in `FINDS`.
- `found`, `tap`: triggers.
- `intern`, `crawler`, `dog`, `detective`, `satellite`: booleans that bring each helper into the room.
- Layers: `Ambient` (one looping timeline), `Mood` (smile, wow, happy), `Tap`, `Find` (one state per find, entered from Any State), and one layer per helper.

### Working with the Rive MCP

- Rive Early Access serves the MCP at `http://localhost:9791/mcp` while the app is open with a file. It cannot create or open a file, so a person does that first.
- The editor is sandboxed, so uploads and exports travel as base64 inside the MCP call. `art/rive-client.mjs` does both.
- SVG import keeps group ids as layer names, gradients, group opacity and `clip-path`, which becomes a real clipping shape.
- Import puts each group's origin at the centre of its bounding box. `repivot` in `art/rig.mjs` moves the origin to a chosen point and shifts the children back.
- To rebuild: `node art/build.mjs`, then in a blank Rive file create a 390×380 artboard named `Scene`, upload and place `art/svg/rive-scene.svg`, create the `Game` view model with the properties above, and run `node art/rig.mjs pivots binds timelines machine names`. Export with `exportRiv` from `art/rive-client.mjs`.

## Key Dependencies

- `@rive-app/react-canvas` for the runtime. It fetches its WebAssembly file from a public CDN at first load.
- `@/components/ui/button` for the Hire buttons.

## Component Tree

```
SearchParty (page.tsx)
├── Scene        (button > canvas, Rive)
├── Scoreboard
└── HelperList
    └── Button × 5
```

## Error Handling

- localStorage reads and writes are wrapped in try/catch. `restore` rebuilds a saved game field by field, so a stale or hand-edited entry falls back to safe values.
- Until the saved game loads the page shows an empty game, so the layout does not jump.
- Every view model lookup is checked before use, so a file that lacks a property leaves that feature idle instead of throwing.
- If the Rive file or its WebAssembly fails to load, the scene stays blank and the game still plays through the scoreboard and Hire buttons.

## File Structure

- `page.tsx`: wires the game to the three components.
- `types.ts`: `GameState`, `Helper`, `Find`.
- `data.ts`: helpers, finds, tuning constants, and the Rive names and geometry.
- `game.ts`: the rules, pure.
- `aim.ts`: torch angle maths, pure.
- `use-game.ts`: state, ticking and saving.
- `scene.tsx`: the Rive canvas and the torch loop.
- `scoreboard.tsx`, `helper-list.tsx`: the interface under the scene.
- `search-party.riv`: the exported Rive file.
- `art/build.mjs`: draws all artwork as SVG into `art/svg/`.
- `art/rive-client.mjs`: MCP client for Rive, with upload and export.
- `art/rig.mjs`: pivots, binds, timelines and the state machine.
- `metadata.json`: gallery entry.
