# The server side

Everything under `*.emmett.wtf` runs on Omarchy (`armstrong-server-omarchy`). A request travels:

```
Cloudflare (TLS) ──► cloudflared tunnel ──► Caddy on :80 ──► 127.0.0.1:<port> (Docker) or a folder of files
```

- **DNS**: `*.emmett.wtf` is a proxied CNAME to the tunnel, so a new subdomain needs no DNS change. The apex `emmett.wtf` has its own CNAME to `a669d2f5-e0d6-4ea8-a851-170ac5516b84.cfargotunnel.com`.
- **Tunnel**: `/etc/cloudflared/config.yml` sends `emmett.wtf` and `*.emmett.wtf` to Caddy.
- **Caddy**: `/etc/caddy/Caddyfile` imports `/etc/caddy/sites/*.caddy`. `wtf-app` writes one file per app there.
- **Apps**: each is a git checkout in `/home/emmett/services/<name>`, registered in `/etc/wtf/apps/<name>.env`.
- **Deploys**: `wtf-deploy.timer` runs `wtf-app deploy-all` every minute. An app whose `origin/main` has moved is checked out and deployed. A commit that fails to deploy is not retried until `main` moves again, and the previous version keeps running.
- **Sites list**: after the hub (`emmett-wtf`) deploys, `wtf-app sync` registers any `sites/<name>.json` that is new. Sync only adds. Removing a site is `sudo wtf-app remove <name>`.
- **Secrets**: `/etc/wtf/secrets/<name>.env`, root-only, copied to the checkout's `.env` before each deploy. The hub's holds `WTF_PASSWORD`, the gallery password.

`wtf-app` with no arguments prints its commands.

## What an app repo must contain

- **Docker**: a `compose.yml` at the root. Publish the app on `127.0.0.1:${PORT}` and nowhere else. `wtf-app` sets `PORT`, runs `docker compose up -d --build`, and waits up to 90 seconds for any answer below HTTP 500 at `/`.
- **Static**: nothing special. `sites/<name>.json` names the folder with `"static"`, and Caddy serves it.

Repos are cloned over HTTPS with no credential, so they must be public, and they must belong to one of the owners listed at the top of `wtf-app`.

## Install or update

On Omarchy, from a checkout of this repo: `sudo server/install.sh`. The checkout in `/home/emmett/services/emmett-wtf` works. Deploying the hub does not reinstall `wtf-app`, so run this after changing anything in `server/`.

The first install also needed two steps by hand: the `emmett.wtf` entry in `/etc/cloudflared/config.yml`, and `sudo wtf-app add emmett-wtf emm3ttarmstrong/emmett-wtf --host emmett.wtf --host www.emmett.wtf`.

## Trust

Anyone who can push to this repo's `main`, or to the `main` of a listed site's repo, can run a Docker build as root on Omarchy. Keep push access to Emmett and his agents.
