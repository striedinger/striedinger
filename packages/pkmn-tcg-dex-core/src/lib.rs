//! Portable collection rules. UI confirmation, cameras, and storage live outside this crate.
use anyhow::{Context, Result, bail, ensure};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Card {
    pub provider: String,
    pub id: String,
    pub language: String,
    pub name: String,
    pub set_id: String,
    pub set_name: String,
    pub number: String,
    pub description: String,
    pub moves: Vec<String>,
    pub variants: Vec<String>,
    pub image_url: Option<String>,
}

impl Card {
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

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct OwnedCopy {
    pub id: Uuid,
    pub card: Card,
    pub variant: String,
    pub condition: String,
    pub folder: Option<String>,
    pub notes: String,
}

impl OwnedCopy {
    /// Invoke only after the caller presents the card preview and obtains confirmation.
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

pub trait Catalog {
    fn provider(&self) -> &str;
    fn lookup(&self, language: &str, id: &str) -> Result<Card>;
}

pub trait CollectionStore {
    fn cache(&mut self, card: &Card) -> Result<()>;
    fn cached(&self, provider: &str, language: &str, id: &str) -> Result<Option<Card>>;
    fn add(&mut self, copy: &OwnedCopy) -> Result<()>;
    fn copies(&self) -> Result<Vec<OwnedCopy>>;
    fn move_copy(&mut self, id: &str, folder: Option<&str>) -> Result<()>;
    fn remove(&mut self, id: &str) -> Result<()>;
}

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

#[derive(Default)]
pub struct Query {
    pub text: String,
    pub set: Option<String>,
    pub folder: Option<String>,
    pub language: Option<String>,
    pub descending: bool,
}

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

pub struct Tcgdex {
    client: reqwest::blocking::Client,
}

impl Tcgdex {
    pub fn new() -> Result<Self> {
        Ok(Self {
            client: reqwest::blocking::Client::builder()
                .timeout(std::time::Duration::from_secs(20))
                .user_agent("pkmn-tcg-dex/0.1")
                .build()?,
        })
    }
}

impl Catalog for Tcgdex {
    fn provider(&self) -> &str {
        "tcgdex"
    }
    fn lookup(&self, language: &str, id: &str) -> Result<Card> {
        for part in [language, id] {
            ensure!(
                !part.is_empty() && part.chars().all(|c| c.is_ascii_alphanumeric() || c == '-'),
                "Use a language and full card ID, e.g. en / swsh3-136"
            );
        }
        let response = self
            .client
            .get(format!("https://api.tcgdex.net/v2/{language}/cards/{id}"))
            .send()
            .context("Catalog request failed")?;
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            bail!("Card not found: {language}/{id}");
        }
        let raw: serde_json::Value = response.error_for_status()?.json()?;
        normalize_tcgdex(language, &raw)
    }
}

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
        assert!(
            search(
                vec![copy],
                &Query {
                    folder: Some("Other".into()),
                    ..Default::default()
                }
            )
            .is_empty()
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
