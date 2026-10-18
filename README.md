# WAAMBAT portfolio

Contact-form editing, the private inbox, email notifications, SEO settings, and media regeneration are documented in [Contact forms and site optimization](docs/CONTACT-AND-SEO.md).

Next.js, React and Tailwind portfolio with a protected content studio. The deployed Netlify test site uses private Netlify Blobs for saved drafts and published content; Git keeps the initial seed in `src/content/site.json`; original media sources remain in place. See [modernization review](docs/MODERNIZATION.md), [art-direction pass and hero banner](docs/ART-DIRECTION-PASS.md) and [Netlify/runtime setup](docs/NETLIFY-SETUP.md) for evidence and remaining source/auth integration work.

Use Node 24 and the pinned pnpm version:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The selected existing Netlify deployment uses its Database for real password authentication and Blobs for real content/media persistence. The explicitly requested `admin` / `password` test account is seeded only into an empty account table and accepted only with enabled test flags on the exact approved Netlify hosts. `/admin` fails closed without a private `AUTH_SECRET` and working database. Google and a new GitHub App are not prerequisites. See [runtime setup](docs/NETLIFY-SETUP.md); never commit secrets.

```sh
pnpm check          # lint and types
pnpm test           # schemas, providers, Git persistence and request failures
pnpm build          # validates content, then production build
pnpm test:preview   # compiled public portfolio and protected admin/drafts/media
pnpm test:browser   # Chromium video, navigation and isolated Git/media studio
pnpm test:auth      # Docker Postgres + actual credentials form, backup/restore and composition
pnpm test:hero      # home banner: playback lifecycle, mobile/landscape renders, reduced motion, failure state
```

Browser checks need Chromium (default `/usr/bin/chromium`, or set `CHROMIUM_PATH`) and FFmpeg. Auth integration tests need Docker and use temporary loopback-only Postgres, random credentials and an isolated Git repository; resources are removed afterward. Original provider playback and remote Netlify persistence and original provider playback require deployment QA.

Public SSR and the studio use the same selected canonical content backend. Netlify native additive migrations run before deployment availability. Private drafts, compare-and-swap revisions and history protect concurrent edits; exports support explicit Git source sync. The original Git adapter remains available when selected instead.

This work stays on a feature branch and draft PR. The user authorized publishing that branch to the existing Netlify production hostname. It does not merge main or change original waambat.com DNS.
