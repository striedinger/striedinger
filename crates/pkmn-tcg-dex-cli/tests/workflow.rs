//! End-to-end collection workflows using isolated databases and no network.
use pkmn_tcg_dex_core::{OwnedCopy, normalize_tcgdex};
use std::{
    io::Write,
    path::PathBuf,
    process::{Command, Output, Stdio},
};

fn copy() -> OwnedCopy {
    let raw = serde_json::from_str(include_str!(
        "../../pkmn-tcg-dex-core/tests/fixtures/furret.json"
    ))
    .unwrap();
    let card = normalize_tcgdex("en", &raw).unwrap();
    OwnedCopy::new(card, "normal".into(), "unknown".into(), None, String::new()).unwrap()
}

struct Collection {
    dir: PathBuf,
    db: PathBuf,
    backup: PathBuf,
}

impl Collection {
    fn new(copies: &[OwnedCopy]) -> Self {
        let dir = std::env::temp_dir().join(format!("pkmn-tcg-dex-cli-{}", copies[0].id));
        std::fs::create_dir(&dir).unwrap();
        let collection = Self {
            db: dir.join("collection.sqlite"),
            backup: dir.join("backup.json"),
            dir,
        };
        std::fs::write(&collection.backup, serde_json::to_vec(copies).unwrap()).unwrap();
        collection.run(&["import", collection.backup.to_str().unwrap()], "");
        collection
    }

    fn raw(&self, args: &[&str], input: &str) -> Output {
        let mut child = Command::new(env!("CARGO_BIN_EXE_pkmn-tcg-dex"))
            .arg("--db")
            .arg(&self.db)
            .arg("--offline")
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        child
            .stdin
            .take()
            .unwrap()
            .write_all(input.as_bytes())
            .unwrap();
        child.wait_with_output().unwrap()
    }

    fn run(&self, args: &[&str], input: &str) -> Vec<u8> {
        let output = self.raw(args, input);
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        output.stdout
    }
}

impl Drop for Collection {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

#[test]
fn scripted_search_cannot_treat_a_single_later_page_result_as_unambiguous() {
    let copies: Vec<_> = (0..21)
        .map(|index| {
            let mut owned = copy();
            owned.card.id = format!("demo-{index:02}");
            owned.card.set_id = "demo".into();
            owned.card.number = index.to_string();
            owned
        })
        .collect();
    let collection = Collection::new(&copies);
    let before = collection.run(&["export"], "");
    let found: Vec<serde_json::Value> =
        serde_json::from_slice(&collection.run(&["find", "--name", "Furret", "--page", "2"], ""))
            .unwrap();
    assert_eq!(found.len(), 1);
    let added = collection.raw(&["add", "--name", "Furret", "--page", "2", "--yes"], "");
    assert!(!added.status.success());
    assert!(String::from_utf8_lossy(&added.stderr).contains("first search page"));
    assert_eq!(collection.run(&["export"], ""), before);
    collection.run(&["add", found[0]["id"].as_str().unwrap(), "--yes"], "");
    let after: Vec<OwnedCopy> = serde_json::from_slice(&collection.run(&["export"], "")).unwrap();
    assert_eq!(after.len(), 22);
}

#[test]
fn offline_preview_confirmation_and_backup_roundtrip() {
    let collection = Collection::new(&[copy()]);
    let preview: serde_json::Value =
        serde_json::from_slice(&collection.run(&["lookup", "swsh3-136"], "")).unwrap();
    assert_eq!(preview["name"], "Furret");
    collection.run(&["add", "swsh3-136"], "n\n");
    let copies: Vec<OwnedCopy> = serde_json::from_slice(&collection.run(&["export"], "")).unwrap();
    assert_eq!(copies.len(), 1);
    collection.run(&["add", "swsh3-136", "--folder", "Binder", "--yes"], "");
    let found: Vec<OwnedCopy> = serde_json::from_slice(&collection.run(
        &[
            "list",
            "tail smash",
            "--folder",
            "Binder",
            "--card-language",
            "en",
        ],
        "",
    ))
    .unwrap();
    assert_eq!(found.len(), 1);
    collection.run(
        &["move", &found[0].id.to_string(), "--folder", "Favorites"],
        "",
    );
    let exported = collection.run(&["export"], "");
    std::fs::write(&collection.backup, &exported).unwrap();
    collection.run(&["import", collection.backup.to_str().unwrap()], "");
    assert_eq!(collection.run(&["export"], ""), exported);
    collection.run(&["remove", &found[0].id.to_string(), "--yes"], "");
    let copies: Vec<OwnedCopy> = serde_json::from_slice(&collection.run(&["export"], "")).unwrap();
    assert_eq!(copies.len(), 1);
}

#[test]
fn offline_identification_variants_grouping_and_language_filters() {
    let first = copy();
    let mut other = copy();
    other.card.id = "swsh4-99".into();
    other.card.set_id = "swsh4".into();
    other.card.number = "99".into();
    let collection = Collection::new(&[first, other]);
    let candidates: Vec<serde_json::Value> =
        serde_json::from_slice(&collection.run(&["find", "--name", "fUrReT"], "")).unwrap();
    assert_eq!(candidates.len(), 2);
    let by_number: Vec<serde_json::Value> = serde_json::from_slice(
        &collection.run(&["find", "--set", "swsh3", "--number", "0136/189"], ""),
    )
    .unwrap();
    assert_eq!(by_number.len(), 1);
    assert_eq!(by_number[0]["id"], "swsh3-136");
    let before_cancel = collection.run(&["export"], "");
    collection.run(&["add", "--name", "Furret"], "\n");
    assert_eq!(collection.run(&["export"], ""), before_cancel);
    assert!(
        !collection
            .raw(&["add", "--name", "Furret", "--yes"], "")
            .status
            .success()
    );
    assert_eq!(collection.run(&["export"], ""), before_cancel);
    collection.run(&["add", "--name", "Furret"], "1\n1\ny\n");
    let grouped: Vec<serde_json::Value> = serde_json::from_slice(&collection.run(
        &[
            "list",
            "--group",
            "--variant",
            "normal",
            "--condition",
            "unknown",
        ],
        "",
    ))
    .unwrap();
    assert_eq!(grouped.len(), 2);
    assert_eq!(
        grouped
            .iter()
            .map(|g| g["quantity"].as_u64().unwrap())
            .sum::<u64>(),
        3
    );
    let table = String::from_utf8(collection.run(&["list", "--group", "--table"], "")).unwrap();
    assert!(table.contains("QTY") && table.contains("Furret"));
    let reverse: Vec<serde_json::Value> =
        serde_json::from_slice(&collection.run(&["list", "--variant", "reverse"], "")).unwrap();
    assert_eq!(reverse, [] as [serde_json::Value; 0]);
    let mut japanese = copy();
    japanese.card.language = "ja".into();
    std::fs::write(
        &collection.backup,
        serde_json::to_vec(&vec![japanese]).unwrap(),
    )
    .unwrap();
    collection.run(&["import", collection.backup.to_str().unwrap()], "");
    let all: Vec<OwnedCopy> =
        serde_json::from_slice(&collection.run(&["--language", "ja", "list"], "")).unwrap();
    assert_eq!(all.len(), 4);
    let japanese: Vec<OwnedCopy> =
        serde_json::from_slice(&collection.run(&["list", "--card-language", "ja"], "")).unwrap();
    assert_eq!(japanese.len(), 1);
}
