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
                                                 ~215 numbers, 6 booleans, 9 triggers
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

- **Clues are the only currency.** They buy everything in the shop. The eight finds unlock on clues collected over the whole game, and the page itself is not on the list.
- **The room** is 1170 wide and 380 tall, three screens' worth on a phone: a filing cabinet, boxes with a cat, a window, a bookcase, a desk with an old monitor and a phone, a door marked 404, a ladder and crates.
- **Glints.** Thirty-six glints sit on the walls. A light has to rest on a glint to find it: 0.4 seconds under the searcher's torch (less with a Stronger bulb), 0.7 under any other light. Its glow grows steadily while it is being found and fades back if the light moves on. After it pops it comes back somewhere else four to ten seconds later.
- **Tapping and dragging.** A tap sets a target, and holding and dragging keeps moving it. The searcher only walks when the target is more than 150px away, and stops 150px short of it. The torch turns towards the target. Both have a top speed and ease in to where they are going. The torch never passes straight down.
- **The beam** is a wedge that starts at the torch lens, 19px out from the hand. It is 14px wide either side there, so things close to the searcher are still easy to light, and 88px either side at its far end, 380px away.
- **Facing.** Which way the searcher faces is judged from the body, not the hand, and only changes for a target at least 12 degrees to the other side of straight up. Turning round is instant and mirrors the torch with it. (Judging from the hand made a target overhead flip the facing forever, because the hand changes sides on every flip.)
- **Left alone,** the torch drifts four degrees either side of where it stopped. Five seconds after the last tap it stops paying its bonus and finds things as slowly as any other light.
- **Value.** A glint found by any other light pays one clue plus half of what the crew earns per second. One found by a torch in use pays three times that, plus once more per Stronger bulb level. The scoreboard shows both numbers, "+N a find" and "+N/s".
- **Pace.** In a simulation, a player who always lights the nearest glint and buys the cheapest thing reaches the last find in about 11 minutes; one who only shops takes about 94.
- **A find** appears on the floor beside wherever the searcher is standing.
- **Away time.** The crew's per-second earnings are credited for the time the page was closed, capped at eight hours.
- **Start over.** A button at the bottom of the shop erases everything after one confirmation, and resets the room.

### The shop

Everything is bought one level at a time, and every level changes the picture.

- **Your torch.** Wider lens (wider beam), Longer reach (longer beam, and a faster walk), Stronger bulb (a visibly brighter beam that finds faster and pays more), Headlamp (a second small light on the hood, pointing wherever the searcher faces), Lantern (a pool of light around the searcher).
- **Crew.** Each helper is hired once and then levelled up. A level doubles what it earns per second and makes its light 20% bigger. The intern, robot, detective and satellite carry lights. The dog has none: it finds what is low on the wall above its nose, and runs down the mouse on its own. The detective's light also rummages stashes.
- **The room.** Fix a bulb (three levels, each lighting the floor under one ceiling bulb for good), Befriend the cat (it gets a collar and finds what is near its box), Open the curtains (a moonbeam that swings slowly across the floor).

### Events

- **Stashes.** Six marked spots (cabinet, boxes, bookcase, desk, crates, plant) pay 12 glints after 0.8 seconds under the torch or the detective's light, shake their object, and are ready again 40 seconds later.
- **The mouse** runs the skirting board every 25 to 45 seconds. Any light catches it for 15 glints, and so does the dog.
- Every 30 to 50 seconds one of these happens, and the scoreboard says so for four seconds:
  - **Lightning.** The whole room is lit for two quick flashes and every glint gets a 60% head start.
  - **The cat knocks something over.** Six glints spill out beside its box.
  - **A moth** flies to the far end of the searcher's beam. Hold the beam on it for 1.2 seconds for 20 glints.
  - **The phone rings** for seven seconds. Any light on it pays 25 glints.
  - **A draught.** Five loose sheets blow across from the door, each worth 4 glints to any light.
  - **"The page!"** Rarely, one large sheet drifts across. Only the searcher's torch catches it, for 40 glints, and it turns out to be something else.

### State

- `Economy` (clues, lifetime clues, a level for every shop item, save time) is the saved game.
- `World` (the searcher, the glints, stash timers, the mouse, the dog and whatever event is running) is not saved. A visit starts with a fresh room.
- Both live in a ref and advance every animation frame. The economy is copied into React state ten times a second for the interface. The room never advances more than 50ms in one frame, so a beam can't skip over a glint.
- All rules are pure functions in `game.ts`, `beams.ts` and `world.ts`, which run without React. Helper paths depend only on the clock, so the game logic and the drawing always agree.

### Layout and input

- The scene spans the full width of the page at 44% of the screen height. Under it, one centred column holds the scoreboard, with a bar showing progress to the next find, and the shop, which scrolls inside the remaining space.
- **Camera.** The canvas is always the whole room at the height of the frame. When the frame is wider than the room, the room is centred. When it is narrower, the room slides sideways with a CSS transform so the searcher stays in the middle, easing after them and stopping at the walls. Pointer positions are measured against the room, so they stay right wherever the camera is.
- The whole scene is one button. A pointer press targets that point and a drag keeps targeting. A keyboard press targets a random point.
- Shop buttons are 44px tall and disabled when a purchase is not affordable.
- The scene is a dark room in both themes; in light mode it reads as a dark window.
- **Reduced motion.** The beams and the walk still move, because they are the game. The camera snaps instead of easing, and the decorative reactions (tap squash, find hop, object shake) are not triggered. The file's ambient loop still runs.
- There is no API and no control panel. The tuning constants are in `data.ts`.

### Rive file contract

- Artboard `Scene`, 1170×380. State machine `Game`. View model `Game`, bound to the artboard. `art/rig.mjs` holds the full property list.
- Angles are in degrees (Rive attaches its own "Degrees to Radians" converter). Scales are percentages, so a mirrored sprite is `-100` and a hidden one is `0`. Opacity is 0 to 1.
- Searcher: `heroX`, `facing`, `aim` (the torch inside the searcher's own space), `walking`. Beam: `beamX`, `beamAngle`, `beamWide`, `beamLong`, `beamBright`. Headlamp: `headX`, `headAim`, `headSize`. Lantern: `lantern`.
- Room lights: `bulb0` to `bulb2`, `moon`, `moonAim`. Lightning slides a room-sized clip into view with `flashX`.
- Helpers: a boolean each (`intern`, `crawler`, `dog`, `detective`, `satellite`), plus `<name>X`, `<name>BeamX`, `<name>Aim` and `<name>Size`, and `dogX` and `dogDir`. A helper that isn't hired has its light parked far off the artboard.
- Glints: `g0x`, `g0y`, `g0s` (size) and `g0c` (glow) to `g35…`. Stashes: `stash0` and `stash0c` to `stash5…`. Mouse: `mouseX`, `mouseDir`. Finds: `find` from 0 to 8, placed by `findX`.
- Event sprites: `mothX`, `mothY`; `alertX`, `alertY`, `alertS` (the ringing phone); `p0x`, `p0y`, `p0s` to `p4…` (loose sheets); `catCollar`.
- Triggers: `tap`, `found`, `burst` (placed by `burstX` and `burstY`), `shake0` to `shake5`.
- Every room object exists twice, unlit and lit. The lit copy is clipped by one shape that holds every light: the torch, four crew wedges, three bulbs, the moon, the headlamp, the lantern disc and the lightning rectangle, so every light reveals it.

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
    ├── "Your torch" > Row × 5
    ├── "Crew" > Row × 5
    ├── "The room" > Row × 3
    └── StartOver
```

## Error Handling

- localStorage reads and writes are wrapped in try/catch. `restore` rebuilds a saved game field by field, so a stale or hand-edited entry, or a save from the first version, falls back to safe values.
- Every view model lookup is checked before use, so a file that lacks a property leaves that feature idle instead of throwing.
- If the Rive file or its WebAssembly fails to load, the scene stays blank. The helpers still earn and the shop still works, but glints can't be seen.

## File Structure

- `page.tsx`: wires the game to the three components.
- `types.ts`: `Economy`, `World`, `Beam`, `Glint` and the rest.
- `data.ts`: the shop items, finds, tuning constants and the Rive names.
- `geometry.json`: positions and beam sizes, shared by the game and the art generator.
- `game.ts`: the economy rules, pure.
- `beams.ts`: beam geometry and the helpers' paths, pure.
- `world.ts`: the room simulation and the events, pure.
- `paint.ts`: turns a moment of the game into view model values, pure.
- `use-game.ts`: the animation-frame loop, saving, and the actions.
- `scene.tsx`: the Rive canvas, and the writes into its view model.
- `scoreboard.tsx`, `shop.tsx`: the interface under the scene.
- `search-party.riv`: the exported Rive file.
- `art/build.mjs`: draws all artwork as SVG into `art/svg/`.
- `art/rive-client.mjs`: MCP client for Rive, with upload and export.
- `art/rig.mjs`: import, pivots, view model, binds, timelines and the state machine.
- `metadata.json`: gallery entry.
