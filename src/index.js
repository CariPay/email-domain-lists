import disposableDomains from "../data/disposable.json" with { type: "json" };
import freeDomains from "../data/free.json" with { type: "json" };

/**
 * Domains where anybody can obtain an address, as two lists.
 *
 * `free` is the mailbox providers — gmail.com, yahoo.co.uk — where an address means nothing about
 * who holds it. `disposable` is the throwaway services, where it means less than nothing: the
 * address is free, anonymous and gone in ten minutes.
 *
 * Both are vendored from upstream and pinned. See UPSTREAM.md for where they came from and how a
 * refresh is reviewed. They are exported as arrays rather than Sets so the data stays inert: a
 * caller that only wants to count, or diff, or serve the list pays nothing for a hash table it
 * never reads.
 */
export { disposableDomains, freeDomains };

/**
 * Membership is exact.
 *
 * Upstream's own helpers walk parent domains, so `mail.gmail.com` matches `gmail.com`. That is the
 * right call for scoring a signup form and the wrong one here: it makes `notgmail.com.vendor.co`
 * a near miss away from a rule nobody wrote, and it costs a loop per lookup. Callers hold an
 * already-normalized domain, so a `Set.has` answers the question they actually asked.
 */
let freeSet;
let disposableSet;

/** Is this domain a free mailbox provider? Expects a lowercased domain with no `@` or trailing dot. */
export const isFreeEmailDomain = (domain) => (freeSet ??= new Set(freeDomains)).has(domain);

/** Is this domain a disposable mailbox service? Same input contract as {@link isFreeEmailDomain}. */
export const isDisposableEmailDomain = (domain) =>
  (disposableSet ??= new Set(disposableDomains)).has(domain);
