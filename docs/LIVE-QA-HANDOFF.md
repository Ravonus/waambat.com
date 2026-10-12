# Hosted acceptance handoff

The feature branch automatically publishes **waambat.netlify.app**. Original Squarespace DNS is unchanged. Current production deploy 6acba0470a75ee00083423f7 and preview deploy 6acba049c830050008e201b2 serve 20ddb7c5c64389c201870d65165867b9a57ac0b3. The current repair remains local under the deployment hold.

Production and Deploy Previews have ADMIN_PASSWORD_LOGIN=1, ADMIN_TEST_LOGIN=1, CMS_CONTENT_PROVIDER=netlify-blobs, NETLIFY_MEDIA_ENABLED=1 and WAAMBAT_PRIVATE_SITE=0. AUTH_URL matches each context; ADMIN_DATABASE_PROVIDER=netlify and the existing DATABASE_URL are preserved. The user personally saved AUTH_SECRET; metadata confirms all contexts/all scopes, with the unmarked-secret warning preserved. Its value was never read or transmitted. No OAuth or new GitHub App is required for the selected backend.

Anonymous hosted `/admin` renders its enabled form, but public root/archive and the user's personal login attempt timed out. No authenticated hosted Save/Publish is verified. After separately authorized deployment, verify password login, private draft/save/preview, publish/reload/export, concurrent stale edits, upload cancellation/errors and repeated requests on the actual Database/Blobs backend. Direct API navigation was client-blocked and not bypassed. Local PostgreSQL/password and SDK/adapter tests are regression evidence, not hosted acceptance.

## Inline archive playback

Keep the original varied montage. Test a working YouTube tile, then another available provider. Record the exact commit/deploy ID, provider ID, viewport and requested iframe URLs. Confirm actual motion/time advancement muted in view; immediate pause offscreen and in a hidden tab; reentry resumes the same player without another iframe request. Fullscreen should pause inline players; close should resume eligible visible players. Explicit pause must survive leaving/reentering. Check mobile and reduced motion/data saver; explicit Play remains available.

Each `.inline-video` has a read-only, on-demand diagnostic event returning the **actual provider SDK currentTime**, with no background polling. In the connected browser's evaluation context:

```js
const tile = document.querySelector('[data-inline-provider="youtube"]');
const sample = () =>
  new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 3000);
    tile.dispatchEvent(
      new CustomEvent("waambat:inspect-playback", {
        detail: (seconds) => {
          clearTimeout(timeout);
          resolve(seconds);
        },
      }),
    );
  });
await sample();
```

Sample again after one second, after scrolling away, and after returning. Null means no ready controllable player, not proven playback. Source Vimeo 538169390, 543748855 and 224251774 already show the same unavailable message on both original and migrated sites; keep those upstream failures separate from migration regressions. The original Pimp Comforts entry already has an invalid embed.

## Original font trace

The requested family/style is **amboy-inline / normal / 400**, original logo 37px with normal tracking, original width181.3046875px at1512px viewport. No font binary/license file exists in this repository. The Mac browser read the public injected font-face rule and recorded the actual WOFF2 URL in `evidence/font-source-check.json`. That exact cloud asset request returned CONNECT403 with zero bytes. Do not evade that block. The authorized Mac browser can inspect the original public page without Adobe sign-in:

```js
performance
  .getEntriesByType("resource")
  .filter((entry) =>
    /\.(woff2?|otf|ttf)(?:[?#]|$)|use\.typekit\.net\/af\//.test(entry.name),
  )
  .map((entry) => ({ url: entry.name, bytes: entry.transferSize }));
```

Also inspect readable injected `@font-face` rules and FontFace family/weight/style/status. The observed source is https://use.typekit.net/af/f4c430/00000000000000007735b4f5/31/l?subset_id=2&fvd=n4&v=3 . No font bytes have been downloaded or shipped; binary metadata and a separate self-hosting license remain unverified. A site-owned asset with self-hosting permission can use local `@font-face` and matching preload. No downloaded font has yet been shipped; authorization for this actual asset remains unverified. If the actual file is from Adobe's web service, its [website guide](https://helpx.adobe.com/fonts/web/introduction/add-fonts-website.html) explicitly prohibits self-hosting those service files; a separate self-hosting license is an alternative. Modern hosted Adobe web projects do **not** require a domain allow-list. The optional hosted project URL support is prepared, without making sign-in or new setup the default.

## Remaining visual comparison

Compare semantic hand/arrow/disabled cursor and visible pink gradient, preserved native text/resize/drag and static reduced-motion behavior; touch should use native pointers. Check conventional icon controls,44px targets, focus and captions in actual art. Previous live remaining geometry deltas: Instagram grid first row1021.383 vs original905.969; blog first heading699.242 vs705.953; contact name heading925.875 vs990.594. Exact fonts affect line wrapping, so do not compensate with arbitrary global spacing. Original390px baseline remains unavailable: reported Mac overrides retained actual1512px innerWidth. Local390px tests are distinct evidence.

The user rejected the v5 LUX/Carat cut. It was never embedded or published; the editable top-of-home trailer slot remains empty and archived. The replacement request is a multi-work datamosh montage without text or large diamonds and with different Carat motion. Exact preserved original painting URLs and verified Kismet HTML preview/provenance are in `evidence/render-source-inventory.json`; no Kismet MP4 URL is invented.

## Local timeout diagnosis; external changes held

Hosted HTTP observations show public root/archive 504 responses after about30.5s; a nearby function invocation lasted60s. The log has no proven request-ID/provider-status mapping. The exact provider response remains unobserved; see `evidence/hosted-storage-outage-observations.json`.

A local application defect is proven with the installed SDK and Next runtime: Next clones GET responses and retains one tee branch; the SDK awaits cancellation of the other branch on missing content and provider errors, which can remain pending indefinitely. An explicit AbortSignal opts out of Next's cloning. A signal-only baseline adapter completes missing404,401 and403 responses without a deadline. The repair supplies that signal for content and media reads, plus a2.5s deadline for content transport/body/schema reads. A successful render shares one published snapshot; each new request reads fresh state. Next error rendering can issue a second read, so full public outage responses are measured at about5s. Only a successful absent404 uses the original seed. Failed reads never substitute seed or expose drafts. Sanitized logs include category/status/reason, never credential-bearing URLs or documents. No store namespace, credentials or database configuration changed.

Production content uses `waambat-content-production`; PR1 preview uses `waambat-content-review-1`, selected at build time. Preserve both. The native function bootstrap supplies edge/uncached endpoints. No legacy connectLambda, namespace migration or newly entered token is needed for the repair.

The parent reports automatic approval review rejected the deployment-repair handoff because its wording was ambiguous, and explicitly maintains the deployment hold pending resolved authorization. No push, deployment retry, credential change or workaround is authorized. Once resolved, a push itself builds both production and PR preview; avoid duplicate retries. Verify exact commit/deploy IDs and capture sanitized provider failures if any remain. Password-session SQL is a separate possible admin bottleneck, not an explanation for public reads. The anonymous login form does not exercise authorized content access.

Local visual refinement restores source press media-to-heading spacing (705.906px vs supplied705.953px), Instagram intro padding/quoted line breaks and the exact partial interview link. Added account links and merged original blocks remain archived. Instagram's first image row is878.8125px vs original905.96875px, approximately one body line with Europa unavailable; contact video/name spacing remains unresolved pending exact original list/spacer DOM. These are remaining fidelity limits, not accepted parity.
