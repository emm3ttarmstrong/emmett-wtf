---
name: emmett-wtf-graduate
description: Graduate something out of Emmett's prototype hub onto its own subdomain of emmett.wtf, running from its own repo. Use only when Emmett says "graduate <prototype>", "put this repo on a subdomain", or "launch this on <name>.emmett.wtf". A new idea is a prototype instead: use the emmett-wtf skill.
---

# Graduate to a subdomain

A subdomain is for something that has outgrown the hub: it needs its own stack, a database, or a life of its own. It runs from its own repo at `https://<name>.emmett.wtf` and does not appear in the gallery.

The repo must belong to `emm3ttarmstrong`, `armstrong-agency-internal` or `armstrong-agency-shared`, and be public, because Omarchy clones it without a credential.

## Steps

1. **Get the code into its own repo.** For a hub prototype, create a new repo and move the prototype's code into a standalone app there. For an existing repo, use it as it is.
2. **Make the repo deployable**, in one of two ways:
   - **Docker**: a `compose.yml` at the repo root that publishes the app on `127.0.0.1:${PORT}` and nowhere else. The hub repo's own `compose.yml` and `Dockerfile` are a working Next.js example.
   - **Static**: plain files in a folder of the repo, with no build step on the server.
3. **Register it.** In the hub repo (`~/projects/personal/emmett-wtf`), `git pull` and add `sites/<name>.json`:

   ```json
   { "repo": "emm3ttarmstrong/my-site" }
   ```

   `<name>` becomes `<name>.emmett.wtf`. Add `"static": "<folder>"` for a static site (`"."` for the repo root).
4. **Push the hub repo.** When the hub deploys, Omarchy clones the new repo, gives it a port and a Caddy site, and deploys it. After that, every push to that repo's `main` deploys within about a minute.
5. **Check it answers**: `curl -s -o /dev/null -w '%{http_code}' https://<name>.emmett.wtf`. Allow a few minutes for the first build.
6. **Finish with the link**, `https://<name>.emmett.wtf`. If it came from a hub prototype, ask Emmett whether to delete the prototype now. He can do that from its card menu.

## Details

- DNS needs nothing: `*.emmett.wtf` already points at Omarchy.
- The subdomain is open to anyone as soon as it deploys. The hub's password gate does not cover it.
- Secrets for a Docker site go in `/etc/wtf/secrets/<name>.env` on Omarchy and are copied to the checkout's `.env` on each deploy.
- The hub repo's `server/README.md` explains the server side.

## From the Mac only

`ssh armstrong-server-omarchy` and then:

- `sudo wtf-app list`: every app with its port and deployed commit.
- `sudo wtf-app deploy <name> --force`: deploy now.
- `sudo wtf-app logs <name>`: container logs.
- `journalctl -u wtf-deploy.service -n 50`: why a deploy failed.
- `sudo wtf-app remove <name>`: take a site down and delete its checkout. Ask Emmett first.
