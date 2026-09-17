/** Free mailbox provider domains, lowercase, sorted, deduplicated. Vendored — see UPSTREAM.md. */
export declare const freeDomains: readonly string[];

/** Disposable mailbox service domains, lowercase, sorted, deduplicated. Vendored — see UPSTREAM.md. */
export declare const disposableDomains: readonly string[];

/**
 * Is this domain a free mailbox provider?
 *
 * Matching is exact, not parent-walking. Pass an already-normalized domain: lowercased, no leading
 * `@`, no trailing dot. The Set is built on first call and reused.
 */
export declare function isFreeEmailDomain(domain: string): boolean;

/** Is this domain a disposable mailbox service? Same input contract as {@link isFreeEmailDomain}. */
export declare function isDisposableEmailDomain(domain: string): boolean;
