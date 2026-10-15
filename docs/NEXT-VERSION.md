# Notes for the next Weir contract version

Decisions and open ideas collected while shipping v2 (2026-10-15). None of these are in the v2 contract deployed from commit `291fe2f`.

## Hold gate and bond tiers
- **Minimum hold.** v2 uses 10,000 WEIR (about 0.025 IMD at the 2026-10-15 pool price of roughly 0.0000025 IMD per WEIR). Plan for 90,000 WEIR next. The launch's swarm allocation went to 339 wallets; the smallest and median allocation is 90,090 WEIR, the largest about 4.59M. A 90,000 minimum admits every one of them and costs an outsider about 0.23 IMD.
- **The gate is a speed bump, not a cost.** Holdings are not locked, so the real cost of using it is the pool's round-trip fee (about 2.5%) and tokens can serve many wallets in turn. The protections that cost an attacker something are the non-refundable 20% fee share and the five-per-day subsidy limit.
- **Tier thresholds float with the token price.** 100,000 / 1M / 10M WEIR are about 0.25 / 2.5 / 25 IMD today, so a small position gets a zero bond. Reset them to match where holders actually sit (the median airdrop is 90,090, just under the first tier), or add a fixed minimum bond in IMD that does not depend on WEIR's price. Any change is a contract change and needs its own audit.
- **Open question:** how many of the 339 airdrop wallets have actually claimed? The launch record shows no claims.

## Oracle signer
Keep it immutable. A changeable signer needs an admin who could decide every dispute. If IMD rotates its key, new rulings stop verifying, disputes fall back to expiry and bonds come back, and a redeploy rotates it. The Intake's published `signer()` is its quote-signing key, not the attestation key, so there is no on-chain value to follow.

## Court fund
- Disputer share 20% and five subsidised disputes per UTC day are constants. A fixed UTC-day window lets ten disputes through around midnight. A rolling window or a smaller daily limit would tighten it.
- Alternative design: sponsors fund a specific stream's dispute fee instead of a shared pool, which strangers cannot drain. It removes the "court fund" feature.

## Contract hygiene
- The Weir runtime is 24,533 bytes against the 24,576 limit (optimizer_runs 1). Any addition needs trimming first; the two subsidy counters stayed internal for this reason.
- Make the next version smaller before adding features, or split the oracle consumer into a library.
- Hostile-token tests from day one: gas-burning `transfer` and `balanceOf`, false and non-bool returns.
- Always get an independent review of the fixes themselves. The two Low findings in the v2 review were introduced while fixing v1.

## Process
- Check size caps (IMD allows 8 MiB of unique git blobs per job), allowed paths and the hosting field in any paid request before paying.
- A redeploy against the same WEIR token needs no new token or pool, but it is a new address with empty state; old streams stay on the old contract and users must switch.
