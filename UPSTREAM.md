# Upstream

Both lists are vendored copies of published npm packages. Nothing here installs from npm at build
time, and no upstream code is vendored, only the domain data.

| List | Upstream package | Pinned version | Entries |
| --- | --- | --- | --- |
| `data/free.json` | [`@visulima/free-email-domains`](https://www.npmjs.com/package/@visulima/free-email-domains) | `1.0.1` | 9,331 |
| `data/disposable.json` | [`@visulima/disposable-email-domains`](https://www.npmjs.com/package/@visulima/disposable-email-domains) | `1.1.1` | 141,413 |

Upstream is MIT. Its licence is preserved verbatim in `LICENSE-visulima.md`. Both packages live in
the `visulima/visulima` monorepo under `packages/email/`, so neither has a repository of its own to
fork. That is why this repo exists.

## Why vendored rather than depended on

A dependency on the npm package is a standing grant. Every `yarn install` accepts whatever the
maintainer published since the last one, and a domain list is a comfortable place to hide
something, because nobody reads a 141,413-line diff by accident. Vendoring moves that grant into a
pull request. The lists change here only when someone opens one and approves it.

We take the data and leave the code. Upstream's runtime reads `dist/domains.json` off disk with
`node:fs`, which cannot work inside a bundled Cloudflare Worker. Their own README tells edge
runtimes to import the JSON and inject it instead. Dropping the loader removes the part that never
runs and leaves a refresh that is a diff of domain names and nothing else.

## Refreshing

```sh
node scripts/sync-upstream.mjs                                  # whatever upstream calls latest
node scripts/sync-upstream.mjs --free 1.0.2 --disposable 1.1.2  # or exact versions
```

The script downloads the tarballs from the npm registry, validates the shape of each list, rewrites
`data/*.json` one domain per line, and updates the version table above. It refuses to write a list
that fails validation, and warns when a refresh drops more than 5% of a list. A list that suddenly
shrinks is usually a broken upstream build rather than real news.

Then read the diff and open a PR. Three things to look at.

Removals. A domain leaving the list stops being refused. Check anything you recognise.

Additions that look like real companies. Somebody scraped these lists, and the free list already
carries the evidence (`zzom.co.ukgmail.com`). An added domain belonging to an actual customer is
the failure that costs us something, because the consumer refuses a save on a hit.

The counts. `test/index.test.mjs` asserts both, so a wild swing fails CI before anyone reviews it.
Update the numbers in the same commit as the data, never separately.

## Known gaps

Upstream has no Tuta coverage at all. Not `tutanota.com`, not `tutanota.de`, and not the rebranded
`tuta.com` or `tuta.io`. `tempmail.com` is missing too, while its siblings `tempmail.net` and
`temp-mail.io` are both present.

Anything that used to refuse those domains needs its own supplement. In `visai-workers`, that
supplement lives in `integrations/src/artifacts/public-mailboxes.ts`.
