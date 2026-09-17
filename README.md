# @caripay/email-domain-lists

Lists of domains where anybody can get an address: free mailbox providers and disposable throwaway
services. The lists are vendored from upstream and pinned, so they change only when somebody
reviews a pull request here.

No build step, no runtime dependencies. The package is two JSON files and about forty lines of
JavaScript.

```ts
import { isFreeEmailDomain, isDisposableEmailDomain } from "@caripay/email-domain-lists";

isFreeEmailDomain("gmail.com");            // true
isDisposableEmailDomain("mailinator.com"); // true

// Matching is exact. Pass a normalized domain, lowercase, no "@", no trailing dot.
isFreeEmailDomain("mail.gmail.com");       // false
```

The raw arrays are exported too, for callers that want to build their own index or union the two.

```ts
import { freeDomains, disposableDomains } from "@caripay/email-domain-lists";
```

## Two things to know before you use it

The lists are not a partition. Upstream's `free` list is a superset that already carries most of
`disposable`, and the boundary sits somewhere other than where you would draw it. `yopmail.com` is a
throwaway service by any reading and appears only in `free`. So ask both lists. Absence from
`disposable` is not evidence that a domain is a real mailbox provider.

Membership is not a verdict. Somebody scraped these lists, and it shows. The free list carries
obvious junk like `zzom.co.ukgmail.com`. 150,000 entries assembled that way will contain a domain
some real company actually owns. Treat a hit as a strong hint, not a fact, and give the customer on
the wrong side of it a way out.

## Installing

Pin to a commit. A branch moves under you, which defeats the point.

```jsonc
"@caripay/email-domain-lists": "CariPay/email-domain-lists#commit=<sha>"
```

## Updating

Run `node scripts/sync-upstream.mjs`, read the diff, open a PR. [UPSTREAM.md](./UPSTREAM.md) has
the detail on what to look for.
