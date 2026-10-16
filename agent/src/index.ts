// Weir agent SDK: thin, typed helpers over viem for the deployed Weir contract.
// The agent brings its own key; nothing here holds funds or signs on anyone's behalf.
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  erc20Abi,
  fallback,
  formatUnits,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseUnits,
  toBytes,
  zeroAddress,
  zeroHash,
  type Account,
  type Address,
  type Hex,
  type Log,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { deployment, knownTokens, links, rules, weirAbi } from "./deployment.js";

export { deployment, knownTokens, links, rules, weirAbi };

export const UINT128_MAX = (1n << 128n) - 1n;
export const SECONDS_PER_DAY = 86_400n;
export const STATES = ["None", "Active", "Disputed", "Ruled", "Closed"] as const;
export type Status = "Active" | "Paused" | "Disputed" | "Ruled" | "Closed" | "Unknown";

export const chain = defineChain({
  id: deployment.chainId,
  name: deployment.network.name,
  nativeCurrency: deployment.network.nativeCurrency,
  rpcUrls: { default: { http: [...deployment.network.rpcUrls] } },
  blockExplorers: { default: { name: "Explorer", url: deployment.network.explorer } },
});

// ---------- pure helpers (no network) ----------

export const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** keccak256 of the UTF-8 terms text; this is what the contract stores and what reviewers are shown. */
export const termsHash = (terms: string): Hex => keccak256(toBytes(terms));

/** Rate per second from a per-day amount, rounded down to a whole minor unit (same as the site). */
export function perDayToRate(perDay: bigint): bigint {
  const rate = perDay / SECONDS_PER_DAY;
  if (rate <= 0n) throw new WeirError("That daily amount is below one minor unit per second. Raise it.");
  if (rate > UINT128_MAX) throw new WeirError("Rate exceeds the contract limit.");
  return rate;
}
export const rateToPerDay = (rate: bigint) => rate * SECONDS_PER_DAY;

/** Parse a decimal string amount into minor units, rejecting excess precision instead of rounding. */
export function amount(value: string | number | bigint, decimals: number, max = (1n << 256n) - 1n): bigint {
  if (typeof value === "bigint") return value;
  const v = String(value).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(v)) throw new WeirError(`Bad amount "${v}": use digits and a decimal point.`);
  if ((v.split(".")[1]?.length ?? 0) > decimals) throw new WeirError(`Use at most ${decimals} decimal places for this token.`);
  const parsed = parseUnits(v, decimals);
  if (parsed <= 0n) throw new WeirError("Amount must be greater than zero.");
  if (parsed > max) throw new WeirError("Amount exceeds the contract limit.");
  return parsed;
}

export function address(value: string): Address {
  const v = value.trim();
  if (!isAddress(v) || v.toLowerCase() === zeroAddress) throw new WeirError(`"${value}" is not a valid nonzero address.`);
  return getAddress(v);
}

/** IMD job id: a UUID (left-aligned in bytes32, as the site does) or a 32-byte hex. Empty means none. */
export function jobId(value?: string): Hex {
  const v = (value ?? "").trim();
  if (!v) return zeroHash;
  if (/^0x[0-9a-fA-F]{64}$/.test(v)) return v as Hex;
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v))
    return `0x${v.replaceAll("-", "")}${"0".repeat(32)}` as Hex;
  throw new WeirError("jobId must be an IMD job UUID or a 32-byte hex id.");
}

/** Resolve a known symbol (USDG, WEIR, IMD, WETH) or an address. */
export function resolveToken(value?: string): Address {
  if (!value) return deployment.weirToken as Address;
  const known = knownTokens.find((t) => t.symbol.toLowerCase() === value.trim().toLowerCase());
  return known ? getAddress(known.address) : address(value);
}

/** What the on-chain terms fields should be for the given terms text (and optional short URI). */
export function termsFields(terms: string, termsURI?: string): { termsHash: Hex; termsURI: string } {
  const text = terms.trim();
  if (!text) throw new WeirError("Terms are required: say what is delivered, by when, and how it is judged.");
  const uri = (termsURI ?? "").trim() || text;
  const bytes = byteLength(uri);
  if (bytes > rules.maxTermsUriBytes)
    throw new WeirError(
      `Terms text is ${bytes} bytes; the chain stores at most ${rules.maxTermsUriBytes}. Pass the full text as "terms" (it is hashed) and a short summary plus a public link as "termsURI".`,
    );
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(uri)) throw new WeirError("termsURI must not contain control characters.");
  return { termsHash: termsHash(text), termsURI: uri };
}

export function statusOf(s: { state: number; rate: bigint }): Status {
  if (s.state === 1) return s.rate === 0n ? "Paused" : "Active";
  return (["Unknown", "", "Disputed", "Ruled", "Closed"][s.state] as Status) ?? "Unknown";
}

export const explorer = {
  tx: (hash: Hex) => `${deployment.network.explorer}/tx/${hash}`,
  address: (a: Address) => `${deployment.network.explorer}/address/${a}`,
  oracle: (id: bigint, contract: Address = deployment.weir as Address) =>
    `${links.imdExplorer}/oracle?q=${encodeURIComponent(`Weir stream ${id} at ${contract}`)}`,
  job: (id: Hex) => (id === zeroHash ? undefined : `${links.imdExplorer}/jobs/${displayJob(id)}`),
  intakeStatus: (tx: Hex) => `${links.imdApi}/intake/${deployment.chainId}/${tx}`,
  stream: (id: bigint) => `${links.site}/#/stream/${id}`,
};
export function displayJob(id: Hex): string {
  if (id.endsWith("0".repeat(32))) {
    const s = id.slice(2, 34);
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  }
  return id;
}

// ---------- errors ----------

export class WeirError extends Error {
  constructor(message: string, public readonly revert?: string) {
    super(message);
    this.name = "WeirError";
  }
}
const REVERTS: Record<string, string> = {
  HoldRequired: `This wallet holds less than the minimum WEIR (${rules.minHoldWeir}) needed to create a stream or raise a dispute.`,
  NotClient: "Only this stream's client can do that.",
  NotRecipient: "Only this stream's recipient can do that.",
  NotParty: "Only the client or recipient can raise this dispute.",
  UnknownStream: "This stream id does not exist.",
  WrongState: "The stream is not in a state that allows this action. Read it again.",
  AlreadyPaused: "The stream is already paused.",
  NotPaused: "Pause the stream before restarting it.",
  DisputeNotExpired: "The dispute timeout (7 days) has not passed yet.",
  AmountExceedsAvailable: "The amount exceeds what is available right now. Use the max variant or a smaller amount.",
  BondExceedsLimit: "The bond rose above maxBond since the quote. Quote again.",
  NoStake: "There are no funds left in this stream to dispute.",
  ZeroAmount: "Amount must be greater than zero.",
  ZeroRate: "Rate must be greater than zero.",
  ZeroTermsHash: "Terms hash must be nonzero.",
  InvalidRecipient: "Recipient must not be the sender or the Weir contract.",
  ZeroAddress: "Address must be nonzero.",
  TextTooLong: "Text exceeds the byte limit.",
  InvalidUTF8: "Text must be valid UTF-8 without control characters.",
  AlreadyAccepted: "These terms were already accepted.",
  NothingToClaim: "No deferred payout to claim for this token.",
  OraclePriceOutOfRange: "The oracle price is zero or above the 5 IMD cap; disputes are refused right now.",
  TransferMismatch: "The token did not move the exact amount (fee-on-transfer or blocklisted).",
  Insolvent: "Contract accounting would go insolvent for this token; refused.",
  InvalidRequestId: "The Intake returned an unusable request id.",
};
export function describeError(e: unknown): WeirError {
  if (e instanceof WeirError) return e;
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = revert?.data?.errorName;
    if (name) {
      const args = revert?.data?.args?.map(String).join(", ");
      return new WeirError(`${REVERTS[name] ?? name}${args ? ` (${name}: ${args})` : ` (${name})`}`, name);
    }
    return new WeirError(e.shortMessage || e.message);
  }
  return new WeirError(e instanceof Error ? e.message : String(e));
}

// ---------- client ----------

export type WeirOptions = {
  /** RPC endpoints, tried in order. Defaults to the deployment's public endpoints. */
  rpcUrls?: string[];
  /** Hex private key for write actions. Omit for read-only. */
  privateKey?: Hex;
  /** A viem account, as an alternative to privateKey. */
  account?: Account;
  /** Another Weir deployment with the same ABI (e.g. the previous contract to read old streams). */
  address?: Address;
  /** First block to scan for events when `address` is overridden. */
  deployedBlock?: bigint;
};

export type StreamView = {
  id: bigint;
  status: Status;
  state: number;
  client: Address;
  recipient: Address;
  token: Address;
  tokenSymbol: string;
  tokenDecimals: number;
  rate: bigint;
  pausedRate: bigint;
  perDay: bigint;
  balance: bigint;
  withdrawn: bigint;
  streamed: bigint;
  withdrawable: bigint;
  refundable: bigint;
  stake: bigint;
  termsHash: Hex;
  termsURI: string;
  imdJobId: Hex;
  acceptedAt: bigint;
  requestId: Hex;
  disputedAt: bigint;
  disputer: Address;
  bond: bigint;
  ruling: "none" | "delivered" | "not delivered";
  blockNumber: bigint;
  formatted: Record<"perDay" | "balance" | "withdrawn" | "streamed" | "withdrawable" | "refundable" | "stake" | "bond", string>;
  links: { stream: string; oracle: string; job?: string; contract: string };
};

export type TxResult = { hash: Hex; blockNumber: bigint; explorer: string };

export function createWeir(opts: WeirOptions = {}) {
  const transport = fallback((opts.rpcUrls ?? [...deployment.network.rpcUrls]).map((u) => http(u, { batch: true, retryCount: 2 })));
  const pub: PublicClient = createPublicClient({ chain, transport });
  const account = opts.account ?? (opts.privateKey ? privateKeyToAccount(opts.privateKey) : undefined);
  const wallet: WalletClient | undefined = account ? createWalletClient({ chain, transport, account }) : undefined;
  const weir = { address: opts.address ?? (deployment.weir as Address), abi: weirAbi } as const;
  const firstBlock = opts.deployedBlock ?? BigInt(deployment.deployedBlock);
  const imd = deployment.imd as Address;

  const read = <T,>(functionName: string, args: readonly unknown[] = [], blockNumber?: bigint) =>
    pub.readContract({ ...weir, functionName, args, blockNumber } as never) as Promise<T>;

  const tokenMeta = new Map<string, { symbol: string; decimals: number }>();
  async function token(addr: Address) {
    const key = addr.toLowerCase();
    const cached = tokenMeta.get(key);
    if (cached) return cached;
    const [symbol, decimals] = await Promise.all([
      pub.readContract({ address: addr, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
      pub.readContract({ address: addr, abi: erc20Abi, functionName: "decimals" }),
    ]);
    const meta = { symbol, decimals: Number(decimals) };
    tokenMeta.set(key, meta);
    return meta;
  }

  function requireAccount(): Account {
    if (!account || !wallet) throw new WeirError("No signer: pass privateKey or account to createWeir for write actions.");
    return account;
  }

  async function send(functionName: string, args: readonly unknown[], label = functionName): Promise<TxResult & { logs: Log[] }> {
    const from = requireAccount();
    try {
      const { request } = await pub.simulateContract({ ...weir, functionName, args, account: from } as never);
      const hash = await wallet!.writeContract(request as never);
      const receipt = await pub.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new WeirError(`${label} reverted on chain: ${explorer.tx(hash)}`);
      return { hash, blockNumber: receipt.blockNumber, explorer: explorer.tx(hash), logs: receipt.logs };
    } catch (e) {
      throw describeError(e);
    }
  }

  /** Exact-amount approval to Weir, resetting a nonzero short allowance first (as the site does). */
  async function approve(tokenAddr: Address, needed: bigint): Promise<TxResult[]> {
    const from = requireAccount();
    if (needed === 0n) return [];
    const current = await pub.readContract({ address: tokenAddr, abi: erc20Abi, functionName: "allowance", args: [from.address, weir.address] });
    if (current >= needed) return [];
    const out: TxResult[] = [];
    const steps = current > 0n ? [0n, needed] : [needed];
    for (const value of steps) {
      try {
        const { request } = await pub.simulateContract({ address: tokenAddr, abi: erc20Abi, functionName: "approve", args: [weir.address, value], account: from });
        const hash = await wallet!.writeContract(request);
        const receipt = await pub.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new WeirError(`approve reverted: ${explorer.tx(hash)}`);
        out.push({ hash, blockNumber: receipt.blockNumber, explorer: explorer.tx(hash) });
      } catch (e) {
        throw describeError(e);
      }
    }
    return out;
  }

  async function requireBalance(tokenAddr: Address, needed: bigint, what: string) {
    const from = requireAccount();
    const bal = await pub.readContract({ address: tokenAddr, abi: erc20Abi, functionName: "balanceOf", args: [from.address] });
    if (bal < needed) {
      const m = await token(tokenAddr);
      throw new WeirError(`Not enough ${m.symbol} for ${what}: have ${formatUnits(bal, m.decimals)}, need ${formatUnits(needed, m.decimals)}.`);
    }
  }

  // ----- reads -----

  async function info() {
    const [minHold, oraclePrice, courtFund, disputeTimeout, streamCount, blockNumber] = await Promise.all([
      read<bigint>("minHold"),
      read<bigint>("oraclePrice"),
      read<bigint>("courtFund"),
      read<bigint>("disputeTimeout"),
      read<bigint>("streamCount"),
      pub.getBlockNumber(),
    ]);
    return {
      chainId: deployment.chainId,
      weir: weir.address,
      weirToken: deployment.weirToken as Address,
      imd,
      minHold,
      minHoldFormatted: formatUnits(minHold, 18) + " WEIR",
      oraclePrice,
      oraclePriceFormatted: formatUnits(oraclePrice, 18) + " IMD",
      courtFund,
      courtFundFormatted: formatUnits(courtFund, 18) + " IMD",
      disputeTimeoutSeconds: disputeTimeout,
      streamCount,
      blockNumber,
      rules,
      knownTokens,
      signer: account?.address,
      links: { site: links.site, contract: explorer.address(weir.address), repo: links.repo },
    };
  }

  async function canUse(who?: Address) {
    const addr = who ?? requireAccount().address;
    const [eligible, tier, balance, minHold] = await Promise.all([
      read<boolean>("canUse", [addr]),
      read<number>("tierBps", [addr]),
      pub.readContract({ address: deployment.weirToken as Address, abi: erc20Abi, functionName: "balanceOf", args: [addr] }),
      read<bigint>("minHold"),
    ]);
    return {
      address: addr,
      eligible,
      weirBalance: balance,
      weirBalanceFormatted: formatUnits(balance, 18),
      minHold,
      minHoldFormatted: formatUnits(minHold, 18),
      bondBps: tier,
      bondPercent: tier / 100,
      shortfall: eligible ? 0n : minHold - balance,
      buyLink: `${links.imdExplorer}/token/${deployment.weirToken}`,
    };
  }

  async function stream(idInput: bigint | number | string): Promise<StreamView> {
    const id = BigInt(idInput);
    const blockNumber = await pub.getBlockNumber();
    const s = await read<{
      client: Address; recipient: Address; token: Address; rate: bigint; pausedRate: bigint; balance: bigint; withdrawn: bigint;
      snapDebt: bigint; snapTime: bigint; state: number; termsHash: Hex; termsURI: string; imdJobId: Hex; requestId: Hex;
      disputedAt: bigint; disputer: Address; bond: bigint; ruling: number;
    }>("streams", [id], blockNumber);
    if (s.state === 0) throw new WeirError(`Stream ${id} does not exist.`);
    const [streamed, withdrawable, refundable, stake, acceptedAt, meta] = await Promise.all([
      read<bigint>("streamed", [id], blockNumber),
      read<bigint>("withdrawable", [id], blockNumber),
      read<bigint>("refundable", [id], blockNumber),
      read<bigint>("stake", [id], blockNumber),
      read<bigint>("acceptedAt", [id], blockNumber),
      token(s.token),
    ]);
    const f = (v: bigint) => formatUnits(v, meta.decimals);
    const perDay = rateToPerDay(s.rate === 0n && s.state === 1 ? s.pausedRate : s.rate);
    return {
      id,
      status: statusOf(s),
      state: s.state,
      client: s.client,
      recipient: s.recipient,
      token: s.token,
      tokenSymbol: meta.symbol,
      tokenDecimals: meta.decimals,
      rate: s.rate,
      pausedRate: s.pausedRate,
      perDay,
      balance: s.balance,
      withdrawn: s.withdrawn,
      streamed,
      withdrawable,
      refundable,
      stake,
      termsHash: s.termsHash,
      termsURI: s.termsURI,
      imdJobId: s.imdJobId,
      acceptedAt,
      requestId: s.requestId,
      disputedAt: s.disputedAt,
      disputer: s.disputer,
      bond: s.bond,
      ruling: s.ruling === 1 ? "delivered" : s.ruling === 2 ? "not delivered" : "none",
      blockNumber,
      formatted: {
        perDay: `${f(perDay)} ${meta.symbol}/day`,
        balance: `${f(s.balance)} ${meta.symbol}`,
        withdrawn: `${f(s.withdrawn)} ${meta.symbol}`,
        streamed: `${f(streamed)} ${meta.symbol}`,
        withdrawable: `${f(withdrawable)} ${meta.symbol}`,
        refundable: `${f(refundable)} ${meta.symbol}`,
        stake: `${f(stake)} ${meta.symbol}`,
        bond: `${f(s.bond)} ${meta.symbol}`,
      },
      links: { stream: explorer.stream(id), oracle: explorer.oracle(id, weir.address), job: explorer.job(s.imdJobId), contract: explorer.address(weir.address) },
    };
  }

  async function logs(eventName: string | undefined, args: Record<string, unknown> | undefined, fromBlock: bigint, toBlock: bigint): Promise<Log[]> {
    try {
      return (await pub.getContractEvents({ ...weir, eventName, args, fromBlock, toBlock, strict: true } as never)) as Log[];
    } catch (e) {
      if (toBlock - fromBlock < 500n || !/range|limit|too many|response size/i.test(String(e))) throw e;
      const mid = (fromBlock + toBlock) / 2n;
      return [...(await logs(eventName, args, fromBlock, mid)), ...(await logs(eventName, args, mid + 1n, toBlock))];
    }
  }
  async function scan(eventName: string | undefined, args: Record<string, unknown> | undefined, fromBlock?: bigint, toBlock?: bigint) {
    const to = toBlock ?? (await pub.getBlockNumber());
    const start = fromBlock ?? firstBlock;
    const out: Log[] = [];
    for (let a = start; a <= to; a += 10_000n) {
      const b = a + 9_999n < to ? a + 9_999n : to;
      out.push(...(await logs(eventName, args, a, b)));
    }
    return out;
  }

  /** Stream ids where `who` is client or recipient, from StreamCreated events (whole history by default). */
  async function streamsOf(who?: Address, range: { fromBlock?: bigint; toBlock?: bigint } = {}) {
    const addr = who ?? requireAccount().address;
    const [asClient, asRecipient] = await Promise.all([
      scan("StreamCreated", { client: addr }, range.fromBlock, range.toBlock),
      scan("StreamCreated", { recipient: addr }, range.fromBlock, range.toBlock),
    ]);
    const row = (l: Log, role: "client" | "recipient") => {
      const a = (l as unknown as { args: { id: bigint; client: Address; recipient: Address; token: Address; imdJobId: Hex } }).args;
      return { id: a.id, role, client: a.client, recipient: a.recipient, token: a.token, imdJobId: a.imdJobId, blockNumber: l.blockNumber!, tx: l.transactionHash! };
    };
    return [...asClient.map((l) => row(l, "client")), ...asRecipient.map((l) => row(l, "recipient"))].sort((x, y) => (x.id < y.id ? -1 : 1));
  }

  /** Every Weir event about one stream, oldest first. */
  async function activity(idInput: bigint | number | string, range: { fromBlock?: bigint; toBlock?: bigint } = {}) {
    const id = BigInt(idInput);
    const all = await scan(undefined, undefined, range.fromBlock, range.toBlock);
    return all
      .map((l) => {
        const d = l as unknown as { eventName: string; args: Record<string, unknown>; blockNumber: bigint; transactionHash: Hex; logIndex: number };
        const sid = (d.args.id ?? d.args.streamId) as bigint | undefined;
        if (sid !== id) return undefined;
        return { event: d.eventName, args: d.args, blockNumber: d.blockNumber, tx: d.transactionHash, explorer: explorer.tx(d.transactionHash) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }

  /** What raising a dispute would cost right now, and the exact question the reviewers would see. */
  async function quoteDispute(idInput: bigint | number | string, note: string, who?: Address) {
    const id = BigInt(idInput);
    const addr = who ?? requireAccount().address;
    if (byteLength(note) > rules.maxNoteBytes) throw new WeirError(`Note is over ${rules.maxNoteBytes} bytes.`);
    const blockNumber = await pub.getBlockNumber();
    const [s, bond, tier, price, fund, eligible, question] = await Promise.all([
      stream(id),
      read<bigint>("bondFor", [id, addr], blockNumber),
      read<number>("tierBps", [addr], blockNumber),
      read<bigint>("oraclePrice", [], blockNumber),
      read<bigint>("courtFund", [], blockNumber),
      read<boolean>("canUse", [addr], blockNumber),
      read<string>("questionFor", [id, addr, note], blockNumber).catch((e) => { throw describeError(e); }),
    ]);
    const share = (price * BigInt(rules.disputerFeeShareBps)) / 10_000n;
    const fundCanCover = fund >= price - share;
    return {
      streamId: id,
      disputer: addr,
      role: addr.toLowerCase() === s.client.toLowerCase() ? "client" : addr.toLowerCase() === s.recipient.toLowerCase() ? "recipient" : "not a party",
      eligible,
      bond,
      bondFormatted: `${formatUnits(bond, s.tokenDecimals)} ${s.tokenSymbol}`,
      bondBps: tier,
      oraclePrice: price,
      oraclePriceFormatted: `${formatUnits(price, 18)} IMD`,
      yourFeeAtLeast: share,
      yourFeeAtLeastFormatted: `${formatUnits(share, 18)} IMD`,
      yourFeeAtMost: price,
      courtFund: fund,
      courtFundCanCoverRest: fundCanCover,
      note: `You pay at least 20% of the oracle fee. The court fund pays the rest only if it holds enough and has not already covered ${rules.courtFundSubsidiesPerUtcDay} disputes today; otherwise you pay all of it. The fee is spent even if the panel cannot agree.`,
      question,
      approvals: s.token.toLowerCase() === imd.toLowerCase()
        ? [{ token: s.token, amount: bond + price, kind: "bond and oracle fee" }]
        : [{ token: s.token, amount: bond, kind: "bond" }, { token: imd, amount: price, kind: "oracle fee" }],
      blockNumber,
    };
  }

  // ----- writes -----

  type CreateInput = {
    recipient: string;
    /** Symbol (USDG, WEIR, IMD, WETH) or address. Defaults to WEIR. */
    token?: string;
    /** Decimal amount per day in token units, e.g. "25" USDG per day. Give this or ratePerSecond. */
    perDay?: string | number;
    /** Minor units per second, for callers who already computed it. */
    ratePerSecond?: bigint;
    /** Initial deposit, decimal string in token units. */
    deposit: string | number;
    /** The full terms text. It is hashed; if ≤ 512 bytes it is also stored verbatim for the reviewers. */
    terms: string;
    /** Optional short on-chain text (≤ 512 bytes): summary plus public link, when terms are long. */
    termsURI?: string;
    /** Optional IMD job UUID or bytes32. */
    jobId?: string;
  };

  async function createStream(input: CreateInput) {
    const from = requireAccount();
    const recipient = address(input.recipient);
    if (recipient.toLowerCase() === from.address.toLowerCase()) throw new WeirError("Recipient must not be the signer.");
    const tokenAddr = resolveToken(input.token);
    const meta = await token(tokenAddr);
    const deposit = amount(input.deposit, meta.decimals, UINT128_MAX);
    let rate: bigint;
    if (input.ratePerSecond !== undefined) rate = input.ratePerSecond;
    else if (input.perDay !== undefined) rate = perDayToRate(amount(input.perDay, meta.decimals));
    else throw new WeirError("Give perDay or ratePerSecond.");
    if (rate <= 0n || rate > UINT128_MAX) throw new WeirError("Rate out of range.");
    const terms = termsFields(input.terms, input.termsURI);
    const job = jobId(input.jobId);
    const use = await canUse(from.address);
    if (!use.eligible) throw new WeirError(`Hold at least ${use.minHoldFormatted} WEIR to create a stream (have ${use.weirBalanceFormatted}). Buy: ${use.buyLink}`);
    await requireBalance(tokenAddr, deposit, "the initial deposit");
    const approvals = await approve(tokenAddr, deposit);
    const tx = await send("createStream", [recipient, tokenAddr, rate, deposit, terms.termsHash, terms.termsURI, job], "createStream");
    let id: bigint | undefined;
    for (const l of tx.logs) {
      if (l.address.toLowerCase() !== weir.address.toLowerCase()) continue;
      try {
        const d = decodeEventLog({ abi: weirAbi, data: l.data, topics: l.topics });
        if (d.eventName === "StreamCreated") id = (d.args as { id: bigint }).id;
      } catch { /* other event */ }
    }
    if (id === undefined) throw new WeirError(`Stream created but id not found in receipt: ${tx.explorer}`);
    return {
      id,
      ratePerSecond: rate,
      perDay: `${formatUnits(rateToPerDay(rate), meta.decimals)} ${meta.symbol}/day`,
      deposit: `${formatUnits(deposit, meta.decimals)} ${meta.symbol}`,
      runsFor: describeDuration(deposit / rate),
      termsHash: terms.termsHash,
      termsURI: terms.termsURI,
      approvals,
      tx: { hash: tx.hash, explorer: tx.explorer, blockNumber: tx.blockNumber },
      links: { stream: explorer.stream(id), job: explorer.job(job) },
    };
  }

  const tokenAmount = async (id: bigint, value: string | number | bigint) => {
    const s = await stream(id);
    return { s, value: amount(value, s.tokenDecimals) };
  };
  const strip = ({ logs: _l, ...rest }: TxResult & { logs: Log[] }): TxResult => rest;

  async function deposit(id: bigint | number | string, value: string | number | bigint) {
    const { s, value: v } = await tokenAmount(BigInt(id), value);
    await requireBalance(s.token, v, "the deposit");
    const approvals = await approve(s.token, v);
    return { ...strip(await send("deposit", [BigInt(id), v])), approvals };
  }
  const pause = async (id: bigint | number | string) => strip(await send("pause", [BigInt(id)]));
  async function restart(id: bigint | number | string, perDay?: string | number) {
    const s = await stream(id);
    const rate = perDay !== undefined ? perDayToRate(amount(perDay, s.tokenDecimals)) : s.pausedRate;
    if (rate === 0n) throw new WeirError("Give perDay: this stream has no saved paused rate.");
    return strip(await send("restart", [BigInt(id), rate]));
  }
  async function adjust(id: bigint | number | string, perDay: string | number) {
    const s = await stream(id);
    return strip(await send("adjust", [BigInt(id), perDayToRate(amount(perDay, s.tokenDecimals))]));
  }
  async function refund(id: bigint | number | string, value?: string | number | bigint) {
    if (value === undefined) return strip(await send("refundMax", [BigInt(id)]));
    const { value: v } = await tokenAmount(BigInt(id), value);
    return strip(await send("refund", [BigInt(id), v]));
  }
  const voidStream = async (id: bigint | number | string) => strip(await send("void", [BigInt(id)]));
  const accept = async (id: bigint | number | string) => strip(await send("accept", [BigInt(id)]));
  async function withdraw(id: bigint | number | string, value?: string | number | bigint) {
    if (value === undefined) return strip(await send("withdrawMax", [BigInt(id)]));
    const { value: v } = await tokenAmount(BigInt(id), value);
    return strip(await send("withdraw", [BigInt(id), v]));
  }

  async function dispute(idInput: bigint | number | string, note: string, opts: { maxBond?: bigint } = {}) {
    const from = requireAccount();
    const id = BigInt(idInput);
    const q = await quoteDispute(id, note, from.address);
    if (!q.eligible) throw new WeirError(`Hold at least ${rules.minHoldWeir} WEIR to raise a dispute.`);
    if (q.role === "not a party") throw new WeirError("Only the client or recipient can dispute.");
    const maxBond = opts.maxBond ?? q.bond;
    if (q.bond > maxBond) throw new WeirError(`Bond ${q.bondFormatted} exceeds maxBond.`);
    const approvals: TxResult[] = [];
    for (const a of q.approvals) {
      await requireBalance(a.token, a.amount, a.kind);
      approvals.push(...(await approve(a.token, a.amount)));
    }
    const tx = await send("dispute", [id, note, maxBond], "dispute");
    let requestId: Hex | undefined, question: string | undefined;
    for (const l of tx.logs) {
      if (l.address.toLowerCase() !== weir.address.toLowerCase()) continue;
      try {
        const d = decodeEventLog({ abi: weirAbi, data: l.data, topics: l.topics });
        if (d.eventName === "QuestionCommitted") {
          const a = d.args as { requestId: Hex; question: string };
          requestId = a.requestId; question = a.question;
        }
      } catch { /* other event */ }
    }
    return {
      streamId: id,
      requestId,
      question,
      bond: q.bondFormatted,
      approvals,
      tx: strip(tx),
      links: { oracle: explorer.oracle(id, weir.address), intake: explorer.intakeStatus(tx.hash), stream: explorer.stream(id) },
      next: "Reviewers answer in minutes to hours. Call waitForRuling(id) then enforce(id). After 7 days with no ruling anyone can expireDispute(id) and the bond returns.",
    };
  }
  const enforce = async (id: bigint | number | string) => strip(await send("enforce", [BigInt(id)]));
  const expireDispute = async (id: bigint | number | string) => strip(await send("expireDispute", [BigInt(id)]));
  async function sponsor(imdAmount: string | number | bigint) {
    const v = amount(imdAmount, 18);
    await requireBalance(imd, v, "sponsoring the court fund");
    const approvals = await approve(imd, v);
    return { ...strip(await send("sponsor", [v])), approvals };
  }
  const claim = async (tokenValue: string) => strip(await send("claim", [resolveToken(tokenValue)]));
  async function claimable(tokenValue: string, who?: Address) {
    const addr = who ?? requireAccount().address;
    const t = resolveToken(tokenValue);
    const [v, meta] = await Promise.all([read<bigint>("claimable", [t, addr]), token(t)]);
    return { token: t, amount: v, formatted: `${formatUnits(v, meta.decimals)} ${meta.symbol}` };
  }

  /** Poll until the dispute leaves the Disputed state. Returns the stream and what happened. */
  async function waitForRuling(idInput: bigint | number | string, opts: { pollMs?: number; timeoutMs?: number; autoEnforce?: boolean } = {}) {
    const id = BigInt(idInput);
    const pollMs = opts.pollMs ?? 15_000, deadline = Date.now() + (opts.timeoutMs ?? 30 * 60_000);
    for (;;) {
      const s = await stream(id);
      if (s.state !== 2) {
        let enforced: TxResult | undefined;
        if (s.state === 3 && opts.autoEnforce && account) enforced = await enforce(id);
        const outcome = s.state === 3 ? s.ruling : s.state === 1 ? "failed or expired: stream active again" : s.state === 4 ? "closed" : "unknown";
        return { streamId: id, outcome, stream: s, enforced };
      }
      if (Date.now() > deadline) return { streamId: id, outcome: "still disputed (timeout waiting)", stream: s };
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }

  async function records(who?: Address) {
    const addr = who ?? requireAccount().address;
    const r = await read<readonly [number, number, number, number, number]>("records", [addr]);
    return { address: addr, clientWon: r[0], clientLost: r[1], recipientWon: r[2], recipientLost: r[3], disputesRaised: r[4] };
  }

  /** The underlying viem clients, for calls the SDK does not wrap. */
  function clients(): { publicClient: PublicClient; walletClient: WalletClient | undefined } {
    return { publicClient: pub, walletClient: wallet };
  }

  return {
    chain, account, address: weir.address, abi: weirAbi, clients,
    info, canUse, stream, streamsOf, activity, quoteDispute, records, claimable,
    createStream, deposit, pause, restart, adjust, refund, void: voidStream, accept, withdraw,
    dispute, enforce, expireDispute, sponsor, claim, waitForRuling,
    token,
  };
}
export type Weir = ReturnType<typeof createWeir>;

export function describeDuration(seconds: bigint): string {
  const s = Number(seconds);
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86_400) return `${(s / 3600).toFixed(1)} h`;
  return `${(s / 86_400).toFixed(1)} days`;
}
