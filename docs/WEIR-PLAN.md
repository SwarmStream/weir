# Weir (WEIR) — one-shot IMD company launch: streams + oracle court + token gate

Drafted 2026-10-14 (renamed from "SwarmStream": an NFT project already uses "Stream"). Repo `github.com/SwarmStream/swarmstream` (empty) to be
renamed; GitHub `weir` is taken (use `weir-fun` or similar). DexScreener: no WEIR token. IMD site label `weir` free → `https://weir.sites.imd.fun`.
**Request: `docs/imd/workflow-weir.json`** (`workflow.open`, 0.5 IMD; generator `docs/imd/workflow-weir.gen.py`). Passes the free check.
**SUBMITTED AND PAID 2026-10-14 (see below).** Superseded: `docs/imd/workflow-swarmstream.json`, `docs/imd/job-swarmstream.json`, `docs/SWARMSTREAM-PLAN.md`.

## What one payment buys
Plan: `build-contract-project → write-foundry-tests → adversarial-review (→ 4 audit specialists + judge) → deploy → frontend-for-contract → host`.
- Token WEIR: fixed launch token (1B, 18 dec). `evm_project`, Robinhood 4663, `pairWith: imd`. 10% swarm / 90% requester (pool 80% default,
  remainder to the paying wallet). Pool fee 1.25% (1% to the paying wallet).
- Contract `Weir.sol` (one): **own per-second stream engine** (StreamNFT precedent, job `ddefecff…`; no Sablier), dispute = one
  `oracle.request` (bool, panel 5 / quorum 4), **percentage bond with hold tiers**, **court fund**, **verdict records**.
  `launch.json` constructorArgs `["$token", IMD 0x5f7b…7127, INTAKE 0xa43e…de82, SIGNER 0x5598…2982, "604800", "10000000000000000000000"]`.
- Site at `weir.sites.imd.fun`: Home (hold rule, tiers, Buy WEIR, eligibility, court fund + Sponsor), Create, My streams, Stream page
  (actions, withdraw, Dispute with question/bond/payer preview, Enforce, Expire), Records.

## Product rules (owner, 2026-10-14)
- **No fee. Hold to use:** `createStream` and `dispute` need ≥ 10,000 WEIR.
- **Bond = stake × tier bps** in the stream token (stake = balance − withdrawn; dispute refused at 0). Tiers by the disputer's WEIR:
  < 100k → 500 bps · ≥ 100k → 250 · ≥ 1M → 100 · ≥ 10M → 0. Loser's bond → counterparty; panel failure / timeout → returned.
  Client loses on "accepted", recipient loses on "rejected".
- **Court fund:** `sponsor(imd)` permissionless; a dispute draws 0.5 IMD from it when ≥ 0.5, else the disputer pays. Leaves only via the Intake.
- **Records:** per address {clientWon, clientLost, recipientWon, recipientLost, raised} + `Verdict` event. Public reputation.
- Rulings: accepted → resume at the paused rate; rejected → void (client gets refundable, recipient keeps withdrawable).
- Callback moves no tokens (200k gas); `enforce()` permissionless; `submitAttestation()` for a missed callback; `expireDispute()` after 7 days.
- Ownerless, immutable. Oracle signer immutable → rotation = redeploy.

## Why no custom hook in the one shot (docs + 21 live launches)
`univ4_hook` = "a hook, its token and its pool" — no second contract (every live hook launch has exactly token + hook + distributor).
A hook that funds the court cannot be bound to Weir trustlessly before Weir exists. **Phase 2 (Kiln pattern, job `720ae500…`):** an
`evm_contracts` launch of Launcher + WeirHook opening a second WEIR/IMD pool with a **0.5% cut in IMD** (ERC-6909 claims, permissionless
`collect()`) sent to `weir.sponsor()`. Weir's address is static by then. Fully trustless, one more 0.5 IMD.

## Checker lessons (2026-10-14)
- `workflow.open` = `{request, context, draft, permissions}`; `request+context+draft.objective ≤ 8,000`; each step objective ≤ 3,000
  (hard 400, counted in characters); whole body ≤ 16 KiB.
- `adversarial-review` must precede `frontend-for-contract` in a chain, else bare `invalid_plan`. Judge is async: re-check ~20 s later.
- State "yes, independent review wanted" and the site's pages in `request`; facts (access/numbers/recipient) are read from text, not required.
- `$token` is the launch-token placeholder for `evm_project` constructor args (live launch 1594 on 4663).

## Submit (owner consent before every spend)
**Payer: a NEW wallet, `<WEIR-PAYER>`**, key in `~/.imd-weir-payer.env` (mode 600, generated 2026-10-14,
never committed). It becomes Weir's requester/owner on the explorer and receives `remainderTo` and the 1% pool-trade fee. NOT the SOVRN
payer (`<OTHER-PAYER>`) and not accumulate-imd's own (`<OTHER-PAYER>`). Fund it on Ethereum mainnet first: ≥ 0.5 IMD + ~0.005 ETH (approve gas).
```
(set -a; . ~/.imd-weir-payer.env; set +a; cd ~/accumulate-imd && \
  node ~/ai/docs/imd/check-payer.mjs ~/.imd-weir-payer.env && \
  node scripts/swarm-submit.mjs check ~/ai/docs/imd/workflow-weir.json && \
  node scripts/swarm-submit.mjs quote ~/ai/docs/imd/workflow-weir.json)   # challenge → approve (allowance 0) → pay
```
`swarm-submit.mjs` reads the shell env first (`process.loadEnvFile` never overrides a set variable), so the sourced file wins over
`~/accumulate-imd/.env`. Follow: `GET https://api.imd.fun/workflows/<id>`.

## SUBMITTED 2026-10-14 20:04 UTC (paid 0.5 IMD, admitted)
Payer `<WEIR-PAYER>`. Permit2 approve tx `<approve-tx>` (block 26193013); payment tx
`<payment-tx>` (confirmed 20:04:53 UTC). Order `<order-id>` (token in `~/accumulate-imd/data/swarm-orders.json`).
**Workflow `bcc8630e-6d05-445b-9f6d-eb47b6bc9080`**, contracts job `1f76ab2a-d781-4e31-a46a-9e9011488e7f`. Economics `poolBps 8900`,
`remainderTo` = payer. Follow: `GET https://api.imd.fun/workflows/bcc8630e-6d05-445b-9f6d-eb47b6bc9080` (stages contracts → deployment →
frontend → publishing → validating → completed; `contracts.repoUrl`, `launch`, `site`), `GET /jobs/1f76ab2a-…` (nodes), explorer
`https://explorer.imd.fun/jobs/1f76ab2a-d781-4e31-a46a-9e9011488e7f`. The launch deploys on Robinhood by itself when the panel accepts.
Payer after: ~1.90 IMD, Permit2 allowance 0 (each further payment needs its own `approve`).
Guard change shipped with it: `swarm-submit.mjs` `workflowDiff` (narrow allow-list for the `{request, rebuilt, stages}` shape IMD repeats on
`workflow.open`), tests in `swarm-submit.test.mjs` (13 pass). Not committed yet.

## COMPLETED 2026-10-14 23:34 UTC — launch 1780 LIVE on Robinhood 4663 (3.5 h after payment)
Workflow `bcc8630e…` `completed`; validation passed first attempt. Admission checks all passed (provenance, findings, independent review,
bytecode, manifest, protected invariants, economics). Contracts repo `identity-md-launches/launch-1780-weir` @ `a01e3ae5`; frontend repo
`identity-md-launches/launch-1790-workflow-frontend-stage-context` @ `a39a8bac`.

| Thing | Address / value |
|---|---|
| WEIR token (`LaunchToken`, 1B, 18 dec) | `0x58b82fa656ecf47a0dca5be6bad06b92e22f7dbe` |
| **Weir** (app contract, 23,817 B runtime) | `0x320de26e4bc988e0c425531e564ded3d2f730d32` |
| Pool WEIR/IMD (v4, fee 12500, ts 60, hook `PoolInitializationGuard`) | currency0 WEIR, currency1 IMD, hooks `0x19bec7c2…6000` |
| MerkleDistributor (10% swarm) | `0xc191fd2af5078ff757dc2b4adac6475f0965f3f8` |
| Site | `https://weir.sites.imd.fun` (CID `bafybeie5lcp7…`, ENS `weir.site.identitymd.eth`) |
| Payer / requester `<WEIR-PAYER>` | 10,000,000 WEIR (1%, tier 0 bps, `canUse` true); 0 IMD on Robinhood; ~1.90 IMD on Ethereum |

Immutables verified on chain: `weir`, `imd`, `intake`, `oracleSigner 0x5598…2982`, `disputeTimeout 604800`, `minHold 10000e18`. `courtFund` = 0.

**What the swarm changed or added vs the spec (read the README before using it):**
- **Receipt id ≠ oracle UUID.** The Intake callback's first argument is the Intake receipt id; the attestation's signed `requestId` is the
  oracle's UUID. Our spec required them equal, which would have refused every real answer. Fixed by the swarm: the callback pairs by receipt
  and consumes the signed UUID once; `submitAttestation` keeps signed-id == stored-id. Verified against IMD's conformance vector.
- **Live oracle price** read from the Intake per dispute (refused above 5 IMD). `ORACLE_PRICE` 5e17 is documentation only.
- **`accept(id)`** (recipient consent): verdict records are written only once the recipient accepted, withdrew or disputed.
- **`dispute(id, note, maxBond)`** 3-arg form caps the bond (a client deposit between quote and dispute can inflate it); 2-arg form unbounded.
- **Deferred payouts + `claim(token)`:** when a bond/refund transfer reverts (blocklist), the amount becomes claimable instead of locking the stream.
- `questionFor(id, disputer, note)`, `expectedBody` with disputer, `oraclePrice()`, `MAX_TERMS_URI_BYTES 512`, `MAX_QUESTION_BYTES 2000`.
- Judge's final verdict: 159 tests pass; callback 152,131 gas (over our 150k wish by 2k, under the 200k stipend).

**OPEN LOW finding, deployed unfixed (judge's last round):** a token that returns `false` without moving funds (some blocklists) is not
caught by the revert-based deferral, so `onFailure`/`expireDispute` revert and that stream stays Disputed with the client's principal locked.
Only bites a blocked disputer on a false-returning token. Fix is a one-condition change → candidate for a phase-2 contract version.
Also disclosed, by design: the court fund can be drained by dust-stake disputes (zero bond at tier 0 / tiny stake) — do not fund it
generously until a quota exists; the note/termsURI are spliced unquoted into the question (fixed template).

**Next:** (1) try the site with the payer wallet (holds 10M WEIR → eligible); (2) decide whether to seed `courtFund` at all given the drain
note; (3) mirror both repos into the SwarmStream/swarmstream (rename) org; (4) phase 2: Kiln-style hook launch feeding `sponsor()`, and the
false-return fix; (5) one real dispute on a throwaway stream to prove `evidence: "panel"` end to end (0.5 IMD).

## Phase 2 drafted 2026-10-14: Kiln-style hook feeding the court fund — `docs/imd/launch-weir-hook.json` (NOT quoted, NOT paid)
`launch.open`, `onchain: evm_contracts`, Robinhood 4663, one payment (0.5 IMD; payer allowance is 0 again → `approve` first). Generator
`docs/imd/launch-weir-hook.gen.py`. Passes the free check; plan = build → tests → 4 audit specialists → judge.
- Launcher(weir, imd, poolManager `0x8366…0951`, court `0x320d…0d32`) in launch.json; `open(salt, sqrtPriceX96)` once: CREATE2 WeirHook
  (bits 0x00CC), initializes a NEW WEIR/IMD pool (lpFee **3000** = 0.30%, tickSpacing 60), adopts a pre-initialized pool like Kiln.
- WeirHook: 0.5% of the IMD side on every swap, in IMD, ERC-6909 claims; `collect()` permissionless → burn + take → `court.sponsor()`
  in the same call; hook holds nothing after. Any router accepted (Universal Router / Quoter / StateView work). No owner, no withdraw.
- After the launch (manual, like Kiln 1138): mine a salt (`initCodeHash()`, `hookAddress(salt)`), call `open()` with the factory pool's
  slot0 price, then add a WEIR-only position from the payer's 10M WEIR via the v4 PositionManager on 4663 (payer needs ETH there for gas).
- Trade-off to confirm: the hooked pool costs traders 0.80% (0.30% LP + 0.50% court) vs 1.25% on the factory pool, so volume may move
  off the pool that pays the payer 1%. Raise lpFee if that matters.
- Caveat carried from the audit: the court fund is drainable by dust disputes; the hook feeds it continuously.

## Open
- Whether `evidence: "panel"` accepts a judgement about off-chain deliverables (0.5 IMD test possible).
- Name "Weir" final? Runner-up "Tributary" (TRIB). Token name/symbol, MIN_HOLD, tiers, pairing: as above unless changed.
