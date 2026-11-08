use anyhow::{Result, ensure};
use pkmn_tcg_dex_core::{Card, CollectionStore, OwnedCopy};
use rusqlite::{Connection, params};
use std::path::Path;

pub struct SqliteStore {
    connection: Connection,
}

impl SqliteStore {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let connection = Connection::open(path)?;
        connection.busy_timeout(std::time::Duration::from_secs(5))?;
        let version: i64 = connection.query_row("PRAGMA user_version", [], |r| r.get(0))?;
        ensure!(version <= 1, "Database was created by a newer application");
        if version == 0 {
            connection.execute_batch("BEGIN;
                CREATE TABLE cards (provider TEXT NOT NULL, language TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(provider, language, id));
                CREATE TABLE copies (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
                PRAGMA user_version = 1;
                COMMIT;")?;
        }
        Ok(Self { connection })
    }

    /// Merge an exported collection atomically. Existing identical IDs are skipped;
    /// conflicting IDs fail rather than overwriting local edits.
    pub fn import(&mut self, copies: &[OwnedCopy]) -> Result<()> {
        for copy in copies {
            copy.validate()?;
        }
        let tx = self.connection.transaction()?;
        for copy in copies {
            let data = serde_json::to_string(copy)?;
            let existing: Option<String> = tx
                .query_row(
                    "SELECT data FROM copies WHERE id=?1",
                    [copy.id.to_string()],
                    |r| r.get(0),
                )
                .optional()?;
            if let Some(existing) = existing {
                ensure!(
                    serde_json::from_str::<OwnedCopy>(&existing)? == *copy,
                    "Import conflict for copy {}",
                    copy.id
                );
            } else {
                tx.execute(
                    "INSERT INTO copies(id,data) VALUES (?1,?2)",
                    params![copy.id.to_string(), data],
                )?;
            }
            let card = &copy.card;
            tx.execute("INSERT INTO cards(provider,language,id,data) VALUES (?1,?2,?3,?4) ON CONFLICT DO NOTHING", params![card.provider, card.language, card.id, serde_json::to_string(card)?])?;
        }
        tx.commit()?;
        Ok(())
    }
}

use rusqlite::OptionalExtension;
impl CollectionStore for SqliteStore {
    fn cache(&mut self, card: &Card) -> Result<()> {
        card.validate()?;
        self.connection.execute("INSERT INTO cards(provider,language,id,data) VALUES (?1,?2,?3,?4) ON CONFLICT DO UPDATE SET data=excluded.data", params![card.provider, card.language, card.id, serde_json::to_string(card)?])?;
        Ok(())
    }
    fn cached(&self, provider: &str, language: &str, id: &str) -> Result<Option<Card>> {
        let data: Option<String> = self
            .connection
            .query_row(
                "SELECT data FROM cards WHERE provider=?1 AND language=?2 AND id=?3",
                params![provider, language, id],
                |r| r.get(0),
            )
            .optional()?;
        data.map(|s| Ok(serde_json::from_str(&s)?)).transpose()
    }
    fn cached_cards(&self, provider: &str, language: &str) -> Result<Vec<Card>> {
        let mut stmt = self
            .connection
            .prepare("SELECT data FROM cards WHERE provider=?1 AND language=?2 ORDER BY id")?;
        let rows = stmt.query_map(params![provider, language], |r| r.get::<_, String>(0))?;
        rows.map(|row| Ok(serde_json::from_str(&row?)?)).collect()
    }
    fn add(&mut self, copy: &OwnedCopy) -> Result<()> {
        copy.validate()?;
        self.connection.execute(
            "INSERT INTO copies(id,data) VALUES (?1,?2)",
            params![copy.id.to_string(), serde_json::to_string(copy)?],
        )?;
        Ok(())
    }
    fn copies(&self) -> Result<Vec<OwnedCopy>> {
        let mut stmt = self
            .connection
            .prepare("SELECT data FROM copies ORDER BY id")?;
        let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
        rows.map(|r| Ok(serde_json::from_str(&r?)?)).collect()
    }
    fn move_copy(&mut self, id: &str, folder: Option<&str>) -> Result<()> {
        ensure!(
            folder.is_none_or(|s| !s.trim().is_empty()),
            "Folder cannot be blank"
        );
        let tx = self
            .connection
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        let data: String =
            tx.query_row("SELECT data FROM copies WHERE id=?1", [id], |r| r.get(0))?;
        let mut copy: OwnedCopy = serde_json::from_str(&data)?;
        copy.folder = folder.map(str::to_owned);
        let changed = tx.execute(
            "UPDATE copies SET data=?1 WHERE id=?2",
            params![serde_json::to_string(&copy)?, id],
        )?;
        ensure!(changed == 1, "Copy not found");
        tx.commit()?;
        Ok(())
    }
    fn remove(&mut self, id: &str) -> Result<()> {
        ensure!(
            self.connection
                .execute("DELETE FROM copies WHERE id=?1", [id])?
                == 1,
            "Copy not found"
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pkmn_tcg_dex_core::identification::{Identification, identify};
    use pkmn_tcg_dex_core::{Catalog, preview, refresh};

    struct FakeCatalog {
        card: Card,
        calls: std::cell::Cell<usize>,
    }
    impl Catalog for FakeCatalog {
        fn provider(&self) -> &str {
            &self.card.provider
        }
        fn lookup(&self, _: &str, _: &str) -> Result<Card> {
            self.calls.set(self.calls.get() + 1);
            Ok(self.card.clone())
        }
    }
    fn copy() -> OwnedCopy {
        OwnedCopy::new(
            Card {
                provider: "tcgdex".into(),
                id: "test-1".into(),
                language: "en".into(),
                name: "Test".into(),
                set_id: "test".into(),
                set_name: "Test Set".into(),
                number: "1".into(),
                description: String::new(),
                moves: vec![],
                variants: vec!["normal".into()],
                image_url: None,
            },
            "normal".into(),
            "unknown".into(),
            None,
            String::new(),
        )
        .unwrap()
    }
    #[test]
    fn copies_move_independently_and_persist() -> Result<()> {
        let path = std::env::temp_dir().join(format!("pkmn-tcg-dex-{}.sqlite", copy().id));
        let first = copy();
        let second = copy();
        {
            let mut store = SqliteStore::open(&path)?;
            store.add(&first)?;
            store.add(&second)?;
            store.move_copy(&first.id.to_string(), Some("Binder"))?;
        }
        let mut store = SqliteStore::open(&path)?;
        let copies = store.copies()?;
        assert_eq!(copies.len(), 2);
        assert_eq!(
            copies
                .iter()
                .find(|c| c.id == first.id)
                .unwrap()
                .folder
                .as_deref(),
            Some("Binder")
        );
        assert_eq!(
            copies.iter().find(|c| c.id == second.id).unwrap().folder,
            None
        );
        store.remove(&first.id.to_string())?;
        assert_eq!(store.copies()?, vec![second]);
        drop(store);
        std::fs::remove_file(path)?;
        Ok(())
    }
    #[test]
    fn import_is_idempotent_and_rolls_back_on_conflict() -> Result<()> {
        let mut store = SqliteStore::open(":memory:")?;
        let original = copy();
        store.import(std::slice::from_ref(&original))?;
        store.import(std::slice::from_ref(&original))?;
        let mut conflict = original.clone();
        conflict.notes = "changed".into();
        assert!(store.import(&[copy(), conflict]).is_err());
        assert_eq!(store.copies()?, vec![original]);
        Ok(())
    }

    #[test]
    fn imports_preserve_current_cache_and_refresh_preserves_owned_snapshots() -> Result<()> {
        let mut store = SqliteStore::open(":memory:")?;
        let snapshot = copy();
        let mut current = snapshot.card.clone();
        current.description = "Current metadata".into();
        store.cache(&current)?;
        store.import(std::slice::from_ref(&snapshot))?;
        assert_eq!(
            store.cached("tcgdex", "en", "test-1")?,
            Some(current.clone())
        );
        current.description = "Refreshed metadata".into();
        let catalog = FakeCatalog {
            card: current.clone(),
            calls: 0.into(),
        };
        assert_eq!(refresh(&catalog, &mut store, "en", "test-1")?, current);
        assert_eq!(store.cached("tcgdex", "en", "test-1")?, Some(current));
        assert_eq!(store.copies()?, vec![snapshot]);
        Ok(())
    }

    #[test]
    fn preview_isolates_providers_and_offline_misses_do_not_fetch() -> Result<()> {
        let mut store = SqliteStore::open(":memory:")?;
        let card = copy().card;
        store.cache(&card)?;
        let mut other = card.clone();
        other.provider = "other".into();
        let catalog = FakeCatalog {
            card: other.clone(),
            calls: 0.into(),
        };
        assert!(preview(&catalog, &mut store, "en", "test-1", true).is_err());
        assert_eq!(catalog.calls.get(), 0);
        assert_eq!(preview(&catalog, &mut store, "en", "test-1", false)?, other);
        assert_eq!(preview(&catalog, &mut store, "en", "test-1", true)?, other);
        assert_eq!(catalog.calls.get(), 1);
        assert_eq!(store.cached("tcgdex", "en", "test-1")?, Some(card));
        assert_eq!(store.cached("other", "en", "test-1")?, Some(other));
        Ok(())
    }

    #[test]
    fn mismatched_catalog_response_does_not_replace_cache() -> Result<()> {
        let mut store = SqliteStore::open(":memory:")?;
        let card = copy().card;
        store.cache(&card)?;
        let mut wrong = card.clone();
        wrong.id = "wrong".into();
        let catalog = FakeCatalog {
            card: wrong,
            calls: 0.into(),
        };
        assert!(refresh(&catalog, &mut store, "en", "test-1").is_err());
        assert_eq!(store.cached("tcgdex", "en", "test-1")?, Some(card));
        Ok(())
    }

    #[test]
    fn moves_fail_when_locked_or_deleted_without_changing_copy() -> Result<()> {
        let original = copy();
        let path = std::env::temp_dir().join(format!("pkmn-tcg-dex-lock-{}.sqlite", original.id));
        let mut store = SqliteStore::open(&path)?;
        store
            .connection
            .busy_timeout(std::time::Duration::from_millis(10))?;
        store.add(&original)?;
        let mut other = Connection::open(&path)?;
        let lock = other.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        assert!(
            store
                .move_copy(&original.id.to_string(), Some("Binder"))
                .is_err()
        );
        lock.commit()?;
        assert_eq!(store.copies()?, vec![original.clone()]);
        store.move_copy(&original.id.to_string(), Some("Binder"))?;
        other.execute("DELETE FROM copies WHERE id=?1", [original.id.to_string()])?;
        assert!(
            store
                .move_copy(&original.id.to_string(), Some("Other"))
                .is_err()
        );
        assert!(store.copies()?.is_empty());
        drop(other);
        drop(store);
        std::fs::remove_file(path)?;
        Ok(())
    }

    #[test]
    fn offline_identification_pages_cached_records_without_fetching() -> Result<()> {
        let mut store = SqliteStore::open(":memory:")?;
        let original = copy().card;
        for index in 0..25 {
            let mut card = original.clone();
            card.id = format!("test-{index:02}");
            card.number = index.to_string();
            store.cache(&card)?;
        }
        let catalog = FakeCatalog {
            card: original,
            calls: 0.into(),
        };
        let mut query = Identification {
            name: Some("test".into()),
            ..Default::default()
        };
        let first = identify(&catalog, &store, "en", &query, true)?;
        assert_eq!(first.len(), 20);
        query.page = 2;
        let second = identify(&catalog, &store, "en", &query, true)?;
        assert_eq!(second.len(), 5);
        assert!(!first.iter().any(|a| second.iter().any(|b| a.id == b.id)));
        assert_eq!(catalog.calls.get(), 0);
        assert!(identify(&catalog, &store, "ja", &query, true)?.is_empty());
        Ok(())
    }
}
