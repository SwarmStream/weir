#!/usr/bin/env node
// MCP server (stdio) over the Weir SDK. Read tools always work; write tools need WEIR_PRIVATE_KEY.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Hex } from "viem";
import { createWeir, describeError, links, rules } from "./index.js";

const key = process.env.WEIR_PRIVATE_KEY?.trim();
const rpc = process.env.WEIR_RPC_URLS?.split(",").map((s) => s.trim()).filter(Boolean);
const weir = createWeir({ privateKey: key ? (key as Hex) : undefined, rpcUrls: rpc?.length ? rpc : undefined });

const server = new McpServer({ name: "weir", version: "0.1.0" });

const json = (v: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x), 2) }] });
const fail = (e: unknown) => ({ content: [{ type: "text" as const, text: describeError(e).message }], isError: true });
const run = async (f: () => Promise<unknown>) => { try { return json(await f()); } catch (e) { return fail(e); } };

const id = z.string().describe("Stream id (decimal)");
const addr = z.string().optional().describe("Address; defaults to the signer");
const amt = z.string().describe("Decimal amount in token units, e.g. \"12.5\"");

server.registerTool("weir_info", {
  title: "Weir overview",
  description: `Contract addresses, chain, hold minimum, oracle price, court fund, rules, known tokens, and the signer (if any). Read this first. Rules: ${JSON.stringify(rules)}`,
  inputSchema: {},
}, () => run(() => weir.info()));

server.registerTool("weir_can_use", {
  title: "Check eligibility",
  description: "Whether an address holds enough WEIR to create streams or dispute, its bond tier, and where to buy WEIR.",
  inputSchema: { address: addr },
}, ({ address }) => run(() => weir.canUse(address as Hex | undefined)));

server.registerTool("weir_stream", {
  title: "Read a stream",
  description: "Full state of one stream at one block: parties, token, per-day rate, streamed, withdrawable, refundable, terms, dispute status, links.",
  inputSchema: { id },
}, ({ id }) => run(() => weir.stream(id)));

server.registerTool("weir_my_streams", {
  title: "List streams",
  description: "Stream ids where an address is client or recipient (scans StreamCreated events from deployment; can take a while on public RPC).",
  inputSchema: { address: addr, fromBlock: z.string().optional().describe("Start block (default: deployment block)") },
}, ({ address, fromBlock }) => run(() => weir.streamsOf(address as Hex | undefined, { fromBlock: fromBlock ? BigInt(fromBlock) : undefined })));

server.registerTool("weir_activity", {
  title: "Stream activity",
  description: "Every Weir event about one stream, oldest first (created, deposits, pauses, disputes, question, verdict, enforced...).",
  inputSchema: { id, fromBlock: z.string().optional() },
}, ({ id, fromBlock }) => run(() => weir.activity(id, { fromBlock: fromBlock ? BigInt(fromBlock) : undefined })));

server.registerTool("weir_records", {
  title: "Dispute records",
  description: "Won/lost counters for an address as client and as recipient.",
  inputSchema: { address: addr },
}, ({ address }) => run(() => weir.records(address as Hex | undefined)));

server.registerTool("weir_quote_dispute", {
  title: "Quote a dispute",
  description: "What disputing would cost now (bond, oracle fee share, court fund status) and the exact question reviewers would see. Call before weir_dispute.",
  inputSchema: { id, note: z.string().describe("Your dispute note, ≤ 280 bytes; quoted verbatim to the reviewers"), address: addr },
}, ({ id, note, address }) => run(() => weir.quoteDispute(id, note, address as Hex | undefined)));

server.registerTool("weir_claimable", {
  title: "Deferred payout",
  description: "Amount of a token a payout was deferred for (when the token refused a transfer at settlement) that the address can claim.",
  inputSchema: { token: z.string().describe("Symbol (USDG, WEIR, IMD, WETH) or address"), address: addr },
}, ({ token, address }) => run(() => weir.claimable(token, address as Hex | undefined)));

// ----- writes -----
const needKey = "Requires WEIR_PRIVATE_KEY. Simulated first; approves the exact amount; returns tx hash and explorer link.";

server.registerTool("weir_create_stream", {
  title: "Create a stream",
  description: `Fund a per-second stream to a recipient under written terms. ${needKey} Terms are quoted verbatim to reviewers in a dispute: say what is delivered, by when (UTC), and how it is judged. ≤ 512 bytes on chain.`,
  inputSchema: {
    recipient: z.string(),
    token: z.string().optional().describe("USDG, WEIR, IMD, WETH or an ERC-20 address. Default WEIR."),
    perDay: z.string().describe("Decimal amount per day, e.g. \"40\""),
    deposit: amt.describe("Initial deposit; the stream runs deposit ÷ perDay days"),
    terms: z.string().describe("Full terms text (hashed on chain; stored verbatim if ≤ 512 bytes)"),
    termsURI: z.string().optional().describe("Short on-chain text when terms are long: summary plus a public link"),
    jobId: z.string().optional().describe("IMD job UUID or bytes32"),
  },
}, (a) => run(() => weir.createStream(a)));

server.registerTool("weir_deposit", { title: "Deposit", description: `Client adds funds to a stream (also while disputed). ${needKey}`, inputSchema: { id, amount: amt } },
  ({ id, amount }) => run(() => weir.deposit(id, amount)));
server.registerTool("weir_pause", { title: "Pause", description: `Client pauses the stream (rate to zero, resumable). ${needKey}`, inputSchema: { id } },
  ({ id }) => run(() => weir.pause(id)));
server.registerTool("weir_restart", { title: "Restart", description: `Client restarts a paused stream at its saved rate or a new perDay. ${needKey}`, inputSchema: { id, perDay: z.string().optional() } },
  ({ id, perDay }) => run(() => weir.restart(id, perDay)));
server.registerTool("weir_adjust", { title: "Adjust rate", description: `Client changes the per-day rate of a running stream. ${needKey}`, inputSchema: { id, perDay: z.string() } },
  ({ id, perDay }) => run(() => weir.adjust(id, perDay)));
server.registerTool("weir_refund", { title: "Refund", description: `Client takes back unstreamed funds (all of them if amount omitted). The stream stays open. ${needKey}`, inputSchema: { id, amount: z.string().optional() } },
  ({ id, amount }) => run(() => weir.refund(id, amount)));
server.registerTool("weir_void", { title: "Close stream", description: `Client closes the stream: unstreamed funds return, recipient keeps what streamed. Irreversible. ${needKey}`, inputSchema: { id } },
  ({ id }) => run(() => weir.void(id)));
server.registerTool("weir_accept", { title: "Accept terms", description: `Recipient records assent to the terms (optional; after this, rulings count in both parties' records). ${needKey}`, inputSchema: { id } },
  ({ id }) => run(() => weir.accept(id)));
server.registerTool("weir_withdraw", { title: "Withdraw", description: `Recipient withdraws what has streamed (all of it if amount omitted). Works in any state. ${needKey}`, inputSchema: { id, amount: z.string().optional() } },
  ({ id, amount }) => run(() => weir.withdraw(id, amount)));

server.registerTool("weir_dispute", {
  title: "Raise a dispute",
  description: `Pause the stream and ask the five-reviewer panel whether the work was delivered. Posts the bond and at least 20% of the oracle fee (spent even if the panel cannot agree). ${needKey} Quote first with weir_quote_dispute.`,
  inputSchema: { id, note: z.string().describe("≤ 280 bytes, quoted verbatim to reviewers; cite evidence"), maxBond: z.string().optional().describe("Cap on the bond in minor units; defaults to the quoted bond") },
}, ({ id, note, maxBond }) => run(() => weir.dispute(id, note, { maxBond: maxBond ? BigInt(maxBond) : undefined })));

server.registerTool("weir_wait_for_ruling", {
  title: "Wait for ruling",
  description: "Poll a disputed stream until the panel rules, the dispute fails, or the timeout passes. Optionally enforce automatically.",
  inputSchema: { id, autoEnforce: z.boolean().optional(), timeoutMinutes: z.number().optional().describe("Default 30"), pollSeconds: z.number().optional().describe("Default 15") },
}, ({ id, autoEnforce, timeoutMinutes, pollSeconds }) => run(() => weir.waitForRuling(id, { autoEnforce, timeoutMs: (timeoutMinutes ?? 30) * 60_000, pollMs: (pollSeconds ?? 15) * 1000 })));

server.registerTool("weir_enforce", { title: "Enforce ruling", description: `Apply a delivered ruling (anyone). Delivered: stream resumes. Not delivered: stream closes, unstreamed funds to client. Pays the bond to the winner. ${needKey}`, inputSchema: { id } },
  ({ id }) => run(() => weir.enforce(id)));
server.registerTool("weir_expire_dispute", { title: "Expire dispute", description: `After 7 days with no ruling, anyone releases the dispute; the bond returns to the disputer and the stream is active again. ${needKey}`, inputSchema: { id } },
  ({ id }) => run(() => weir.expireDispute(id)));
server.registerTool("weir_sponsor", { title: "Sponsor court fund", description: `Add IMD to the shared court fund that subsidises dispute fees. Irreversible gift. ${needKey}`, inputSchema: { amount: amt.describe("IMD amount") } },
  ({ amount }) => run(() => weir.sponsor(amount)));
server.registerTool("weir_claim", { title: "Claim deferred payout", description: `Collect a settlement payout the token refused to deliver earlier. ${needKey}`, inputSchema: { token: z.string() } },
  ({ token }) => run(() => weir.claim(token)));

server.registerResource("skill", "weir://skill", { title: "Weir skill", description: "How agents should use Weir", mimeType: "text/markdown" }, async () => {
  const { readFile } = await import("node:fs/promises");
  const url = new URL("../SKILL.md", import.meta.url);
  return { contents: [{ uri: "weir://skill", mimeType: "text/markdown", text: await readFile(url, "utf8").catch(() => `See ${links.site}/skill.md`) }] };
});

await server.connect(new StdioServerTransport());
