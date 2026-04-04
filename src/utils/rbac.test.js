import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "./rbac.js";

test("admin can manage users", () => {
  assert.equal(hasPermission("admin", "users:manage"), true);
});

test("viewer cannot upload videos", () => {
  assert.equal(hasPermission("viewer", "videos:create"), false);
});

test("editor can update videos", () => {
  assert.equal(hasPermission("editor", "videos:update"), true);
});
