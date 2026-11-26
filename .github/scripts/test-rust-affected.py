import importlib.util
from pathlib import Path
import unittest
import sys

sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location("rust_affected", Path(__file__).with_name("rust-affected.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AffectedTests(unittest.TestCase):
    crates = {
        "pkmn": "crates/pkmn",
        "pkmn-tcg-dex-core": "crates/pkmn-tcg-dex-core",
        "pkmn-tcg-dex-sqlite": "crates/pkmn-tcg-dex-sqlite",
        "pkmn-tcg-dex-tcgdex": "crates/pkmn-tcg-dex-tcgdex",
        "pkmn-tcg-dex": "crates/pkmn-tcg-dex-cli",
    }
    dependencies = {
        "pkmn": {"serde", "serde_json"},
        "pkmn-tcg-dex-core": set(),
        "pkmn-tcg-dex-sqlite": {"pkmn-tcg-dex-core"},
        "pkmn-tcg-dex-tcgdex": {"pkmn-tcg-dex-core"},
        "pkmn-tcg-dex": {"pkmn-tcg-dex-core", "pkmn-tcg-dex-sqlite", "pkmn-tcg-dex-tcgdex"},
    }

    def select(self, *paths):
        return module.affected_packages(paths, self.crates, self.dependencies)

    def test_cli_only(self):
        self.assertEqual(self.select("crates/pkmn-tcg-dex-cli/src/main.rs"), ["pkmn-tcg-dex"])

    def test_battle_engine_only(self):
        self.assertEqual(self.select("crates/pkmn/src/lib.rs"), ["pkmn"])

    def test_sqlite_includes_cli(self):
        self.assertEqual(self.select("crates/pkmn-tcg-dex-sqlite/src/lib.rs"), ["pkmn-tcg-dex", "pkmn-tcg-dex-sqlite"])

    def test_adapter_includes_cli(self):
        self.assertEqual(self.select("crates/pkmn-tcg-dex-tcgdex/src/lib.rs"), ["pkmn-tcg-dex", "pkmn-tcg-dex-tcgdex"])

    def test_core_includes_transitive_dependents(self):
        self.assertEqual(
            self.select("crates/pkmn-tcg-dex-core/tests/fixtures/furret.json"),
            ["pkmn-tcg-dex", "pkmn-tcg-dex-core", "pkmn-tcg-dex-sqlite", "pkmn-tcg-dex-tcgdex"],
        )

    def test_shared_configuration_runs_all(self):
        for path in (*module.SHARED_FILES, ".cargo/config.toml"):
            with self.subTest(path=path):
                self.assertEqual(self.select(path), sorted(self.crates))

    def test_unrelated_and_documentation_skip(self):
        self.assertEqual(
            self.select(
                "apps/web/app/page.tsx",
                "README.md",
                "crates/pkmn-tcg-dex-cli/README.md",
                "crates/murmur-core/src/lib.rs",
                ".github/workflows/murmur.yml",
            ),
            [],
        )

    def test_workspace_discovery_excludes_murmur(self):
        crates, dependencies = module.workspace_crates(Path(__file__).parents[2])
        self.assertIn("pkmn", crates)
        self.assertEqual(crates["pkmn-tcg-dex"], "crates/pkmn-tcg-dex-cli")
        self.assertTrue(module.EXCLUDED.isdisjoint(crates))
        self.assertIn("pkmn-tcg-dex-core", dependencies["pkmn-tcg-dex"])


if __name__ == "__main__":
    unittest.main()
