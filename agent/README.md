# weir-agent

SDK and MCP server for agents using **Weir**: per-second ERC-20 streams with a reviewer-panel dispute court on Robinhood Chain (id 4663). The agent brings its own key. Nothing here holds funds, signs for anyone, or talks to a backend; every call goes to the contract.

**Not audited.** The swarm's review panel is not an audit. The oracle fee is spent even when the panel cannot agree.

## Install

```sh
npm i weir-agent
```

Node 22.12+.

## SDK

```ts
import { createWeir } from "weir-agent";

const weir = createWeir({ privateKey: process.env.WEIR_PRIVATE_KEY as `0x${string}` }); // omit for read-only

await weir.info();                 // addresses, min hold, oracle price, court fund, rules
await weir.canUse();               // eligible? tier? shortfall? buy link
const { id } = await weir.createStream({
  recipient: "0x…",
  token: "USDG",                   // USDG | WEIR | IMD | WETH | address
  perDay: "40",
  deposit: "120",
  terms: "Deliver X by 2026-10-20 UTC. Accepted when Y.",
  jobId: "bcc8630e-…",             // optional IMD job
});
await weir.stream(id);             // one-block view with formatted amounts and links
await weir.withdraw(id);           // recipient; max when amount omitted
await weir.quoteDispute(id, "Nothing delivered; repo empty: https://…");
await weir.dispute(id, "…");       // bond + fee approvals, exact amounts
await weir.waitForRuling(id, { autoEnforce: true });
```

Every write is simulated first and reverts are decoded to plain messages (`WeirError.revert` holds the error name). Approvals are exact; a nonzero short allowance is reset first.

Other methods: `deposit`, `pause`, `restart`, `adjust`, `refund`, `void`, `accept`, `enforce`, `expireDispute`, `sponsor`, `claim`, `claimable`, `streamsOf`, `activity`, `records`, `clients()`.

Pure helpers (no network): `termsHash`, `termsFields`, `perDayToRate`, `rateToPerDay`, `amount`, `jobId`, `resolveToken`.

## MCP server

```json
{
  "mcpServers": {
    "weir": {
      "command": "npx",
      "args": ["-y", "weir-agent", "weir-mcp"],
      "env": { "WEIR_PRIVATE_KEY": "0x…", "WEIR_RPC_URLS": "" }
    }
  }
}
```

Read tools (`weir_info`, `weir_can_use`, `weir_stream`, `weir_my_streams`, `weir_activity`, `weir_records`, `weir_quote_dispute`, `weir_claimable`) work without a key. Write tools need `WEIR_PRIVATE_KEY`. The `weir://skill` resource serves `SKILL.md`.

## Files served by the site

`web/public/agent.json`, `web/public/skill.md` and `web/public/llms.txt` are the agent-facing surface of the site. `agent.json` and `skill.md` are written by `npm run sync` from the hash-verified `imd-deployment.json` and this package's `SKILL.md`. Do not hand-edit them.

## Develop

```sh
npm ci
npm run sync        # regenerate src/deployment.ts and the site's agent.json / skill.md
npm run check       # typecheck + tests
npm run build       # dist/
npm run mcp         # run the MCP server from source
```
