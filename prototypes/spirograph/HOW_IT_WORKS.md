# Spirograph

## What It Does

Draws a hypotrochoid, the curve a pen makes when a gear rolls inside a toothed ring. The control panel changes the gear sizes, the pen position and the number of stacked layers.

## Architecture

```
control panel ──► useControls (state + localStorage "spirograph:controls")
                        │ values
                        ▼
                  Drawing ──► curve() ──► toPath() ──► <svg><path/></svg>
```

## Frontend

- State is the control values only, held by `useControls` and loaded from localStorage after mount.
- The drawing is an SVG that uses `currentColor`, so light and dark mode come from the `text-foreground` token.
- Each change remounts the paths (the path data is part of the React key), which restarts the draw animation. The animation is a `stroke-dashoffset` keyframe and only runs under `motion-safe`.
- From `lg` up the controls sit in a column on the right. Below that they open as a bottom sheet from the button in the corner.
- There are no keyboard shortcuts and no API.

## Key Dependencies

- `@/components/control-panel` for the panel, persistence, Reset and Randomize.

## Component Tree

```
Spirograph (page.tsx)
└── ControlPanel
    └── Drawing
```

## Error Handling

- localStorage reads and writes are wrapped in try/catch inside `useControls`, and stored values are checked against the schema.
- `curve()` clamps the gear to be smaller than the ring, so any control values produce a finite path.

## File Structure

- `page.tsx`: wires the controls to the drawing.
- `data.ts`: the slug and the control schema.
- `types.ts`: `Point` and `CurveParams`.
- `curve.ts`: pure maths, `curve()`, `turns()`, `toPath()`.
- `drawing.tsx`: the SVG.
- `metadata.json`: gallery entry.
