import test from "node:test";
import assert from "node:assert/strict";
import { parseRange } from "./range.js";

test("parses byte ranges", () => {
  assert.deepEqual(parseRange("bytes=0-99", 1000), { start: 0, end: 99 });
});

test("returns null for invalid ranges", () => {
  assert.equal(parseRange("bytes=100-10", 1000), null);
});
