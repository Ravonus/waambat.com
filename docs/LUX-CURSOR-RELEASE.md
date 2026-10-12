# Approved LUX and cursor release

Baseline: `6b87621b79dc077249cc4182688b741a63864505`, branch `feat/gallery-admin-modernization`, draft PR #1.

The user explicitly approved publishing these two corrections on 2026-10-12. This release includes the bounded semantic pink cursor and LUX iframe persistence/interaction gate. Website content, original source URLs, branding, typography, page geometry, deployment settings and credentials are unchanged. Broader media/branding/NFT work remains in the separate local working checkpoint; no provisional trailer is inserted.

The one cursor follows own-document semantics across text, input/selection, disabled, resize and other standard states, generated content, SVG, route commits and native dialogs. Editing caret, keyboard focus, touch, reduced motion and native fallback remain independent. Browser chrome, native picker controls and frames remain native boundaries.

Activated on-chain frames use persistent activation state and retain their iframe node and source when hidden or revisited within the page. No frame removal/blanking/reload is used to simulate unsupported pause. LUX displays with iframe pointer input disabled until an explicit **Interact** click/tap. **Exit interaction** remains visible outside the iframe. Parent-received Escape also exits; iframe focus itself does not accidentally close interaction. Leaving view or opening navigation exits interaction without destroying the artwork document. Leaving the artwork route legitimately releases the page.

The exact existing LUX player remains `https://ordinals.com/content/ce994e920942542babe215b0837704be9c73e9d08cdb8e6a818cf7767dbc7dcci2`.

Checks passed in the exact release checkout:

- Lint/types, 33 unit tests, validated content and production build.
- Compiled cursor tests: actual DOM styles, pointer transitions, heading selection, typing/caret, textarea resizing, disabled/SVG/generated controls, route changes, dialogs/menu, touch, reduced-motion pixels and failure boundaries.
- Compiled LUX checks: desktop and 390px mobile, wheel/touch page scrolling before interaction; input after activation; explicit exit and keyboard activation/parent Escape; three viewport exits/reentries and three interaction cycles with resizing. Exactly one iframe-document request per context, identical node/source/document identity and retained rendered canvas state.
- Compiled navigation regression: interrupted requests, successful route commits, repeated menu dismissal, scroll restoration and keyboard focus.

The interactive provider fixture verifies the app's input/lifecycle contract; it does not establish live upstream drag/zoom behavior. Already-collected source QA verified the LUX identity/animation. No further Mac access was used. Current cloud production HTTP is blocked with CONNECT403, and GitHub's commit-status endpoint is unavailable to the integration. Push/PR bot evidence can establish the remote revision and deploy-preview result; production publication must be reported separately if its cloud evidence remains inaccessible.
