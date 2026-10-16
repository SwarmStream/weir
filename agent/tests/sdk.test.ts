import test from "node:test";
import assert from "node:assert/strict";
import { keccak256, toBytes, zeroHash, encodeErrorResult, ContractFunctionRevertedError } from "viem";
import {
  amount,
  byteLength,
  describeDuration,
  describeError,
  displayJob,
  jobId,
  perDayToRate,
  rateToPerDay,
  resolveToken,
  statusOf,
  termsFields,
  termsHash,
  UINT128_MAX,
  WeirError,
  deployment,
  rules,
  weirAbi,
} from "../src/index.ts";

test("termsHash is keccak256 of the UTF-8 text, as the site computes it", () => {
  const t = "Deliver the thing by Friday.";
  assert.equal(termsHash(t), keccak256(toBytes(t)));
});

test("termsFields stores short terms verbatim and refuses long ones without a URI", () => {
  const short = "Ship a CSV deduper with tests by 2026-10-20 UTC.";
  assert.deepEqual(termsFields(short), { termsHash: termsHash(short), termsURI: short });
  const long = "x".repeat(600);
  assert.throws(() => termsFields(long), /512/);
  const withUri = termsFields(long, "Summary. Full terms: https://example.com/terms");
  assert.equal(withUri.termsHash, termsHash(long));
  assert.equal(byteLength(withUri.termsURI) <= rules.maxTermsUriBytes, true);
  assert.throws(() => termsFields("ok", "bad\u0007text"), /control/);
  assert.throws(() => termsFields("   "), /required/);
});

test("perDay ↔ rate rounds down to a whole minor unit per second", () => {
  assert.equal(perDayToRate(86_400n), 1n);
  assert.equal(perDayToRate(86_399n * 2n + 1n), 1n);
  assert.throws(() => perDayToRate(100n), /below one minor unit/);
  assert.equal(rateToPerDay(5n), 432_000n);
  assert.throws(() => perDayToRate((UINT128_MAX + 1n) * 86_400n), /limit/);
});

test("amount parses decimals strictly", () => {
  assert.equal(amount("12.5", 6), 12_500_000n);
  assert.equal(amount(7n, 6), 7n);
  assert.throws(() => amount("1.2345678", 6), /decimal places/);
  assert.throws(() => amount("0", 6), /greater than zero/);
  assert.throws(() => amount("-1", 6), /digits/);
  assert.throws(() => amount("1e3", 6), /digits/);
});

test("jobId accepts a UUID or bytes32, nothing else", () => {
  assert.equal(jobId(), zeroHash);
  const uuid = "bcc8630e-6d05-445b-9f6d-eb47b6bc9080";
  const id = jobId(uuid);
  assert.equal(id.length, 66);
  assert.equal(displayJob(id), uuid);
  assert.equal(jobId(id), id);
  assert.throws(() => jobId("nope"), WeirError);
});

test("resolveToken maps known symbols and checksums addresses", () => {
  assert.equal(resolveToken().toLowerCase(), deployment.weirToken);
  assert.equal(resolveToken("usdg").toLowerCase(), "0x5fc5360d0400a0fd4f2af552add042d716f1d168");
  assert.equal(resolveToken("IMD").toLowerCase(), deployment.imd);
  assert.throws(() => resolveToken("0x0000000000000000000000000000000000000000"), /nonzero/);
});

test("statusOf distinguishes paused from active", () => {
  assert.equal(statusOf({ state: 1, rate: 0n }), "Paused");
  assert.equal(statusOf({ state: 1, rate: 3n }), "Active");
  assert.equal(statusOf({ state: 2, rate: 0n }), "Disputed");
  assert.equal(statusOf({ state: 3, rate: 0n }), "Ruled");
  assert.equal(statusOf({ state: 4, rate: 0n }), "Closed");
});

test("describeError decodes a contract revert into a plain message", () => {
  const data = encodeErrorResult({ abi: weirAbi, errorName: "HoldRequired" });
  const e = new ContractFunctionRevertedError({ abi: weirAbi, functionName: "createStream", data });
  const d = describeError(e);
  assert.equal(d.revert, "HoldRequired");
  assert.match(d.message, /minimum WEIR/);
  const bond = encodeErrorResult({ abi: weirAbi, errorName: "BondExceedsLimit", args: [5n, 4n] });
  const b = describeError(new ContractFunctionRevertedError({ abi: weirAbi, functionName: "dispute", data: bond }));
  assert.match(b.message, /BondExceedsLimit: 5, 4/);
  assert.equal(describeError(new Error("plain")).message, "plain");
});

test("describeDuration", () => {
  assert.equal(describeDuration(120n), "2 min");
  assert.equal(describeDuration(7200n), "2.0 h");
  assert.equal(describeDuration(259_200n), "3.0 days");
});

test("generated deployment matches the v2 launch", () => {
  assert.equal(deployment.chainId, 4663);
  assert.equal(deployment.weir, "0xde049547f1e55bb093e14d8f4545d1cc9b613f97");
  assert.equal(rules.minHoldWeir, "10000");
  assert.ok(weirAbi.some((f) => f.type === "function" && f.name === "createStream"));
});
