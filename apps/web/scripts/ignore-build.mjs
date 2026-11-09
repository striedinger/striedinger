import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const nativeFiles = new Set([
  "Cargo.toml",
  "Cargo.lock",
  "rustfmt.toml",
  "clippy.toml",
  ".clippy.toml",
]);

/** @param {string[]} paths */
export function affectsWeb(paths) {
  // Unknown files build conservatively. If the web app begins consuming a local
  // Rust crate, remove that crate from these exclusions before wiring it in.
  return paths.some(function affectsWebPath(path) {
    return !(
      path.startsWith("crates/") ||
      path.startsWith("apps/murmur/") ||
      path.startsWith(".github/") ||
      nativeFiles.has(path) ||
      path === "README.md" ||
      path === "AGENTS.md"
    );
  });
}

/** @param {string[]} args @param {string} cwd */
function git(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return result.status === 0 ? result.stdout : null;
}

/** @param {string} sha */
function validSha(sha) {
  return /^[\da-f]{40}(?:[\da-f]{24})?$/i.test(sha);
}

/** @param {{ cwd?: string; environment?: Record<string, string | undefined> }} [options] */
export function buildDecision({ cwd = process.cwd(), environment = process.env } = {}) {
  if (environment["FORCE_WEB_BUILD"] === "1") {
    return { build: true, reason: "FORCE_WEB_BUILD requests a deployment." };
  }
  const previous = environment["VERCEL_GIT_PREVIOUS_SHA"];
  let base = null;
  if (previous) {
    if (!validSha(previous)) return { build: true, reason: "Invalid previous deployment SHA." };
    if (git(["cat-file", "-e", `${previous}^{commit}`], cwd) === null) {
      git(["fetch", "--no-tags", "--depth=1", "origin", previous], cwd);
    }
    base = git(["rev-parse", "--verify", `${previous}^{commit}`], cwd)?.trim();
  } else if (environment["VERCEL_ENV"] === "preview") {
    // A first branch deployment has no previous SHA. Compare all branch changes
    // against main, not just the latest commit, to avoid skipping earlier web work.
    base = git(["merge-base", "HEAD", "refs/remotes/origin/main"], cwd)?.trim();
    if (!base) {
      git(["fetch", "--no-tags", "--depth=50", "origin", "main:refs/remotes/origin/main"], cwd);
      base = git(["merge-base", "HEAD", "refs/remotes/origin/main"], cwd)?.trim();
    }
    if (base === git(["rev-parse", "HEAD"], cwd)?.trim()) {
      return { build: true, reason: "First deployment has no distinct comparison base." };
    }
  }
  if (!base || !validSha(base)) {
    return { build: true, reason: "No reliable deployment baseline; building conservatively." };
  }
  // Disable rename detection so moves out of the web tree still count as deletions.
  const diff = git(["diff", "--no-renames", "--name-only", "-z", base, "HEAD"], cwd);
  if (diff === null) return { build: true, reason: "Cannot inspect Git changes." };
  const paths = diff.split("\0").filter(Boolean);
  const build = affectsWeb(paths);
  return {
    build,
    reason: build
      ? "Web or shared build inputs changed."
      : "Only native code, CI, or repository documentation changed.",
  };
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const decision = buildDecision();
  console.log(decision.reason);
  // Vercel's Ignored Build Step uses 0 to skip and 1 to continue building.
  process.exitCode = decision.build ? 1 : 0;
}
