---
name: emmett-wtf
description: Add a prototype to Emmett's prototype hub at emmett.wtf, make one public, or launch a separate repo on a subdomain of emmett.wtf. Use when Emmett asks for a prototype, a playground idea, a quick app or toy to try, or says "put this on emmett.wtf", "launch this on a subdomain", or "make <prototype> public".
---

# emmett.wtf

The hub is the repo `emm3ttarmstrong/emmett-wtf`, on the Mac at `~/projects/personal/emmett-wtf`. Clone it if it isn't there. Its `AGENTS.md` holds the rules every prototype follows: read it before writing code. Pushing to `main` deploys to Omarchy within about two minutes.

## Add a prototype

1. Pick a slug: lowercase letters, digits and dashes.
2. Create `prototypes/<slug>/` with `page.tsx` (default-exports the component), `metadata.json` (`"public": false`) and `HOW_IT_WORKS.md`. Copy the shape of `prototypes/spirograph/`.
3. Follow every rule in `AGENTS.md`.
4. Run `pnpm dev` and try it at `http://localhost:3000/p/<slug>`, at 375px wide and in both themes.
5. Run `pnpm thumbnails <slug>` and look at the images in `public/thumbnails/`.
6. Run `pnpm check`.
7. Commit to `main` and push.
8. Finish with the link: `https://emmett.wtf/p/<slug>`. It is private, so Emmett sees it after signing in at `https://emmett.wtf/login`.

## Change a prototype

Edit it, set `updatedAt` in its `metadata.json` to now, update `HOW_IT_WORKS.md`, recapture thumbnails if it looks different, then steps 6 to 8 above.

## Make a prototype public

Only when Emmett names the prototype.

1. Set `"public": true` and a new `updatedAt` in its `metadata.json`.
2. Run `pnpm thumbnails <slug>`, which now also writes `public/og/<slug>.png` and `.mp4`. Check them.
3. `pnpm check`, commit, push.

To make it private again, set `"public": false` and delete `public/og/<slug>.*`.

## Launch a repo on a subdomain

For something that has outgrown a prototype or has its own stack. The repo must belong to `emm3ttarmstrong`, `armstrong-agency-internal` or `armstrong-agency-shared`, and be public, because Omarchy clones it without a credential.

1. Make the repo deployable, in one of two ways:
   - **Docker**: a `compose.yml` at the repo root that publishes the app on `127.0.0.1:${PORT}`, like this repo's own `compose.yml` and `Dockerfile`.
   - **Static**: plain files in a folder of the repo, with no build step on the server.
2. In the hub repo, add `sites/<name>.json`:

   ```json
   {
     "title": "My Site",
     "description": "What it is",
     "tags": [],
     "createdAt": "YYYY-MM-DD",
     "updatedAt": "ISO timestamp",
     "hidden": false,
     "public": false,
     "repo": "emm3ttarmstrong/my-site"
   }
   ```

   `<name>` becomes `<name>.emmett.wtf`. Add `"static": "<folder>"` for a static site (`"."` for the repo root). `"public"` only decides whether the gallery lists it: the subdomain itself is open to anyone as soon as it deploys.
3. `pnpm check`, commit, push. When the hub deploys, Omarchy clones the new repo, gives it a port and a Caddy site, and deploys it. After that, every push to that repo's `main` deploys within about a minute.
4. Once it answers, run `pnpm thumbnails <name>` in the hub repo for its gallery card, and push again.
5. Finish with the link: `https://<name>.emmett.wtf`.

DNS needs nothing: `*.emmett.wtf` already points at Omarchy. Secrets for a Docker site go in `/etc/wtf/secrets/<name>.env` on Omarchy and are copied to the checkout's `.env` on each deploy.

## From the Mac only

`ssh armstrong-server-omarchy` and then:

- `sudo wtf-app list`: every app with its port and deployed commit.
- `sudo wtf-app deploy <name> --force`: deploy now.
- `sudo wtf-app logs <name>`: container logs.
- `journalctl -u wtf-deploy.service -n 50`: why a deploy failed.
- `sudo wtf-app remove <name>`: take a site down and delete its checkout. Ask Emmett first.
