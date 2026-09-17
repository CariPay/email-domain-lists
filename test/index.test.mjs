import assert from "node:assert/strict";
import { test } from "node:test";

import {
  disposableDomains,
  freeDomains,
  isDisposableEmailDomain,
  isFreeEmailDomain,
} from "../src/index.js";

/**
 * The counts are pinned deliberately. A refresh that halves a list is an upstream build accident
 * far more often than it is news, and the consumer refuses a save on a hit — so a list quietly
 * losing most of itself means a guard that quietly stops guarding. Update these numbers in the
 * same commit that updates the data, never separately.
 */
test("list sizes are what UPSTREAM.md claims", () => {
  assert.equal(freeDomains.length, 9331);
  assert.equal(disposableDomains.length, 141413);
});

/**
 * Callers look these up with an exact `Set.has` against an already-normalized domain, so an entry
 * that is uppercase or carries an `@` is not untidy — it is a row that can never match.
 */
test("every entry is a normalized registrable domain", () => {
  for (const list of [freeDomains, disposableDomains])
    for (const d of list) {
      assert.equal(typeof d, "string");
      assert.equal(d, d.toLowerCase(), `not lowercase: ${d}`);
      assert.ok(!/[\s@*]/.test(d), `illegal character: ${d}`);
      assert.ok(!d.endsWith("."), `trailing dot: ${d}`);
      assert.ok(d.includes("."), `not a domain: ${d}`);
    }
});

test("lists are sorted and deduplicated", () => {
  for (const list of [freeDomains, disposableDomains]) {
    assert.equal(new Set(list).size, list.length);
    assert.deepEqual(list, [...list].sort());
  }
});

test("the obvious providers are present", () => {
  for (const d of ["gmail.com", "yahoo.com", "outlook.com", "proton.me"])
    assert.ok(isFreeEmailDomain(d), `missing from free list: ${d}`);
});

/**
 * Upstream's two lists are not a partition. `free` is a superset that already carries most of
 * `disposable`, and the boundary is drawn somewhere other than where we would draw it —
 * `yopmail.com`, a throwaway service by any reading, appears only in `free`. So a check for "can
 * anyone get an address here" has to ask both lists, and no caller may treat absence from
 * `disposable` as evidence a domain is a real mailbox provider.
 */
test("the two lists overlap and do not partition", () => {
  const free = new Set(freeDomains);
  assert.ok(disposableDomains.some((d) => free.has(d)), "expected the lists to overlap");
  assert.ok(isFreeEmailDomain("yopmail.com") && !isDisposableEmailDomain("yopmail.com"));

  for (const d of ["mailinator.com", "guerrillamail.com", "yopmail.com", "10minutemail.com"])
    assert.ok(isFreeEmailDomain(d) || isDisposableEmailDomain(d), `in neither list: ${d}`);
});

/** Matching is exact on purpose — upstream's parent-walking is not what this package promises. */
test("matching is exact, not parent-walking", () => {
  assert.equal(isFreeEmailDomain("mail.gmail.com"), false);
  assert.equal(isFreeEmailDomain("gmail.com.vendor.co"), false);
  assert.equal(isFreeEmailDomain("GMAIL.COM"), false);
  assert.equal(isFreeEmailDomain("@gmail.com"), false);
  assert.equal(isFreeEmailDomain(""), false);
});
