# emmett.wtf

A prototype hub: one Next.js app that holds many small prototypes, and a gallery that also lists separate repos running on subdomains of emmett.wtf.

- `AGENTS.md`: the rules for building in this repo.
- `skill/emmett-wtf/SKILL.md`: how to add a prototype, make one public, or launch a repo on a subdomain.
- `server/README.md`: how it runs on the server.

```
pnpm install
pnpm dev          # http://localhost:3000, with the gate open
pnpm check        # lint, type-check, production build
pnpm thumbnails   # capture gallery thumbnails and Open Graph media
```
