# pkmn-tcg-dex

A Rust collection engine and CLI. Each physical copy has its own ID, variant,
condition, notes, and optional folder. Catalog metadata is cached with provider
references so owned cards remain searchable offline.

## Run

Install stable Rust, then run from the monorepo root:

```sh
cargo run -p pkmn-tcg-dex -- lookup swsh3-136
cargo run -p pkmn-tcg-dex -- lookup swsh3-136 --refresh
cargo run -p pkmn-tcg-dex -- add swsh3-136 --variant normal --folder Favorites
cargo run -p pkmn-tcg-dex -- list "tail smash" --folder Favorites
cargo run -p pkmn-tcg-dex -- list --set swsh3 --descending
cargo run -p pkmn-tcg-dex -- export > collection.json
cargo run -p pkmn-tcg-dex -- --db restored.sqlite import collection.json
cargo run -p pkmn-tcg-dex -- move COPY_UUID --folder Binder
cargo run -p pkmn-tcg-dex -- remove COPY_UUID
cargo install --path crates/pkmn-tcg-dex-cli
```

`add` displays a preview and asks for confirmation. Declining or EOF adds no copy.
`--yes` confirms explicitly for scripts. Repeated additions create separate copies.
Conditions are free text; variants must match the catalog. Omitting `--folder`
from `move` unfiles the copy. `remove` also requires confirmation or `--yes`.

Global options: `--db PATH` (default `pkmn-tcg-dex.sqlite` in the current directory),
`--language en`, and `--offline`. `list --card-language en` filters owned cards.
Search matches names, descriptions, moves/effects, and notes, ignoring case.
Sorting is by name, set ID, collector number as text, then copy ID; `--descending`
reverses it. `lookup` requires a full TCGdex ID: number `136` alone is ambiguous.

## Architecture

- `crates/pkmn-tcg-dex-core`: normalized cards, owned-copy validation, catalog/storage traits,
  cache-first preview, search, and the TCGdex adapter.
- `crates/pkmn-tcg-dex-sqlite`: bundled SQLite, versioned schema, persistence, atomic import.
- `crates/pkmn-tcg-dex-cli`: commands, preview rendering, explicit confirmation, JSON output.

A desktop app can call the libraries directly; a web app can use an HTTP wrapper.
Operations currently block: use worker threads for a desktop or async server.
Catalog and cache lookups include provider identity, language, and card ID.
Owned copies preserve their metadata snapshot. Imports merge by UUID: identical
records are skipped, conflicting data aborts the entire transaction. Imported
snapshots seed missing catalog entries but never replace existing cache records.
Backups currently use an unversioned v0.1 JSON array;
future schema evolution should introduce a versioned envelope.

## Catalog and limits

Public metadata comes from [TCGdex](https://tcgdex.dev/) at
`https://api.tcgdex.net/v2/{language}/cards/{id}`. No key is needed. Requests time
out after 20 seconds. Cached records are reused unless `lookup --refresh` is used.
Refresh updates the catalog cache without changing existing owned-copy snapshots;
it cannot be combined with `--offline`. Uncached offline lookup fails clearly.
Imports use buffered reads and reject files over 64 MiB or arrays over 100,000
copies before writing to the collection. Images are linked, not downloaded.
Review upstream data/image terms and attribution before public release.

Folders are currently one optional name per copy, created by assignment. Nested
folders, multiple memberships, series metadata/filtering, rarity/type filters,
additional sort fields, acquisition details, camera/OCR, cloud sync, and UI are
future work. Set filtering works now. Search loads owned copies into memory;
indexed queries can replace this for larger collections.

## Validate

```sh
cargo fmt -p pkmn-tcg-dex -p pkmn-tcg-dex-core -p pkmn-tcg-dex-sqlite -- --check
cargo test -p pkmn-tcg-dex -p pkmn-tcg-dex-core -p pkmn-tcg-dex-sqlite
cargo clippy -p pkmn-tcg-dex -p pkmn-tcg-dex-core -p pkmn-tcg-dex-sqlite --all-targets -- -D warnings
```

Tests use a captured public TCGdex record and cover normalization, move search,
invalid variants, independent duplicate copies, persistence, import rollback,
cache preservation and refresh, provider isolation, offline misses, input limits,
sorting, locked/deleted moves, cancelled additions, and the CLI backup workflow.

Validation targets the three Pokémon crates explicitly; Murmur shares the Cargo
workspace and has separate native audio and ML build requirements.

CI selects affected Pokémon crates and their transitive dependents from the Cargo
manifests. Shared Cargo/toolchain configuration and CI changes check all three.
Unrelated changes and crate documentation changes skip Rust setup and compilation;
the named Rust check still succeeds, so required branch checks do not remain pending.
