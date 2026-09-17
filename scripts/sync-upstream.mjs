#!/usr/bin/env node
/**
 * Refresh the vendored lists from upstream npm tarballs.
 *
 * This is the whole reason the repo exists: it turns "the maintainer published something" into a
 * diff somebody has to approve. It writes files and nothing else — it does not commit, push, or
 * install, so the output is always a dirty working tree for a human to read.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A list that suddenly loses a tenth of itself is a broken upstream build far more often than news. */
const SHRINK_WARN_RATIO = 0.05;

const LISTS = [
  { key: "free", pkg: "@visulima/free-email-domains", file: "data/free.json" },
  { key: "disposable", pkg: "@visulima/disposable-email-domains", file: "data/disposable.json" },
];

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : argv[i + 1];
};

/**
 * Upstream's entries are the registrable domain and nothing else. The consumer looks them up with
 * an exact `Set.has` against an already-normalized domain, so an entry that is uppercase, carries
 * an `@`, or is a `*.` wildcard does not merely look untidy — it silently never matches. Better to
 * refuse the whole refresh than to vendor a list with dead rows in it.
 */
const validate = (key, domains) => {
  if (!Array.isArray(domains)) throw new Error(`${key}: did not parse to an array`);
  if (domains.length === 0) throw new Error(`${key}: empty`);

  const problems = [];
  const seen = new Set();
  for (const d of domains) {
    if (typeof d !== "string") problems.push(`non-string entry: ${JSON.stringify(d)}`);
    else if (d !== d.toLowerCase()) problems.push(`not lowercase: ${d}`);
    else if (d !== d.trim() || /\s/.test(d)) problems.push(`whitespace: ${JSON.stringify(d)}`);
    else if (d.includes("@")) problems.push(`contains @: ${d}`);
    else if (d.includes("*")) problems.push(`wildcard: ${d}`);
    else if (d.endsWith(".")) problems.push(`trailing dot: ${d}`);
    else if (!d.includes(".")) problems.push(`no dot: ${d}`);
    else if (seen.has(d)) problems.push(`duplicate: ${d}`);
    seen.add(d);
    if (problems.length > 10) break;
  }
  if (problems.length > 0)
    throw new Error(`${key}: upstream list failed validation, refusing to write\n  - ${problems.join("\n  - ")}`);

  return [...seen].sort();
};

const previous = (file) => {
  try {
    return new Set(JSON.parse(readFileSync(join(ROOT, file), "utf8")));
  } catch {
    return undefined;
  }
};

const summary = [];

for (const { key, pkg, file } of LISTS) {
  const requested = flag(key) ?? "latest";
  const work = mkdtempSync(join(tmpdir(), `sync-${key}-`));
  try {
    const spec = `${pkg}@${requested}`;
    process.stdout.write(`${pkg}: fetching ${requested}\n`);
    const tarball = execFileSync("npm", ["pack", spec, "--silent"], { cwd: work, encoding: "utf8" }).trim();
    execFileSync("tar", ["xzf", tarball], { cwd: work });

    const manifest = JSON.parse(readFileSync(join(work, "package/package.json"), "utf8"));
    const raw = readFileSync(join(work, "package/dist/domains.json"), "utf8");
    const domains = validate(key, JSON.parse(raw));

    const before = previous(file);
    if (before) {
      const added = domains.filter((d) => !before.has(d)).length;
      const removed = [...before].filter((d) => !domains.includes(d)).length;
      const shrink = (before.size - domains.length) / before.size;
      process.stdout.write(`  ${before.size} -> ${domains.length} (+${added} -${removed})\n`);
      if (shrink > SHRINK_WARN_RATIO)
        process.stdout.write(
          `  WARNING: list shrank by ${(shrink * 100).toFixed(1)}%. Check upstream before merging.\n`,
        );
    } else {
      process.stdout.write(`  ${domains.length} entries (no previous list)\n`);
    }

    // One domain per line. Upstream ships a single minified line, which makes a refresh a diff of
    // one 2.4 MB row that no reviewer can read — and an unreadable diff is the same as no review.
    writeFileSync(join(ROOT, file), `[\n${domains.map((d) => JSON.stringify(d)).join(",\n")}\n]\n`);

    summary.push({
      pkg,
      version: manifest.version,
      count: domains.length,
      sha256: createHash("sha256").update(raw).digest("hex").slice(0, 16),
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// Keep UPSTREAM.md's version table honest without hand-editing it.
const upstreamPath = join(ROOT, "UPSTREAM.md");
let doc = readFileSync(upstreamPath, "utf8");
for (const { pkg, version, count } of summary) {
  const row = new RegExp(`^(\\| \`data/[^|]+\` \\| \\[\`${pkg.replace(/[/@.]/g, "\\$&")}\`\\][^|]+\\| )\`[^\`]+\`( \\| )[\\d,]+( \\|)$`, "m");
  if (!row.test(doc)) {
    process.stdout.write(`\nNote: could not find the UPSTREAM.md row for ${pkg}; update it by hand.\n`);
    continue;
  }
  doc = doc.replace(row, `$1\`${version}\`$2${count.toLocaleString("en-US")}$3`);
}
writeFileSync(upstreamPath, doc);

process.stdout.write("\nPinned:\n");
for (const { pkg, version, count, sha256 } of summary)
  process.stdout.write(`  ${pkg}@${version}  ${count} entries  sha256:${sha256}\n`);
process.stdout.write("\nReview the diff, then open a PR. Nothing was committed.\n");
