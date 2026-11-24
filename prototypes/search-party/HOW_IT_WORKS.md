# Search Party

## What It Does

A small incremental game that is the site's 404 page: `app/not-found.tsx` renders this prototype's component for every missing address, so changes here change the 404 page too. A searcher ambles through an endless loop of dark rooms looking for a page that is never found. Clues hide in the dark as glints, a light that rests on one finds it, and tapping points the torch. Left alone it plays like a screensaver. The scene is a Rive file that was drawn as SVG, imported and rigged through the Rive MCP, and is driven from React by data binding.

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
                                                 ~200 numbers, 12 booleans, 3 triggers
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
- **The walk** is an endless loop of eight places, each 390 wide: an office, a study, the 404 door, an archive, a server room, a break room, a corridor and a print room. The view is 1170 wide, so a wide screen shows three places and a phone shows a little over one.
- **Status doors.** Each door carries a code and its own joke, visible only when lit: 404, a roped-off 403, a 500 with smoke under it, a 418 with a teapot outside, a padlocked 401, and a 503 with a "back soon" note. Other things to notice in the dark: a missing-cat poster, a lost-property box, a glove on a radiator, a jammed printer, a fish tank with a sunken temple, and someone asleep at a desk.
- **Depth.** Three layers move at different speeds: a skyline that slides slowly behind the windows (0.35 of the walking speed), the rooms themselves, and a few dark shapes along the top and bottom edges close to the camera (1.5 times).
- **What the device shows.** A phone shows only the middle of the view. The scene tells the game which slice is on screen, and glints, the mouse and every event appear inside it, so nothing happens out of sight.
- **Glints.** Twenty-four glints sit on the walls ahead of the searcher, on screen or just beyond. One that slides out of sight behind is replaced by a new one ahead, so walking keeps bringing more.
- **Finding.** A light has to rest on a glint to find it: 0.4 seconds under the searcher's torch, less with a Stronger bulb. Its glow grows steadily while it is being found and fades back if the light moves on.
- **Other lights help the torch, they don't race it.** While the torch is in use (a tap or drag in the last five seconds, or a finger held down), every other light and both pets only give glints a head start, up to 70%, and the torch finishes them at its full rate. Once nobody is playing, any light finds glints by resting on them for 0.7 seconds, at the lower rate, so the game still moves when it is only being watched.
- **Walking.** Left alone the searcher ambles forward at 16px a second. A tap more than 150px ahead makes them hurry at 130px a second until it is in reach. A tap within reach, or behind, makes them stop and look at it, and a little over a second after the torch settles they amble on.
- **Tapping, dragging and holding.** A tap sets what the torch points at, dragging keeps moving it, and a finger held still keeps it there. The torch turns at a limited speed and eases in. It never passes straight down.
- **The beam** is a wedge that starts at the torch lens, 19px out from the hand. It is 14px wide either side there, so things close to the searcher are still easy to light, and 88px either side at its far end, 380px away.
- **Facing.** Which way the searcher faces is judged from the body, not the hand, and only changes for a target at least 12 degrees to the other side of straight up. Turning round to look is instant and mirrors the torch with it. Afterwards the torch swings back over the top, and the searcher turns to face forward as it crosses.
- **Value.** A glint pays one clue plus half of what the crew and pets earn per second. Found by the torch in use, it pays three times that, plus once more per Stronger bulb level. The scoreboard shows both numbers, "+N a find" and "+N/s".
- **Pace.** In a simulation on a phone-sized window, a player who always lights the nearest glint and buys the cheapest thing reaches the last find in about 22 minutes; one who only shops takes about 70. At that point about 5.6M of the shop is still unsold, which is the last two satellite levels.
- **A find** appears on the floor beside the searcher and is left behind as the walk goes on.
- **Away time.** The crew's per-second earnings are credited for the time the page was closed or hidden, capped at eight hours.
- **Start over.** A button at the bottom of the shop erases everything after one confirmation, and resets the walk.

### The shop

Nine rows, each with one job. Everything is bought one level at a time, and every level changes the picture.

- **Your torch.** Wider lens (a wider beam, five levels) and Stronger bulb (a visibly brighter beam that finds faster and pays more, six levels).
- **Crew**, hired once and then levelled up to five. A level doubles what a helper earns per second and makes their light 15% bigger. The intern carries a phone light, the robot scans the wall ahead, the detective's light also rummages stashes, and the satellite throws a wide light from above.
- **Pets**, the same way. The cat gives a head start to whatever is low on the wall near it, over a wider stretch with each level. The dog does the same above its nose and runs down the mouse.
- **The rooms.** Fix the bulbs (three levels: two, then four, then all five ceiling bulbs along the loop work). A working bulb throws a short, soft cone that gives glints under it a head start.

### The party

- Everyone walks with the searcher in world space. The cat, dog, detective and intern follow in a line behind, the robot scuttles ahead, and the satellite drifts overhead.
- Each keeps a set distance from the searcher, walks at up to 150px a second to keep it, faces the way it moves, and steps while it moves: legs swing on the intern, detective, dog and cat, and the robot bobs.
- The dog breaks away to chase the mouse and comes back to heel.

### Events

- **Stashes.** Every place has two marked spots. One pays 12 glints after 0.8 seconds under the torch or the detective's light, and is ready again 40 seconds later.
- **The mouse** runs across what the device shows, along the skirting board, every 25 to 45 seconds. The torch catches it for 15 glints, and so does the dog.
- Every 30 to 50 seconds one of these happens, and the scoreboard says so. Lines queue, so one never wipes out another.
  - **Lightning.** The view is lit for two quick flashes and every glint on screen is found.
  - **The cat knocks something over.** Up to six glints spill out beside the office cat's box, taken from ones that were off screen or waiting to come back. This only happens while the box is fully on screen.
  - **A moth** flies to the far end of the searcher's beam. Holding the beam on it for 1.2 seconds pays 20 glints. A torch nobody is pointing still catches it after four seconds.
  - **The phone rings** for seven seconds. Only the searcher's torch answers it, for 25 glints. This only happens while a desk phone is on screen.
  - **A draught.** Five loose sheets blow in from the right edge of the screen, each worth 4 glints to any light.
  - **"The page!"** Rarely, one large sheet drifts across. Only the searcher's torch catches it, for 40 glints, and it turns out to be something else.

### State

- `Economy` (clues, lifetime clues, a level for every shop item, save time) is the saved game.
- `World` (how far the walk has gone, which slice the device shows, the searcher, the party, the glints, stash timers, the mouse and whatever event is running) is not saved. Everything in it is in world space, where x keeps growing as the searcher walks. A visit starts with a fresh room.
- Both live in a ref and advance every animation frame. The economy is copied into React state ten times a second for the interface. The room never advances more than 50ms in one frame, so a beam can't skip over a glint.
- All rules are pure functions in `game.ts`, `beams.ts` and `world.ts`, which run without React. Helper paths depend only on the clock, so the game logic and the drawing always agree.

### Layout and input

- The scene spans the full width of the page at 44% of the screen height. Under it, one centred column holds the scoreboard, with a bar showing progress to the next find, and the shop, which scrolls inside the remaining space.
- **Camera.** The Rive artboard is one view of the walk, 1170 wide, and the searcher stays near its middle. The game keeps a camera position that eases after the searcher, and everything is drawn at its world position minus the camera. The canvas is always the whole view at the height of the frame, centred, so a wide screen shows all of it and a narrow one shows the middle.
- **The loop.** Each of the eight places is one group in the Rive file, in three copies (unlit, lit, and a top layer for eyes and lights that glow). Every frame the game slides each to wherever its nearest turn in the loop is. Ceiling lights, the moonbeam and stash markers are small pools that the game moves to whichever bulbs, window and stashes are in view.
- The whole scene is one button. A pointer press targets that point and a drag keeps targeting. A keyboard press targets a random point.
- Shop buttons are 44px tall and disabled when a purchase is not affordable.
- The scene is a dark room in both themes; in light mode it reads as a dark window.
- **Reduced motion.** The beams and the walk still move, because they are the game. The camera follows without easing, and the decorative reactions (tap squash, find hop) are not triggered. The file's ambient loop still runs.
- There is no API and no control panel. The tuning constants are in `data.ts`.

### Rive file contract

- Artboard `Scene`, 1170×380: one view of the walk. State machine `Game`. View model `Game`, bound to the artboard. `art/rig.mjs` holds the full property list.
- Angles are in degrees (Rive attaches its own "Degrees to Radians" converter). Scales are percentages, so a mirrored sprite is `-100` and a hidden one is `0`. Opacity is 0 to 1.
- Searcher: `heroX`, `facing`, `aim` (the torch inside the searcher's own space), `walking`. Beam: `beamX`, `beamAngle`, `beamWide`, `beamLong`, `beamBright`.
- Places and layers: `seg0x` to `seg7x` (the left edge of each place on screen), `skyAx`, `skyBx`, `foreAx`, `foreBx`.
- Room lights: `bulb0` and `bulb0x` to `bulb3…`. Lightning slides a room-sized clip into view with `flashX`.
- The party: a boolean each (`intern`, `crawler`, `detective`, `satellite`, `dog`, `cat`) and `<name>X`. Those on the ground also have `<name>Dir` and a `<name>Walking` boolean. Those with lights also have `<name>BeamX`, `<name>Aim` and `<name>Size`. A helper that isn't hired has its light parked far off the artboard.
- Glints: `g0x`, `g0y`, `g0s` (size) and `g0c` (glow) to `g23…`. Stashes: `stash0x`, `stash0y`, `stash0` and `stash0c` to `stash7…`. Mouse: `mouseX`, `mouseDir`. Finds: `find` from 0 to 8, placed by `findX`.
- Event sprites: `mothX`, `mothY`; `alertX`, `alertY`, `alertS` (the ringing phone); `p0x`, `p0y`, `p0s` to `p4…` (loose sheets).
- Triggers: `tap`, `found`, `burst` (placed by `burstX` and `burstY`).
- Every room object exists twice, unlit and lit. The lit copy is clipped by one shape that holds every light: the torch, four crew wedges, four pooled bulbs and the lightning rectangle. The skyline is clipped by a second shape, the glass of the windows, which slides with them, so every light reveals it.

### Working with the Rive MCP

- Rive Early Access serves the MCP at `http://localhost:9791/mcp` while the app is open with a file. It cannot create or open a file, so a person does that first.
- The editor is sandboxed, so uploads and exports travel as base64 inside the MCP call. `art/rive-client.mjs` does both.
- SVG import keeps group ids as layer names, gradients, group opacity and `clip-path`, which becomes a real clipping shape. Several paths in one `clipPath` become one shape with a movable node per path.
- Import puts each group's origin at the centre of its bounding box. `repivot` in `art/rig.mjs` moves the origin to a chosen point and shifts the children back.
- A bound x is measured from the parent's origin, and import puts a container's origin at the middle of its contents. The rig moves the containers that hold sliding things to the artboard's corner, so a bound x is a place on screen.
- The view model cannot be pruned through the MCP, so it still holds properties from earlier versions that nothing reads (the headlamp, lantern, moonbeam and shake triggers).
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
    ├── "Your torch" > Row × 2
    ├── "Crew" > Row × 4
    ├── "Pets" > Row × 2
    ├── "The rooms" > Row × 1
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
