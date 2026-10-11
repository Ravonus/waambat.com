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

The existing Netlify integration created https://deploy-preview-1--waambat.netlify.app. Its compiled privacy gate requires approved sign-in; the studio fails closed while unconfigured. Reuse project `waambat` and follow [setup instructions](docs/NETLIFY-SETUP.md) before enabling access, publishing or uploads. All seven internal navigation destinations have local routes and admin draft editing. Original marketplace destinations, the licensed font loader, 23 archive player URLs and legacy-route details still need source verification before replacing the existing domain. This is an incomplete draft, not a finished replacement.
