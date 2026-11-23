# Sample

## What It Does

The worked example that new prototypes copy. It draws a hypotrochoid, the curve a pen makes when a gear rolls inside a toothed ring, and uses every part of the shared control panel: sections, each control type, the pan-and-zoom stage, image export and share links.

## Architecture

```
control panel ──► useControls (state, localStorage "sample:controls", share link "#c=…")
                        │ values
                        ▼
      Stage (pan, zoom) └► Drawing ──► curve() ──► toPath() ──► <svg><path/></svg>
                                                                    │
                              "Save image" ──► saveSvgAsPng ◄───────┘
```

## Frontend

- State is the control values only, held by `useControls`. They load after mount from a share link's hash if there is one, otherwise from localStorage.
- The drawing is an SVG that uses `currentColor`. With Ink on "auto" that is the `text-foreground` token, so light and dark mode both work. Picking an ink sets the colour inline.
- The backdrop image stays in memory. It is not saved, and it is not part of a shared link.
- Each change remounts the paths (the path data is part of the React key), which restarts the draw animation. The animation is a `stroke-dashoffset` keyframe and only runs under `motion-safe`.
- The stage pans on drag or scroll and zooms on pinch or ctrl-scroll. The buttons in its corner zoom and reset.
- "Save image" writes a 2048px PNG of the drawing on the page's background colour.
- From `lg` up the controls sit in a column on the right. Below that they open as a bottom sheet from the button in the corner.
- There are no keyboard shortcuts and no API.

## Key Dependencies

- `@/components/control-panel` for the panel, the stage, persistence, export and share links.

## Component Tree

```
Sample (page.tsx)
└── ControlPanel
    └── Stage
        └── Drawing
```

## Error Handling

- localStorage reads and writes are wrapped in try/catch inside `useControls`, and saved or shared values are checked against the schema before use.
- `curve()` clamps the gear to be smaller than the ring, so any control values produce a finite path.
- An image that fails to load is ignored and the backdrop stays as it was.

## File Structure

- `page.tsx`: wires the controls, the stage and the drawing together.
- `data.ts`: the slug and the control schema.
- `types.ts`: `Point` and `CurveParams`.
- `curve.ts`: pure maths, `curve()`, `turns()`, `toPath()`.
- `drawing.tsx`: the SVG.
- `metadata.json`: gallery entry.
