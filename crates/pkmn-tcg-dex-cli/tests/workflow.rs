use pkmn_tcg_dex_core::{OwnedCopy, normalize_tcgdex};
use std::{
    io::Write,
    process::{Command, Stdio},
};

#[test]
fn offline_preview_confirmation_and_backup_roundtrip() {
    let raw = serde_json::from_str(include_str!(
        "../../pkmn-tcg-dex-core/tests/fixtures/furret.json"
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
    let mut other_card = copies[0].card.clone();
    other_card.id = "swsh4-99".into();
    other_card.set_id = "swsh4".into();
    other_card.number = "99".into();
    let other = OwnedCopy::new(
        other_card,
        "normal".into(),
        "unknown".into(),
        None,
        String::new(),
    )
    .unwrap();
    std::fs::write(&backup, serde_json::to_vec(&vec![other]).unwrap()).unwrap();
    run(&["import", backup.to_str().unwrap()], "");
    let candidates: Vec<serde_json::Value> =
        serde_json::from_slice(&run(&["find", "--name", "fUrReT"], "")).unwrap();
    assert_eq!(candidates.len(), 2);
    let by_number: Vec<serde_json::Value> = serde_json::from_slice(&run(
        &["find", "--set", "swsh3", "--number", "0136/189"],
        "",
    ))
    .unwrap();
    assert_eq!(by_number.len(), 1);
    assert_eq!(by_number[0]["id"], "swsh3-136");
    let before_cancel = run(&["export"], "");
    run(&["add", "--name", "Furret"], "\n");
    assert_eq!(run(&["export"], ""), before_cancel);
    let ambiguous = Command::new(env!("CARGO_BIN_EXE_pkmn-tcg-dex"))
        .arg("--db")
        .arg(&db)
        .args(["--offline", "add", "--name", "Furret", "--yes"])
        .output()
        .unwrap();
    assert!(!ambiguous.status.success());
    assert_eq!(run(&["export"], ""), before_cancel);
    // Choose the first printing, then its normal variant, then confirm.
    run(&["add", "--name", "Furret"], "1\n1\ny\n");
    let grouped: Vec<serde_json::Value> = serde_json::from_slice(&run(
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
    let table = String::from_utf8(run(&["list", "--group", "--table"], "")).unwrap();
    assert!(table.contains("QTY") && table.contains("Furret"));
    let reverse_only: Vec<serde_json::Value> =
        serde_json::from_slice(&run(&["list", "--variant", "reverse"], "")).unwrap();
    assert!(reverse_only.is_empty());
    std::fs::remove_dir_all(dir).unwrap();
}
