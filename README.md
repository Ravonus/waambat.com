# WAAMBAT portfolio

Next.js, React and Tailwind portfolio with a protected Git-backed content studio. Published content lives in `src/content/site.json`; original media sources remain in place. See [modernization review](docs/MODERNIZATION.md) and [Netlify/runtime setup](docs/NETLIFY-SETUP.md) for evidence and remaining source/auth integration work.

Use Node 24 and the pinned pnpm version:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The public portfolio runs without a database or login. `/admin` fails closed until an approved identity/database connection and GitHub App runtime configuration are supplied. Copy `.env.example` to a private local environment file only when configuring an approved target; never commit secrets. No default administrator password exists.

```sh
pnpm check          # lint and types
pnpm test           # schemas, providers, Git persistence and request failures
pnpm build          # validates content, then production build
pnpm test:preview   # compiled public portfolio and protected admin/drafts/media
pnpm test:browser   # Chromium video, navigation and isolated Git/media studio
pnpm test:auth      # Docker Postgres + actual credentials form, backup/restore and composition
```

Browser checks need Chromium (default `/usr/bin/chromium`) and FFmpeg. Auth integration tests need Docker and use temporary loopback-only Postgres, random credentials and an isolated Git repository; resources are removed afterward. Original provider playback and cloud OAuth/GitHub App/Netlify integrations require separate approved access and remote QA.

Public SSR serves the deployed content file. Private drafts use Git commit history. Optional Netlify Database stores administrator identity through its branch-aware SDK; it does not duplicate the published content store. Candidate SQL migrations are kept outside Netlify's automatic migration path until the existing project's database and target are approved.

This work stays on a feature branch and draft PR. Preview delivery does not merge main, change waambat.com DNS or replace public production.
