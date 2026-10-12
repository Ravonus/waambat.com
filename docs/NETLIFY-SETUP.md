# Netlify test-site setup

The user explicitly selected the new Netlify site as the working test deployment and requested the real `admin` / `password` login and real persistent edits. The target is `https://waambat.netlify.app`, with the PR preview at `https://deploy-preview-1--waambat.netlify.app`. Domain Management contains only the Netlify domain. The original Squarespace site and `waambat.com` DNS remain separate.

Set the existing Netlify project's production branch to `feat/gallery-admin-modernization` and deploy the validated commit. No Git merge or new GitHub App is required for the selected Netlify content backend.

## One required private setup value

In the existing Netlify project, enter a newly generated random `AUTH_SECRET` of at least 32 characters for Production and Deploy Previews, then deploy. Use secure browser entry; never send or export the value through chat. This is the only new credential needed for the requested password login. Google OAuth, Netlify Identity and new GitHub grants are not prerequisites.

Set these non-secret settings in the Netlify UI for both Production and Deploy Previews (All scopes on the current plan). The copies in `netlify.toml` supply build configuration only and are not available to serverless functions at runtime:

- `AUTH_URL`: the exact corresponding Netlify origin.
- `ADMIN_DATABASE_PROVIDER=netlify`: the existing Database SDK selects the deployment's branch.
- `ADMIN_PASSWORD_LOGIN=1` and `ADMIN_TEST_LOGIN=1`.
- `CMS_CONTENT_PROVIDER=netlify-blobs`: actual server-side drafts and publication.
- `NETLIFY_MEDIA_ENABLED=1`: actual private uploads in the existing site's Blobs integration.
- `WAAMBAT_PRIVATE_SITE=0`: the portfolio is public; drafts, uploads and mutations retain server authorization.

The operator has already saved and verified AUTH_URL and ADMIN_DATABASE_PROVIDER in both contexts. The existing DATABASE_URL was not revealed or edited. Leave “Allow personal access tokens full access to production database” unchecked. Do not substitute that URL for the SDK's deployment-specific connection.

## Database and requested account

Native additive migrations in `netlify/database/migrations` create the existing account/admission schema and seed the explicitly requested test account only when the account table is empty. Existing accounts are never replaced. The account password is stored as salted scrypt, and its row is marked `test_only`.

Runtime authentication accepts a test-only account only with the explicit flags above and AUTH_URL on the exact two approved Netlify hosts. It rejects the original domain, arbitrary hosts and disabled configuration. It keeps the shared 12-attempt/minute admission, single renewable KDF lease, account locks, session-version revocation and origin checks. Changing the test flag invalidates existing test-account authorization immediately. There is no separate demo or browser-only persistence.

Netlify applies native migrations immediately before a deploy becomes available; a failure blocks that deployment. Candidate copies under `database/migrations` support isolated testing and review. Do not run a second migration system against the same hosted schema.

For later non-test operation, disable ADMIN_TEST_LOGIN and provision a separate strong account with the existing approved-target provisioning script. Optional approved Google/GitHub identity providers remain available, but are not needed for this test deployment.

## One canonical content store per deployment

With CMS_CONTENT_PROVIDER=netlify-blobs, the private site-scoped store is the sole runtime source for both saved drafts and published content. The initial state uses the versioned Git seed. The existing Git adapter remains available when selected instead; it does not write a second competing content copy.

Production uses `waambat-content-production`; the current PR uses `waambat-content-review-1`. Both survive redeployment, and preview edits remain separate from the production store. Writes validate the same strict content schema, retain archived originals, require current revisions and use strong reads plus conditional ETag writes. Immutable private history retains snapshots. Publication changes the stored published snapshot that public SSR reads; draft preview reads the stored draft under authorization.

Download a full content backup from the studio. Restore validates it into an unsaved draft, with normal save/preview/publish and deletion safeguards. Git does not automatically acquire runtime edits: use explicit backup/export and reviewed source sync if desired. A newer Git seed does not overwrite existing persisted editorial work.

Uploaded originals use the existing site-wide `waambat-media` store, signature/MIME validation, 4 MB limits, content-hash deduplication, private unpublished access and byte ranges. Original remote media URLs still work. No replacement project or paid service was created by this change.

## Deployment acceptance

After the private session secret is entered and Netlify deploys, verify the requested login, a persisted draft after reload, private preview, publication on waambat.netlify.app, content surviving another deployment, upload/playback/error handling and export/restore. Repeat the page fidelity checks on the resulting commit. Local SDK contract tests and isolated Postgres tests do not establish remote provider acceptance.

Modern Adobe Fonts web projects require **no domain allow-list**. The source browser traced the original `amboy-inline`, normal, 400 WOFF2 request to `https://use.typekit.net/af/f4c430/00000000000000007735b4f5/31/l?subset_id=2&fvd=n4&v=3`. This patch retains Adobe hosting and the exact original Squarespace/Typekit loader, enabled by default, and declares the same remote face. It removes the application's former host gate; no font binary is downloaded, self-hosted or substituted. Set `WAAMBAT_ORIGINAL_FONTS=0` only to deliberately disable the original service integration. An owner-supplied `WAAMBAT_ADOBE_PROJECT_URL` remains an optional supported override, not a prerequisite for trying the original source. No new Adobe sign-in or credentials are required by this patch.

Adobe's [Domains documentation](https://helpx.adobe.com/fonts/web/web-design-and-development/domains.html) says a modern web project works at any hosting domain. Its [website setup guide](https://helpx.adobe.com/fonts/web/introduction/add-fonts-website.html) requires the provided hosted embed and prohibits self-hosting those service files. A current original-service response, actual font decoding and rendered wordmark metrics still need connected-browser verification. Cloud requests to the original site, loader and font return CONNECT 403; that does not establish a service, license or domain failure. Preserve upstream restrictions and inspect live evidence before selecting any alternative.
