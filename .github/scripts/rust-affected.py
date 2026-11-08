"""Select the Pokémon crates changed by this event, including their dependents."""

import json
import os
from pathlib import Path
import subprocess
import tomllib


CRATES = {
    "pkmn-tcg-dex-core": "crates/pkmn-tcg-dex-core",
    "pkmn-tcg-dex-sqlite": "crates/pkmn-tcg-dex-sqlite",
    "pkmn-tcg-dex": "crates/pkmn-tcg-dex-cli",
}


def affected_packages(paths, dependencies):
    affected = set()
    for path in paths:
        if (
            path in {"Cargo.toml", "Cargo.lock", "rust-toolchain", "rust-toolchain.toml"}
            or path.startswith((".cargo/", ".github/workflows/", ".github/scripts/"))
        ):
            return sorted(CRATES)
        for name, directory in CRATES.items():
            if path.startswith(directory + "/"):
                relative = path[len(directory) + 1 :]
                if relative.endswith(".md") or relative.startswith("docs/"):
                    continue
                affected.add(name)
    # Read actual manifests rather than maintaining a duplicate dependency graph.
    while True:
        dependents = {name for name, deps in dependencies.items() if deps & affected}
        expanded = affected | dependents
        if expanded == affected:
            return sorted(affected)
        affected = expanded


def changed_paths(event):
    base = event.get("pull_request", {}).get("base", {}).get("sha") or event.get("before")
    if not base or set(base) == {"0"}:
        return None  # Unknown base: run all checks rather than incorrectly skipping.
    if subprocess.run(["git", "cat-file", "-e", base + "^{commit}"], capture_output=True).returncode:
        subprocess.run(["git", "fetch", "--no-tags", "--depth=1", "origin", base], check=True)
    data = subprocess.check_output(["git", "diff", "--no-renames", "--name-only", "-z", base, "HEAD"])
    return data.decode("utf-8", errors="surrogateescape").rstrip("\0").split("\0")


def main():
    dependencies = {}
    for name, directory in CRATES.items():
        manifest = tomllib.loads(Path(directory, "Cargo.toml").read_text())
        deps = set()
        sections = [manifest, *manifest.get("target", {}).values()]
        for section in sections:
            for kind in ("dependencies", "dev-dependencies", "build-dependencies"):
                for alias, dependency in section.get(kind, {}).items():
                    deps.add(dependency.get("package", alias) if isinstance(dependency, dict) else alias)
        dependencies[name] = deps
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    paths = changed_paths(event)
    packages = sorted(CRATES) if paths is None else affected_packages(paths, dependencies)
    flags = " ".join("-p " + package for package in packages)
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        output.write(f"run={'true' if packages else 'false'}\npackages={flags}\n")
    print("Affected Pokémon crates: " + (", ".join(packages) or "none; checks skipped"))


if __name__ == "__main__":
    main()
