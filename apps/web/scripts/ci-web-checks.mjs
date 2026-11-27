import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

import { affectsWebChecks } from "./ignore-build.mjs";

/** @param {string[]} args */
function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return result.status === 0 ? result.stdout : null;
}

/** @returns {string[] | null} The changed paths, or null when there is no reliable base. */
function changedPaths() {
  const base = process.env["BASE_SHA"] ?? "";
  if (!/^[\da-f]{40}$/i.test(base) || /^0+$/.test(base)) return null;
  if (git(["cat-file", "-e", `${base}^{commit}`]) === null) {
    git(["fetch", "--no-tags", "--depth=1", "origin", base]);
  }
  const diff = git(["diff", "--no-renames", "--name-only", "-z", base, "HEAD"]);
  return diff === null ? null : diff.split("\0").filter(Boolean);
}

const paths = changedPaths();
const run = paths === null || affectsWebChecks(paths);
appendFileSync(process.env["GITHUB_OUTPUT"] ?? "/dev/stdout", `run=${run}\n`);
console.log(
  paths === null
    ? "No reliable comparison base; running web checks."
    : `Web checks ${run ? "needed" : "not needed"} for ${paths.length} changed paths.`,
);
