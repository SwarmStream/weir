# IMD swarm job requests for Weir

These are the request bodies sent to IMD (imd.fun) to launch and update Weir. They are reference records.

- `workflow-weir.json` / `.gen.py`: the one-shot launch (token, contract, site). The generator builds the JSON.
- `launch-weir-hook.*`: a parked phase-2 idea, not submitted.
- `job-weir-site-*.json`: the website update jobs (the first two are what was tried; `-host` is the one that worked, a host-only continue that repoints the site name).
- `../archive/`: the earlier SwarmStream (Sablier wrapper) plan, superseded by Weir.

Payer wallet addresses, order ids and payment transaction hashes are redacted (`<WEIR-PAYER>` and so on), so a redacted request is a record, not something to resubmit as is.

The submit and payment tool is not here. It is `scripts/swarm-submit.mjs` in the Accumulate IMD repo and is shared by every project that buys swarm jobs. Payer keys live outside all repos.
