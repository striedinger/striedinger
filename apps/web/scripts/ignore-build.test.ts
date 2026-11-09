import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { affectsWeb, buildDecision } from "./ignore-build.mjs";

const directories: string[] = [];

afterEach(function cleanRepositories() {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function repository() {
  const cwd = mkdtempSync(join(tmpdir(), "web-build-gate-"));
  directories.push(cwd);
  function git(...args: string[]) {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  }
  function commit(path: string, content = path) {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), content);
    git("add", "--all");
    git("commit", "-qm", "Fixture change");
    return git("rev-parse", "HEAD");
  }
  git("init", "-b", "main");
  git("config", "user.name", "Build gate test");
  git("config", "user.email", "test@example.invalid");
  const base = commit("apps/web/page.tsx");
  git("update-ref", "refs/remotes/origin/main", base);
  git("switch", "-c", "feature");
  return { cwd, git, commit, base };
}

describe("Vercel web build gate", function () {
  it("skips native-only changes since the last successful deployment", function () {
    const repo = repository();
    repo.commit("crates/pkmn/src/lib.rs");
    repo.commit("Cargo.lock");
    expect(
      buildDecision({ cwd: repo.cwd, environment: { VERCEL_GIT_PREVIOUS_SHA: repo.base } }).build,
    ).toBe(false);
  });

  it("skips a first Rust-only preview by comparing the whole branch with main", function () {
    const repo = repository();
    repo.commit("apps/murmur/sources/app.swift");
    expect(buildDecision({ cwd: repo.cwd, environment: { VERCEL_ENV: "preview" } }).build).toBe(
      false,
    );
  });

  it("builds when earlier commits changed web code even if the final commit is native-only", function () {
    const repo = repository();
    repo.commit("apps/web/page.tsx", "New web content");
    repo.commit("crates/pkmn/src/lib.rs");
    expect(
      buildDecision({ cwd: repo.cwd, environment: { VERCEL_GIT_PREVIOUS_SHA: repo.base } }).build,
    ).toBe(true);
    expect(buildDecision({ cwd: repo.cwd, environment: { VERCEL_ENV: "preview" } }).build).toBe(
      true,
    );
  });

  it("builds for shared dependencies, lockfiles, build configuration, and unknown inputs", function () {
    for (const path of [
      "packages/ui/src/button.tsx",
      "packages/i18n/src/en.ts",
      "pnpm-lock.yaml",
      "package.json",
      "turbo.json",
      ".node-version",
      "future-config.json",
    ]) {
      expect(affectsWeb([path])).toBe(true);
    }
  });

  it("treats a file moved out of web as a web deletion", function () {
    const repo = repository();
    mkdirSync(join(repo.cwd, "crates"));
    renameSync(join(repo.cwd, "apps/web/page.tsx"), join(repo.cwd, "crates/moved-file.txt"));
    repo.git("add", "--all");
    repo.git("commit", "-qm", "Move source out of web");
    expect(
      buildDecision({ cwd: repo.cwd, environment: { VERCEL_GIT_PREVIOUS_SHA: repo.base } }).build,
    ).toBe(true);
  });

  it("builds conservatively when history is unavailable or a production baseline is missing", function () {
    const repo = repository();
    repo.git("update-ref", "-d", "refs/remotes/origin/main");
    expect(buildDecision({ cwd: repo.cwd, environment: { VERCEL_ENV: "preview" } }).build).toBe(
      true,
    );
    expect(buildDecision({ cwd: repo.cwd, environment: { VERCEL_ENV: "production" } }).build).toBe(
      true,
    );
    expect(
      buildDecision({ cwd: repo.cwd, environment: { VERCEL_GIT_PREVIOUS_SHA: "invalid" } }).build,
    ).toBe(true);
  });

  it("honors forced rebuilds even when the deployed code is unchanged", function () {
    const repo = repository();
    expect(
      buildDecision({ cwd: repo.cwd, environment: { VERCEL_GIT_PREVIOUS_SHA: repo.base } }).build,
    ).toBe(false);
    expect(
      buildDecision({
        cwd: repo.cwd,
        environment: { VERCEL_GIT_PREVIOUS_SHA: repo.base, FORCE_WEB_BUILD: "1" },
      }).build,
    ).toBe(true);
  });

  it("uses Vercel's exit codes: zero skips and one builds", function () {
    const repo = repository();
    const script = fileURLToPath(new URL("./ignore-build.mjs", import.meta.url));
    const environment = {
      ...process.env,
      VERCEL_GIT_PREVIOUS_SHA: repo.base,
      FORCE_WEB_BUILD: "0",
    };
    repo.commit("crates/pkmn/src/lib.rs");
    expect(spawnSync(process.execPath, [script], { cwd: repo.cwd, env: environment }).status).toBe(
      0,
    );
    repo.commit("apps/web/page.tsx", "Changed page");
    expect(spawnSync(process.execPath, [script], { cwd: repo.cwd, env: environment }).status).toBe(
      1,
    );
  });
});
