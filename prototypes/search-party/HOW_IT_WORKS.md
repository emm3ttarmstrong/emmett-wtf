# Search Party

## What It Does

A small incremental game that is the site's 404 page: `app/not-found.tsx` renders this prototype's component for every missing address, so changes here change the 404 page too. You search a dark room by torchlight for a page that is never found. Clues hide in the dark as glints, a beam that passes over one collects it, and tapping sends the searcher walking with the torch swinging round. The scene is a Rive file that was drawn as SVG, imported and rigged through the Rive MCP, and is driven from React by data binding.

## Architecture

```
tap on the scene ──► tapWorld ─┐
                               ▼
requestAnimationFrame ──► stepWorld (world.ts) ──► clues gained, events
        │                      │
        │                      ▼
        │               Economy in a ref ──► React state 10×/s ──► Scoreboard, Shop
        │                      │                                    (Hire, Upgrade)
        │                      ▼
        └──────────► frameValues (paint.ts) ──► Rive view model "Game" ──► search-party.riv
                                                 ~70 numbers, 6 booleans, 6 triggers
                     localStorage "search-party:game" ◄── saved every 2s and on pagehide
```

The art pipeline, which only runs when the artwork changes:

```
geometry.json ──► art/build.mjs ──► art/svg/rive-scene.svg
                  art/rig.mjs: import ► pivots ► model ► binds ► timelines ► machine ► names ► export
                                                                                         └► search-party.riv
```

## Frontend

### The loop

- **Clues are the only currency.** They buy torch upgrades and helpers. The eight finds unlock on clues collected over the whole game, and the page itself is not on the list.
- **Glints.** Fourteen glints sit in the room. A light has to rest on a glint to find it: 0.4 seconds under the searcher's torch, 0.7 under a helper's. A glint swells and flickers while it is being found, fades back if the light moves on, and after it pops it comes back somewhere else three to nine seconds later. Sweeping past a row of glints finds none of them.
- **Tapping and dragging.** A tap sets a target, and holding and dragging keeps moving it. The searcher walks to stand 70px short of the target and the torch turns towards it. Both have a top speed and ease in to where they are going. The torch never passes straight down; going from one side to the other it swings over the top.
- **Facing.** The searcher turns round only once the torch is 12 degrees past straight up, so a target overhead can't make the facing flicker. The turn itself takes about a quarter of a second, with the hand sliding across so the beam never jumps.
- **Left alone,** the torch drifts four degrees either side of where it stopped. Five seconds after the last tap it stops paying its bonus and finds things as slowly as a helper's light.
- **Helpers** earn a small amount every second and also carry real lights that follow fixed paths and collect what they cross. The dog has no light and collects along the floor.
- **Only the searcher's torch** can rummage a stash (a marked spot on the cabinet, the boxes and the plant, ready again 40 seconds after use) and catch the mouse that runs along the skirting board every 25 to 45 seconds.
- **Value.** A helper-found glint pays one clue plus 40% of what the helpers earn per second. One found by a torch in use pays three times that, plus once more per Brighter bulb level, which is what keeps tapping ahead of waiting. A stash pays 12 torch glints after 0.8 seconds under the light, and the mouse pays 30 the moment it is caught.
- **Start over.** A button at the bottom of the shop erases clues, helpers and upgrades after one confirmation, and resets the room.
- **Away time.** Helpers' per-second earnings are credited for the time the page was closed, capped at eight hours.

### State

- `Economy` (clues, lifetime clues, helpers owned, upgrade levels, save time) is the saved game.
- `World` (the searcher, the glints, stash timers, the mouse) is not saved. A visit starts with a fresh room.
- Both live in a ref and advance every animation frame. The economy is copied into React state ten times a second for the interface. The room never advances more than 50ms in one frame, so a beam can't skip over a glint.
- All rules are pure functions in `game.ts`, `beams.ts` and `world.ts`, which run without React. Helper paths depend only on the clock, so the game logic and the drawing always agree.

### Layout and input

- One centred column: the scene (44% of the screen height, kept at the artboard's aspect), the scoreboard with a bar showing progress to the next find, and the shop, which scrolls inside the remaining space.
- The whole scene is one button. A pointer press targets that point and a drag keeps targeting. A keyboard press targets a random point.
- Shop buttons are 44px tall and disabled when a purchase is not affordable.
- The scene is a dark room in both themes; in light mode it reads as a dark window.
- **Reduced motion.** The beams and the walk still move, because they are the game. The decorative reactions (tap squash, find hop, object shake) are not triggered. The file's ambient loop still runs.
- There is no API and no control panel. The tuning constants are in `data.ts`.

### Rive file contract

- Artboard `Scene`, 390×380. State machine `Game`. View model `Game`, bound to the artboard. `art/rig.mjs` holds the full property list.
- Angles are in degrees (Rive attaches its own "Degrees to Radians" converter). Scales are percentages, so a mirrored sprite is `-100`.
- Searcher: `heroX`, `facing`, `aim` (the torch inside the searcher's own space), `walking`. Beam clip: `beamX`, `beamAngle`, `beamWide`.
- Helpers: a boolean each (`intern`, `crawler`, `dog`, `detective`, `satellite`), plus `<name>X`, `<name>BeamX` and `<name>Aim`, and `dogX` and `dogDir`. A helper that isn't hired has its light parked far off the artboard.
- Glints: `g0x`, `g0y`, `g0s` to `g13…`. Stashes: `stash0` to `stash2`. Mouse: `mouseX`, `mouseDir`. Finds: `find` from 0 to 8.
- Triggers: `tap`, `found`, `burst` (placed by `burstX` and `burstY`), `shake0` to `shake2`.
- Every room object exists twice, unlit and lit. The lit copy is clipped by one shape that holds all five beam cones, so every light reveals it.

### Working with the Rive MCP

- Rive Early Access serves the MCP at `http://localhost:9791/mcp` while the app is open with a file. It cannot create or open a file, so a person does that first.
- The editor is sandboxed, so uploads and exports travel as base64 inside the MCP call. `art/rive-client.mjs` does both.
- SVG import keeps group ids as layer names, gradients, group opacity and `clip-path`, which becomes a real clipping shape. Several paths in one `clipPath` become one shape with a movable node per path.
- Import puts each group's origin at the centre of its bounding box. `repivot` in `art/rig.mjs` moves the origin to a chosen point and shifts the children back.
- Rive's computed world positions are empty until the editor has drawn a frame, which it may not do in the background. `repivot` works positions out from the layer hierarchy instead.
- To rebuild after changing the art: `node art/build.mjs`, then with a Rive file open that has the `Game` view model, `node art/rig.mjs import pivots model binds timelines machine names export`.

## Key Dependencies

- `@rive-app/react-canvas` for the runtime. It fetches its WebAssembly file from a public CDN at first load.
- `@/components/ui/button` for the shop buttons.

## Component Tree

```
SearchParty (page.tsx)
├── Scene        (button > canvas, Rive)
├── Scoreboard
└── Shop
    ├── Section "Your torch" > Row × 3
    └── Section "Help" > Row × 5
```

## Error Handling

- localStorage reads and writes are wrapped in try/catch. `restore` rebuilds a saved game field by field, so a stale or hand-edited entry, or a save from the first version, falls back to safe values.
- Every view model lookup is checked before use, so a file that lacks a property leaves that feature idle instead of throwing.
- If the Rive file or its WebAssembly fails to load, the scene stays blank. The helpers still earn and the shop still works, but glints can't be seen.

## File Structure

- `page.tsx`: wires the game to the three components.
- `types.ts`: `Economy`, `World`, `Beam`, `Glint` and the rest.
- `data.ts`: helpers, upgrades, finds, tuning constants and the Rive names.
- `geometry.json`: positions and beam sizes, shared by the game and the art generator.
- `game.ts`: the economy rules, pure.
- `beams.ts`: beam geometry and the helpers' paths, pure.
- `world.ts`: the room simulation, pure.
- `paint.ts`: turns a moment of the game into view model values, pure.
- `use-game.ts`: the animation-frame loop, saving, and the actions.
- `scene.tsx`: the Rive canvas, and the writes into its view model.
- `scoreboard.tsx`, `shop.tsx`: the interface under the scene.
- `search-party.riv`: the exported Rive file.
- `art/build.mjs`: draws all artwork as SVG into `art/svg/`.
- `art/rive-client.mjs`: MCP client for Rive, with upload and export.
- `art/rig.mjs`: import, pivots, view model, binds, timelines and the state machine.
- `metadata.json`: gallery entry.
