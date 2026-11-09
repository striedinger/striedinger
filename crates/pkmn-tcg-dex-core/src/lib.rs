//! Portable collection rules. UI confirmation, cameras, and storage live outside this crate.
pub mod grouping;
pub mod identification;

use anyhow::{Context, Result, bail, ensure};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A normalized catalog printing, identified by provider, language, and card ID.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Card {
    /// Catalog provider namespace.
    pub provider: String,
    /// Provider-specific printing ID.
    pub id: String,
    /// Catalog language code.
    pub language: String,
    /// Localized card name.
    pub name: String,
    /// Provider-specific set ID.
    pub set_id: String,
    /// Localized set name.
    pub set_name: String,
    /// Collector number, including any promo prefix.
    pub number: String,
    /// Localized descriptive or rules text.
    pub description: String,
    /// Attack names and effects used for searching.
    pub moves: Vec<String>,
    /// Variant identifiers available for this printing.
    pub variants: Vec<String>,
    /// Remote image URL; image bytes are not stored here.
    pub image_url: Option<String>,
}

impl Card {
    /// Validate nonempty catalog identity fields.
    ///
    /// # Errors
    /// Returns an error if an identity field is empty or blank.
    pub fn validate(&self) -> Result<()> {
        for value in [
            &self.provider,
            &self.id,
            &self.language,
            &self.name,
            &self.set_id,
            &self.number,
        ] {
            ensure!(
                !value.trim().is_empty(),
                "Card identity fields cannot be empty"
            );
        }
        Ok(())
    }
}

/// One physical copy, with its catalog snapshot and collection metadata.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct OwnedCopy {
    /// Stable physical-copy ID used by moves, deletion, and backup merging.
    pub id: Uuid,
    /// Catalog snapshot captured when this copy was added.
    pub card: Card,
    /// Selected printing variant.
    pub variant: String,
    /// Collector-supplied condition label.
    pub condition: String,
    /// Optional folder name; absent means unfiled.
    pub folder: Option<String>,
    /// Collector-supplied notes for this copy.
    pub notes: String,
}

impl OwnedCopy {
    /// Construct and validate a prospective physical copy.
    /// Obtain caller confirmation before persisting it with `CollectionStore::add`.
    ///
    /// # Errors
    /// Returns an error for invalid identity, variant, condition, or folder fields.
    pub fn new(
        card: Card,
        variant: String,
        condition: String,
        folder: Option<String>,
        notes: String,
    ) -> Result<Self> {
        let copy = Self {
            id: Uuid::new_v4(),
            card,
            variant,
            condition,
            folder,
            notes,
        };
        copy.validate()?;
        Ok(copy)
    }

    /// Validate the snapshot and collection fields.
    ///
    /// # Errors
    /// Returns an error for an unavailable variant or blank required fields.
    pub fn validate(&self) -> Result<()> {
        self.card.validate()?;
        ensure!(!self.variant.trim().is_empty(), "Variant cannot be empty");
        ensure!(
            self.card.variants.contains(&self.variant),
            "Variant is not available for this card"
        );
        ensure!(
            !self.condition.trim().is_empty(),
            "Condition cannot be empty"
        );
        ensure!(
            self.folder.as_ref().is_none_or(|f| !f.trim().is_empty()),
            "Folder cannot be blank"
        );
        Ok(())
    }
}

/// Catalog boundary implemented by external metadata providers.
pub trait Catalog {
    /// Return the provider namespace used in cache keys.
    fn provider(&self) -> &str;
    /// Resolve one full printing ID.
    ///
    /// # Errors
    /// Returns an error for missing cards or provider failures.
    fn lookup(&self, language: &str, id: &str) -> Result<Card>;
    /// Return one page of candidate printings.
    ///
    /// # Errors
    /// Returns an error for invalid queries, provider failures, or unsupported search.
    fn find(
        &self,
        _language: &str,
        _query: &identification::Identification,
    ) -> Result<Vec<identification::Candidate>> {
        bail!("This catalog does not support identification")
    }
}

/// Storage boundary for cached catalog records and owned physical copies.
pub trait CollectionStore {
    /// Insert or replace a normalized catalog record.
    ///
    /// # Errors
    /// Returns an error for invalid records or storage failures.
    fn cache(&mut self, card: &Card) -> Result<()>;
    /// Read a cached record by provider, language, and full ID.
    ///
    /// # Errors
    /// Returns an error for storage or deserialization failures.
    fn cached(&self, provider: &str, language: &str, id: &str) -> Result<Option<Card>>;
    /// Read all cached records for one provider and language.
    ///
    /// # Errors
    /// Returns an error for storage or deserialization failures.
    fn cached_cards(&self, provider: &str, language: &str) -> Result<Vec<Card>>;
    /// Persist a validated physical copy after caller confirmation; cache separately.
    ///
    /// # Errors
    /// Returns an error for invalid copies, duplicate IDs, or storage failures.
    fn add(&mut self, copy: &OwnedCopy) -> Result<()>;
    /// Read the physical copies currently stored.
    ///
    /// # Errors
    /// Returns an error for storage or deserialization failures.
    fn copies(&self) -> Result<Vec<OwnedCopy>>;
    /// Assign a physical copy to a folder, or unfile it with `None`.
    ///
    /// # Errors
    /// Returns an error for missing copies, invalid folders, or storage failures.
    fn move_copy(&mut self, id: &str, folder: Option<&str>) -> Result<()>;
    /// Delete one physical copy by its ID.
    ///
    /// # Errors
    /// Returns an error for missing copies or storage failures.
    fn remove(&mut self, id: &str) -> Result<()>;
}

/// Resolve a preview from cache, fetching and caching a full record when online.
///
/// # Errors
/// Returns an error for offline cache misses, identity mismatches, or provider/storage failures.
pub fn preview(
    catalog: &impl Catalog,
    store: &mut impl CollectionStore,
    language: &str,
    id: &str,
    offline: bool,
) -> Result<Card> {
    if let Some(card) = store.cached(catalog.provider(), language, id)? {
        return Ok(card);
    }
    ensure!(!offline, "Card is not cached; run lookup online first");
    refresh(catalog, store, language, id)
}

/// Fetch current catalog metadata without changing existing owned-copy snapshots.
///
/// # Errors
/// Returns an error for invalid metadata, identity mismatches, or provider/storage failures.
pub fn refresh(
    catalog: &impl Catalog,
    store: &mut impl CollectionStore,
    language: &str,
    id: &str,
) -> Result<Card> {
    let card = catalog.lookup(language, id)?;
    card.validate()?;
    ensure!(
        card.provider == catalog.provider() && card.id == id && card.language == language,
        "Catalog returned a different card"
    );
    store.cache(&card)?;
    Ok(card)
}

/// Filters for owned copies; optional fields match exactly.
#[derive(Default)]
pub struct Query {
    /// Case-insensitive substring across names, descriptions, moves, and notes.
    pub text: String,
    /// Optional set ID filter.
    pub set: Option<String>,
    /// Optional folder name filter.
    pub folder: Option<String>,
    /// Optional catalog language filter.
    pub language: Option<String>,
    /// Optional variant identifier filter.
    pub variant: Option<String>,
    /// Optional condition label filter.
    pub condition: Option<String>,
    /// Reverse the default name, set, collector-number, and copy-ID order.
    pub descending: bool,
}

/// Filter copies and sort by name, set, collector number as text, and copy ID.
#[must_use]
pub fn search(mut copies: Vec<OwnedCopy>, query: &Query) -> Vec<OwnedCopy> {
    let needle = query.text.to_lowercase();
    copies.retain(|c| {
        query.set.as_ref().is_none_or(|s| s == &c.card.set_id)
            && query
                .folder
                .as_ref()
                .is_none_or(|f| Some(f) == c.folder.as_ref())
            && query
                .language
                .as_ref()
                .is_none_or(|l| l == &c.card.language)
            && query.variant.as_ref().is_none_or(|v| v == &c.variant)
            && query
                .condition
                .as_ref()
                .is_none_or(|condition| condition == &c.condition)
            && (needle.is_empty()
                || format!(
                    "{} {} {} {}",
                    c.card.name,
                    c.card.description,
                    c.card.moves.join(" "),
                    c.notes
                )
                .to_lowercase()
                .contains(&needle))
    });
    copies.sort_by_cached_key(|c| {
        (
            c.card.name.to_lowercase(),
            c.card.set_id.clone(),
            c.card.number.clone(),
            c.id,
        )
    });
    if query.descending {
        copies.reverse();
    }
    copies
}

/// Convert a full `TCGdex` JSON record to the normalized catalog schema.
///
/// # Errors
/// Returns an error for missing required metadata or invalid identity fields.
pub fn normalize_tcgdex(language: &str, raw: &serde_json::Value) -> Result<Card> {
    let required = |value: &serde_json::Value| {
        value
            .as_str()
            .map(str::to_owned)
            .context("Incomplete catalog record")
    };
    let card = Card {
        provider: "tcgdex".into(),
        id: required(&raw["id"])?,
        language: language.into(),
        name: required(&raw["name"])?,
        set_id: required(&raw["set"]["id"])?,
        set_name: required(&raw["set"]["name"])?,
        number: required(&raw["localId"])?,
        description: raw["description"].as_str().unwrap_or_default().into(),
        moves: raw["attacks"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|a| {
                format!(
                    "{} {}",
                    a["name"].as_str().unwrap_or_default(),
                    a["effect"].as_str().unwrap_or_default()
                )
            })
            .collect(),
        variants: raw["variants"]
            .as_object()
            .into_iter()
            .flatten()
            .filter(|(_, v)| v.as_bool() == Some(true))
            .map(|(k, _)| k.clone())
            .collect(),
        image_url: raw["image"].as_str().map(|s| format!("{s}/high.webp")),
    };
    card.validate()?;
    Ok(card)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn card() -> Card {
        normalize_tcgdex(
            "en",
            &serde_json::from_str(include_str!("../tests/fixtures/furret.json")).unwrap(),
        )
        .unwrap()
    }
    #[test]
    fn normalizes_real_record_and_searches_moves() {
        let card = card();
        assert_eq!(card.name, "Furret");
        let copy = OwnedCopy::new(
            card,
            "normal".into(),
            "near-mint".into(),
            Some("Binder".into()),
            String::new(),
        )
        .unwrap();
        assert_eq!(
            search(
                vec![copy.clone()],
                &Query {
                    text: "TAIL SMASH".into(),
                    ..Default::default()
                }
            ),
            vec![copy.clone()]
        );
        assert_eq!(
            search(
                vec![copy],
                &Query {
                    folder: Some("Other".into()),
                    ..Default::default()
                }
            ),
            [] as [OwnedCopy; 0]
        );
    }
    #[test]
    fn rejects_unavailable_variant() {
        assert!(OwnedCopy::new(card(), "holo".into(), "mint".into(), None, String::new()).is_err());
    }

    #[test]
    fn empty_search_filters_and_sorting_are_consistent() {
        let mut first = OwnedCopy::new(
            card(),
            "normal".into(),
            "unknown".into(),
            Some("Binder".into()),
            String::new(),
        )
        .unwrap();
        first.card.name = "abra".into();
        let mut second = first.clone();
        second.id = Uuid::new_v4();
        second.card.name = "Abra".into();
        second.card.number = "2".into();
        let mut excluded = first.clone();
        excluded.id = Uuid::new_v4();
        excluded.folder = Some("Other".into());
        let query = Query {
            folder: Some("Binder".into()),
            set: Some("swsh3".into()),
            language: Some("en".into()),
            ..Default::default()
        };
        let ascending = search(
            vec![excluded.clone(), second.clone(), first.clone()],
            &query,
        );
        assert_eq!(ascending, vec![first.clone(), second.clone()]);
        let descending = search(
            vec![excluded, first, second],
            &Query {
                descending: true,
                ..query
            },
        );
        assert_eq!(descending, ascending.into_iter().rev().collect::<Vec<_>>());
    }
}
