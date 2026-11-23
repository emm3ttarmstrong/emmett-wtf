---
name: emmett-wtf
description: Add or change a prototype in Emmett's prototype hub at emmett.wtf. Use when Emmett asks for a prototype, a playground idea, a quick app, toy or experiment to try, or says "put this on emmett.wtf" or "make <prototype> public".
---

# emmett.wtf

Everything Emmett asks for starts as a prototype in the hub: a folder in the repo `emm3ttarmstrong/emmett-wtf`, live at `https://emmett.wtf/p/<slug>`. Don't offer a separate repo or a subdomain. Those are for a prototype that has outgrown the hub, only when Emmett asks, and the `emmett-wtf-graduate` skill covers them.

The repo is on the Mac at `~/projects/personal/emmett-wtf`. Clone it if it isn't there. Its `AGENTS.md` holds the rules every prototype follows: read it before writing code. Pushing to `main` deploys to Omarchy within about two minutes.

## Add a prototype

1. `git pull`, then pick a slug: lowercase letters, digits and dashes.
2. Create `prototypes/<slug>/` with `page.tsx` (default-exports the component), `metadata.json` (`"public": false`) and `HOW_IT_WORKS.md`. Copy the shape of `prototypes/spirograph/`.
3. Follow every rule in `AGENTS.md`.
4. Run `pnpm dev` and try it at `http://localhost:3000/p/<slug>`, at 375px wide and in both themes.
5. Run `pnpm thumbnails <slug>` and look at the images in `public/thumbnails/` and `public/og/`.
6. Run `pnpm check`.
7. Commit to `main` and push.
8. Finish with the link: `https://emmett.wtf/p/<slug>`. It is private, so Emmett sees it after signing in at `https://emmett.wtf/login`.

## Change a prototype

`git pull`, edit it, set `updatedAt` in its `metadata.json` to now, update `HOW_IT_WORKS.md`, recapture thumbnails if it looks different, then steps 6 to 8 above.

## Make a prototype public

Only when Emmett names the prototype. He can also do this himself from the card menu in the gallery, along with hiding and deleting.

1. `git pull`, then set `"public": true` and a new `updatedAt` in its `metadata.json`.
2. Check that `public/og/<slug>.png` and `.mp4` exist and look right. If not, run `pnpm thumbnails <slug>`.
3. `pnpm check`, commit, push.

To make it private again, set `"public": false`.
