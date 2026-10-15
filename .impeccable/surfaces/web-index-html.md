---
version: 1
slug: "web-index-html"
primary_target: "web/index.html"
related_targets: ["web/src/Home.tsx","web/src/App.tsx"]
---

# Surface: Weir. home (web/index.html, route #/)

Scope: the landing page (Persuade). Audience: freelancers and small clients first; IMD operators second. Job: understand what Weir. does and feel it is safe within seconds, then Start a stream (working form: the Create route) or Connect wallet. Proof: the live contract, stream #1's real timeline (paused on dispute, 4 of 4 reviewers, settled in ~5 minutes), the hold rule, no fee, no middleman. Constraints: plain words in primary copy; exact details one disclosure away; "not audited" stated; no yield/return language; keep imd-deployment.json, ABIs and every contract call.

Chosen direction: Pixel Cutaway Town (user-steered; busytown cross-section in 8-bit pixel art, original punk-style pixel cast). Approved comp: `.impeccable/mocks/comp-1-town-street.png` (seed 358b3d7a, kind challenger). Memorable moment: the coin pipe under the street, coins moving per second, a red valve labelled pause.

## Direction contract

THESIS: The town with its walls off. A payment product that shows where the money is at every second, drawn as a cutaway town where the client, the pipe, the reviewers and the freelancer are all visible at once. It refuses the fintech split hero (headline left, screenshot right, three feature cards) and the cream-serif editorial default.

OWN-WORLD: Paper-white sky, 16-colour pixel palette (brick #b8402a, school-bus yellow #f2c230, grass #4f8f3a, sky #4a90d9, soil brown, warm brown outlines), hard-edged pixels with no anti-aliasing, every object carrying a tiny printed label with a one-pixel pointer. Chunky pixel display face for headline, signs and labels; a plain smooth sans for body copy at 16px+. Controls are pixel signs and doors: yellow pixel button for Connect wallet, a lit door for the primary action, labels as the state vocabulary. With all content removed, the ruled street, the pipe and the label pointers still say Weir..

STORY: The visitor sees money as coins moving through a pipe from a client's house to a freelancer's studio, with five reviewers in a hall above. They understand: it moves per second only while the work does, it can be paused, and disagreements go to reviewers. They believe it because the scene is labelled with real numbers from a real stream and nothing in it belongs to a company. They act: Start a stream (the lit door) or Connect wallet.

FIRST VIEWPORT (1440×900): top bar: pixel two-arch mark + "Weir." left, four links centre-right, yellow pixel "Connect wallet" right. Headline "Pay as the work flows." centred in the sky across the top third in pixel letters. Below it one continuous street scene full width: left the CLIENT house (two storeys, wall removed, the client at a laptop, a sack "deposit 100 WEIR"); centre the REVIEWERS hall raised on stone with five faces at a bench and the sign "4 of 5 must agree"; right of centre a small brick building whose lit double door reads "Start a stream" (the primary action, a real link); far right the FREELANCER studio with the freelancer at a desk and a tray "streamed 0.35 WEIR". Under the pavement, a cutaway pipe across the full width: coins with arrows moving right, a red valve wheel labelled "pause". Beneath the scene, on white, the plain body line "Money moves per second, only while the work does. Pause any time. Five reviewers settle disagreements." The next section begins: three pixel vehicles "No. 1 Agree", "No. 2 Fund", "No. 3 Settle" (the numbers carry the sequence).

FORM: Busytown cutaway spread, redrawn in 8-bit pixels; position 1 on the user's steered list (the roll's assignment was superseded by the user's steer); seed key 358b3d7a, round 1 safer card `steer-pixel-town`.

Signature interaction: the pipe's coins move one pixel-step per second, continuously; pausing (hover on the valve, or a paused stream later in the app) stops them. Motion grammar: stepped (steps()) pixel motion only, no easing curves, no fades.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Unresolved: the production domain; whether terms text should also allow file upload; Records page copy.
