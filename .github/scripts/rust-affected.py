"""Select the Rust crates changed by this event, including their dependents."""

import json
import os
from pathlib import Path
import subprocess
import tomllib


EXCLUDED = {"murmur-core", "murmur-bindgen"}

SHARED_FILES = {
    "Cargo.toml",
    "Cargo.lock",
    "rust-toolchain",
    "rust-toolchain.toml",
    "rustfmt.toml",
    "clippy.toml",
    ".clippy.toml",
    ".github/workflows/ci.yml",
    ".github/scripts/rust-affected.py",
    ".github/scripts/test-rust-affected.py",
}


def affected_packages(paths, crates, dependencies):
    """Return the crates in `crates` (name -> directory) that `paths` touch, plus dependents."""
    affected = set()
    for path in paths:
        if path in SHARED_FILES or path.startswith(".cargo/"):
            return sorted(crates)
        for name, directory in crates.items():
            if path.startswith(directory + "/"):
                relative = path[len(directory) + 1 :]
                if relative.endswith(".md") or relative.startswith("docs/"):
                    continue
                affected.add(name)
    while True:
        dependents = {name for name, deps in dependencies.items() if deps & affected}
        expanded = affected | dependents
        if expanded == affected:
            return sorted(affected)
        affected = expanded


def workspace_crates(root=Path(".")):
    """Read every workspace member under crates/ and its dependency names."""
    crates = {}
    dependencies = {}
    for manifest_path in sorted(root.glob("crates/*/Cargo.toml")):
        manifest = tomllib.loads(manifest_path.read_text())
        name = manifest["package"]["name"]
        if name in EXCLUDED:
            continue
        crates[name] = manifest_path.parent.relative_to(root).as_posix()
        deps = set()
        sections = [manifest, *manifest.get("target", {}).values()]
        for section in sections:
            for kind in ("dependencies", "dev-dependencies", "build-dependencies"):
                for alias, dependency in section.get(kind, {}).items():
                    deps.add(dependency.get("package", alias) if isinstance(dependency, dict) else alias)
        dependencies[name] = deps
    return crates, dependencies


def changed_paths(event):
    base = event.get("pull_request", {}).get("base", {}).get("sha") or event.get("before")
    if not base or set(base) == {"0"}:
        return None
    if subprocess.run(["git", "cat-file", "-e", base + "^{commit}"], capture_output=True).returncode:
        subprocess.run(["git", "fetch", "--no-tags", "--depth=1", "origin", base], check=True)
    data = subprocess.check_output(["git", "diff", "--no-renames", "--name-only", "-z", base, "HEAD"])
    return data.decode("utf-8", errors="surrogateescape").rstrip("\0").split("\0")


def main():
    crates, dependencies = workspace_crates()
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    paths = changed_paths(event)
    packages = sorted(crates) if paths is None else affected_packages(paths, crates, dependencies)
    flags = " ".join("-p " + package for package in packages)
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        output.write(f"run={'true' if packages else 'false'}\npackages={flags}\n")
    print("Affected Rust crates: " + (", ".join(packages) or "none; checks skipped"))


if __name__ == "__main__":
    main()
