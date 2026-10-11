# Hosted acceptance handoff

The feature branch is the authorized Netlify production branch for **waambat.netlify.app**. Publishing it does not change the original Squarespace domain. The five activation flags are saved in Production and Deploy Previews; AUTH_SECRET remains unsaved pending personal entry. Do not reveal or repurpose DATABASE_URL. After secret entry and deployment, verify actual password login, draft/save/private preview/publish/reload/export, concurrent stale edits, upload cancellation/errors and repeat requests against the real Netlify Database/Blobs backend. Local Git/SDK fixtures are regression evidence, not hosted acceptance.

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

The requested family/style is **amboy-inline / normal / 400**, original logo 37px with normal tracking, original width181.3046875px at1512px viewport. No font binary/license file exists in this repository. Cloud requests to original HTML/CSS/loader return CONNECT403. Do not infer a download URL or evade that block. The authorized Mac browser can inspect the original public page without Adobe sign-in:

```js
performance
  .getEntriesByType("resource")
  .filter((entry) =>
    /\.(woff2?|otf|ttf)(?:[?#]|$)|use\.typekit\.net\/af\//.test(entry.name),
  )
  .map((entry) => ({ url: entry.name, bytes: entry.transferSize }));
```

Also inspect readable injected `@font-face` rules and FontFace family/weight/style/status. Download the **actual observed public font URL** through permitted access and inspect its name/format/copyright/license metadata plus applicable site-owned license. A site-owned asset with self-hosting permission can use local `@font-face` and matching preload. No downloaded font has yet been shipped; authorization for this actual asset remains unverified. If the actual file is from Adobe's web service, its [website guide](https://helpx.adobe.com/fonts/web/introduction/add-fonts-website.html) explicitly prohibits self-hosting those service files; a separate self-hosting license is an alternative. Modern hosted Adobe web projects do **not** require a domain allow-list. The optional hosted project URL support is prepared, without making sign-in or new setup the default.

## Remaining visual comparison

Compare semantic hand/arrow/disabled cursor and visible pink gradient, preserved native text/resize/drag and static reduced-motion behavior; touch should use native pointers. Check conventional icon controls,44px targets, focus and captions in actual art. Previous live remaining geometry deltas: Instagram grid first row1021.383 vs original905.969; blog first heading699.242 vs705.953; contact name heading925.875 vs990.594. Exact fonts affect line wrapping, so do not compensate with arbitrary global spacing. Original390px baseline remains unavailable: reported Mac overrides retained actual1512px innerWidth. Local390px tests are distinct evidence.

The verified final60-second trailer artifact is still awaited. The editable top-of-home trailer slot is prepared; no old40-second cut has been substituted.
