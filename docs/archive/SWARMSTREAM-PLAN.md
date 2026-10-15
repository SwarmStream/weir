# SwarmStream — one-shot IMD company launch (token + contracts + audit panel + site)

Drafted 2026-10-14. Repo `github.com/SwarmStream/swarmstream` (public, EMPTY: no branch, no commit).
**Request: `docs/imd/workflow-swarmstream.json`** (`workflow.open`, generator `docs/imd/workflow-swarmstream.gen.py`).
Passes the free check. **NOT quoted, NOT paid.** Superseded draft (contracts-only `job.open`): `docs/imd/job-swarmstream.json`.

## What the one shot buys (0.5 IMD, `workflow.open`)
Stages: contracts → deployment → frontend → publishing → validating → completed. Plan accepted by the checker:
`build-contract-project → write-foundry-tests → adversarial-review (replaced by 4 audit-specialists + audit-judge on a launch) → [deploy] → frontend-for-contract → [host]`.
- **Token:** `onchain: evm_project` = the network's fixed launch token (1,000,000,000, 18 dec, plain transfers). Name/symbol read from the
  text: **SwarmStream / STREAM** (placeholder; owner to confirm). 10% to the swarm, 90% to the requester: `poolBps` of it seeds the pool
  single-sided (policy default 80%), the rest to `remainderTo` (default: the paying wallet). Pool fee 1.25% (1% to the paying wallet).
- **Chain / pair:** Robinhood 4663, `pairWith: imd`. Flow, Intake and IMD all exist there. (Base is out: no oracle sales there.)
- **Contracts:** one, `SwarmStream.sol`, flat 7-arg constructor; `launch.json` constructorArgs
  `["$token", FLOW 0x6a99…a922, INTAKE 0xa43e…de82, IMD 0x5f7b…7127, SIGNER 0x5598…2982, "604800", "10000000000000000000000"]`.
  `$token` = the launch token (placeholder confirmed from live launch 1594 on 4663).
- **Site:** `frontend-for-contract`, label `swarmstream` → `https://swarmstream.sites.imd.fun` (plus IPFS pin). Reads addresses from
  `.imd/reads/deployment.json`. Custom domain: not documented; CNAME later ourselves.
- **Audits:** the launch's audit panel (4 specialists + judge) gates deployment. Not an independent audit; README says so.

## Product decisions in the request (owner 2026-10-14: "No fee, but to use the product you must hold the token")
1. **Hold gate, no fee.** `createJobStream` and `dispute` require `STREAM.balanceOf(msg.sender) >= MIN_HOLD` (immutable; 10,000 STREAM at
   launch = 0.001% of supply). Nothing else uses the token. The recipient withdraws on Flow directly (cannot be gated).
2. **No Sablier fork.** `SablierFlow.sol` is BUSL-1.1 (interfaces GPL). Wrapper is the stream's *sender* on canonical Flow v3.0.
3. **Dispute = one `oracle.request`** (0.5 IMD from the disputer, spent even if the panel disagrees): bool question, `evidence: panel`,
   panel 5 / quorum 4, 24h window, valid 7 days. Accepted → resume at the stored rate; rejected → void + refund remainder to client.
4. **Callback never touches Flow** (200k gas): it records the ruling; `enforce()` is permissionless; `submitAttestation()` covers a missed
   callback; `expireDispute()` after 7 days; `onFailure` returns the stream to Active (paused).
5. Ownerless, immutable, no admin, no upgrade. Oracle signer immutable → signer rotation means redeploy.

## Checker lessons (2026-10-14)
- `workflow.open` body = `{request, context, draft, permissions}`; `request + context + draft.objective ≤ 8,000`; step objective ≤ 3,000.
- **`adversarial-review` must come BEFORE `frontend-for-contract`** in the chain (the site runs after deployment). Review after the
  frontend → `invalid_plan: Correct the invalid original plan before rebuilding.` with no other hint.
- The semantic judge is async: a new body can answer `evaluation_unavailable`; check again ~20 s later.
- `recheck_failed` asked for an explicit sentence that an independent security review is wanted; `missing_fact` wanted the site's pages
  in the request text (the draft objective alone was not read for it).
- The `facts` block (access / numbers / recipient) stays "unknown" even when stated in `context`; they are not required.

## Submit (owner consent before every spend)
```
(set -a; . ~/.imd-sovrn-payer.env; set +a; cd ~/accumulate-imd && \
  node scripts/swarm-submit.mjs check  ~/ai/docs/imd/workflow-swarmstream.json && \
  node scripts/swarm-submit.mjs quote  ~/ai/docs/imd/workflow-swarmstream.json)   # challenge → approve (allowance 0) → pay
```
Payer `<OTHER-PAYER>` held ~0.34 IMD on 2026-10-10: top up ≥ 0.5 IMD first. The paying wallet becomes `owner`/requester (90% allocation,
1% pool fee): choose it deliberately. Follow: `GET https://api.imd.fun/workflows/<id>` (stages, `contracts.repoUrl`, `site`).

## Open questions
- Whether `evidence: "panel"` accepts a judgement about off-chain deliverables (docs: "off-chain sources, panel consensus"). Cheap test:
  one real `oracle.request` with the template (0.5 IMD) before or after the build.
- Token name/symbol, MIN_HOLD, pairing (IMD vs ETH), `economics` (poolBps/remainderTo) — placeholders chosen, owner to confirm.
- Mirroring the delivered repo into `SwarmStream/swarmstream` (IMD delivers to `identity-md-launches/…`).
