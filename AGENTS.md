<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# emmett.wtf

Emmett's prototype hub. One Next.js app at https://emmett.wtf holds many small prototypes at `/p/<slug>`, and the gallery also lists separate repos that run on their own subdomains. Emmett asks for prototypes from his phone, so every one must be quick to build, consistent, and unable to break another.

Read `skill/emmett-wtf/SKILL.md` for the step-by-step commands. This file is the rules.

## Map

- `prototypes/<slug>/`: one folder per prototype. `page.tsx`, `metadata.json`, `HOW_IT_WORKS.md`, plus its own files.
- `sites/<name>.json`: one file per repo that runs on `<name>.emmett.wtf`. Adding the file launches the site.
- `app/`: the gallery (`/`), the owner's gallery (`/all`, served at `/` by the proxy), `/login`, `/p/[slug]`, and `api/p/<slug>/` for a prototype's API routes.
- `proxy.ts`: the privacy gate.
- `app/api/admin/entries/`: the signed-in gallery's card menu: Hide, Make public and Delete. It queues an edit that Omarchy commits to `main`.
- `components/ui/`: shadcn components, all installed. `components/control-panel/`: the shared control panel.
- `scripts/manifest.mjs`: builds `lib/generated/` from the metadata. It runs before dev, build, lint and typecheck, and it fails the build on a prototype with missing files.
- `scripts/thumbnails.mjs`: thumbnails and Open Graph media.
- `server/`: the deploy tool that runs on Omarchy. `server/README.md` explains it.

## Privacy

- The gallery is public. It shows only entries with `"public": true`.
- A prototype is private until its metadata says `"public": true`. A private prototype answers 404 to everyone but Emmett, who signs in at `/login`. Never redirect a private URL to the login page, because that confirms the name exists.
- Make a prototype public only when Emmett asks for that prototype by name. He can also do it himself from the card menu in the gallery, which is why every prototype needs its Open Graph media from the start.
- A private entry's thumbnails and Open Graph files are gated like its page.
- This repo is public, so a private prototype's code is readable on GitHub. The gate hides the running page, not the source. Keep secrets out of the repo.
- `"hidden": true` keeps an entry out of the gallery for everyone until Emmett switches on Hidden.

## Rules for every prototype

### Metadata

Every prototype has a `metadata.json`:

```json
{
  "title": "My Prototype",
  "description": "What it does",
  "tags": ["tag1"],
  "createdAt": "YYYY-MM-DD",
  "updatedAt": "ISO timestamp",
  "hidden": false,
  "public": false
}
```

Set `updatedAt` to now on every edit. The gallery sorts by it and the thumbnail URLs use it to bust the cache.

### Documentation

Every prototype has a `HOW_IT_WORKS.md`, updated in the same commit as any change:

- **What It Does**: one or two sentences.
- **Architecture**: an ASCII data-flow diagram.
- **Frontend / API**: state, shortcuts, responsive behaviour, request and response shapes.
- **AI Usage**, when a model is called: model ID, why that model, how it's called, key parameters, a summary of the system prompt, the shape of the user prompt.
- **Key Dependencies**, **Component Tree**, **Error Handling**, **File Structure**.

### Self-contained and decomposed

- A prototype lives entirely in `prototypes/<slug>/` and imports nothing from another prototype. Its API routes go in `app/api/p/<slug>/`, which the gate covers.
- `page.tsx` default-exports the component and stays thin, about 60 lines. Split out `types.ts`, `data.ts` (mock data, constants, the control schema), pure logic files that run without React, and one descriptively named file per meaningful component.
- The prototype renders inside a flex column under a 48px header that the route provides. Use `flex-1` to fill it. Don't add your own back link or theme toggle.

### Design system

- Use the shared components in `components/ui/` and the tokens: `bg-background`, `text-foreground`, `bg-card`, `bg-muted`, `text-muted-foreground`, `bg-primary`, `border-border`.
- Never hardcode a colour: no `bg-black`, no hex values, no inline colour styles. In SVG use `currentColor` with a token class.
- These components are shadcn's Base UI build, not the Radix one. Read the component's source before using a prop. For example, a Button rendered as a link takes `render={<Link href="…" />}` with `nativeButton={false}`, and there is no `asChild`.
- Install new dependencies at the repo root with `pnpm add`.

### Clean and minimal

- Start with a single centred column (`max-w-2xl mx-auto`). No sidebars, split panels or tabs unless asked.
- Build only what was asked for. Every element must justify itself. Plain badges, no decorative icons.
- Write as little interface copy as possible.

### Control panels

- Anything with tunable parameters gets a control panel, never scattered inputs.
- Use `@/components/control-panel`: define a schema of `range`, `toggle` and `select` controls in `data.ts`, call `useControls(slug, schema)`, and wrap the subject in `<ControlPanel controls={controls}>`. That gives persistence, Reset and Randomize, a side column from `lg` up and a bottom sheet on phones. `prototypes/spirograph` is the worked example.
- If a prototype needs a control type the library lacks, add it to the library.

### Mobile first

- Everything works at 375px wide.
- Tap targets are at least 44×44px. The shared Button is 32px tall by default, so add `h-11` or `size-11`.
- Icon-only buttons on phones, labels from `sm:` up.
- Nothing may depend on hover. Give hover states a visible touch equivalent, such as `active:`.
- Code blocks wrap. Nothing scrolls sideways.
- Modals have visible previous and next buttons or swipe, not only keyboard shortcuts.

### Light and dark

- Design dark first. Light mode must also work, through tokens.
- Never put a `dark` class on a page. The theme is global.
- Use `useTheme()` and `resolvedTheme` only when behaviour, not just colour, changes with the theme, such as canvas or WebGL colours.

### Motion

- Rows and sections that the user adds or removes animate their height. Nothing pops in and makes the page jump.
- Use smooth deceleration curves with no overshoot.
- Respect `prefers-reduced-motion`, for example with `motion-safe:`.
- Check that an animation really runs by reading computed styles or a screenshot mid-animation.

### AI-backed prototypes

- Call models from an API route under `app/api/p/<slug>/`. Never expose a key to the client.
- If a model generates UI or layout, put the layout limits in the system prompt. Defensive CSS is only a backup.
- Parse JSON from model output defensively, taking the first `{...}` block.
- Wrap every API route in try/catch and return proper status codes.
- A key the server needs goes in `/etc/wtf/secrets/emmett-wtf.env` on Omarchy, which only Emmett or a Mac session can edit. Say so in your final message when a prototype needs one.

### Storage

- There is no database. Use `localStorage`, always inside try/catch, loaded after mount, with keys that start with the slug.

### Thumbnails

- A new prototype, or any visual change, gets fresh thumbnails in the same commit: `pnpm thumbnails <slug>`.
- A global style change regenerates all of them: `pnpm thumbnails`.
- Open the captured images and look at them before committing. A stale thumbnail is worse than none.
- The same command writes `public/og/<slug>.png` and `.mp4` for every prototype, public or not. The video needs `ffmpeg`.
- If the machine has no browser for Playwright, commit without thumbnails and say so. The gallery shows "No preview yet".

## Workflow

1. Run `git pull` before starting. Emmett hides, publishes and deletes entries from the gallery, and each of those is a commit on `main` by "emmett.wtf gallery".
2. Run `pnpm check` (lint, type-check and a production build) before every push. All three must pass.
3. Commit to `main` and push. There are no preview deployments and no pull requests here: Omarchy deploys `main` within about two minutes, and a new prototype is private, so `main` is the preview.
4. A build that fails on the server leaves the previous version running. Check with `curl -s -o /dev/null -w '%{http_code}' https://emmett.wtf/p/<slug>`, which answers 404 for a private prototype when it is deployed and gated, or from the Mac with `ssh armstrong-server-omarchy sudo wtf-app list`.
5. End every task with the link, `https://emmett.wtf/p/<slug>`, so Emmett can open it from his phone.
6. When something goes wrong and gets fixed, add the lesson below so it doesn't happen twice.

## Lessons

- An SVG path animated with `pathLength` and `stroke-dashoffset` draws wrong under `vector-effect: non-scaling-stroke`. Set the stroke width in viewBox units instead.
- The Geist font only applies when `next/font` writes the `--font-sans` variable that `globals.css` reads.
- Git doesn't track empty folders, so scripts must not assume `sites/` or `public/og/` exists.
- A Caddy change on Omarchy needs `systemctl restart caddy`. Reload fails because the admin API is off.
- `pkill -f "next start"` does not stop a production server, because the process renames itself. A server left on a port makes every later test hit an old build. Stop it by port: `lsof -ti :<port> | xargs kill`.
