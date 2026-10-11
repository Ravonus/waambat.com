# waambat.com

WAAMBAT's art gallery and private content studio, prepared for Netlify. The existing domain has not been moved. See [modernization notes](docs/MODERNIZATION.md) for preservation research, validation evidence and rollout blockers.

Use Node 24 and the pinned pnpm version in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:browser
```

The public galleries read validated `src/content/site.json`. The studio stays disabled until approved GitHub OAuth and a repository-scoped GitHub App are configured. It does not require Postgres. The original unused Drizzle example remains available separately; do not run its database commands for the CMS.

`/admin` → save a draft Git commit → private preview → explicit publish commit → Netlify build. Original media and Git history are retained, and archiving is reversible. Git credentials stay on the server. A failed build keeps Netlify's previous deployed version live.

Browser checks require Chromium and ffmpeg. They create their own temporary Git repository, media filesystem and signed test session; they never edit production or add a production authentication bypass. See `evidence/browser-results.json` for the tested boundary.

```sh
# Approved local source media only; never overwrites the original
pnpm media:prepare ./original.mp4 ./new-derivatives
```

Configure a private Netlify review site using `.env.example` and the setup instructions before enabling sign-in, publishing or uploads. Original marketplace destinations, licensed fonts and the remaining Squarespace sections need a source handoff before replacing the existing domain.
