use pkmn_tcg_dex_core::{OwnedCopy, normalize_tcgdex};
use std::{
    io::Write,
    process::{Command, Stdio},
};

#[test]
fn offline_preview_confirmation_and_backup_roundtrip() {
    let raw = serde_json::from_str(include_str!(
        "../../../packages/pkmn-tcg-dex-core/tests/fixtures/furret.json"
    ))
    .unwrap();
    let card = normalize_tcgdex("en", &raw).unwrap();
    let copy =
        OwnedCopy::new(card, "normal".into(), "unknown".into(), None, String::new()).unwrap();
    let dir = std::env::temp_dir().join(format!("pkmn-tcg-dex-cli-{}", copy.id));
    std::fs::create_dir(&dir).unwrap();
    let db = dir.join("collection.sqlite");
    let backup = dir.join("backup.json");
    std::fs::write(&backup, serde_json::to_vec(&vec![copy]).unwrap()).unwrap();
    let run = |args: &[&str], input: &str| {
        let mut child = Command::new(env!("CARGO_BIN_EXE_pkmn-tcg-dex"))
            .arg("--db")
            .arg(&db)
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
        let output = child.wait_with_output().unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        output.stdout
    };
    run(&["import", backup.to_str().unwrap()], "");
    let preview: serde_json::Value =
        serde_json::from_slice(&run(&["lookup", "swsh3-136"], "")).unwrap();
    assert_eq!(preview["name"], "Furret");
    run(&["add", "swsh3-136"], "n\n");
    let copies: Vec<OwnedCopy> = serde_json::from_slice(&run(&["export"], "")).unwrap();
    assert_eq!(copies.len(), 1);
    run(&["add", "swsh3-136", "--folder", "Binder", "--yes"], "");
    let found: Vec<OwnedCopy> = serde_json::from_slice(&run(
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
    run(
        &["move", &found[0].id.to_string(), "--folder", "Favorites"],
        "",
    );
    let exported = run(&["export"], "");
    std::fs::write(&backup, &exported).unwrap();
    run(&["import", backup.to_str().unwrap()], "");
    assert_eq!(run(&["export"], ""), exported);
    run(&["remove", &found[0].id.to_string(), "--yes"], "");
    let copies: Vec<OwnedCopy> = serde_json::from_slice(&run(&["export"], "")).unwrap();
    assert_eq!(copies.len(), 1);
    std::fs::remove_dir_all(dir).unwrap();
}
