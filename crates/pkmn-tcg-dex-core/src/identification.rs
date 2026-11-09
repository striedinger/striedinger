//! Candidate resolution shared by terminal, camera, and future UI clients.
use crate::{Card, Catalog, CollectionStore};
use anyhow::{Result, ensure};
use serde::{Deserialize, Serialize};

/// A paginated catalog query by name or set and collector number.
#[derive(Clone, Debug)]
pub struct Identification {
    /// Optional case-insensitive card-name substring.
    pub name: Option<String>,
    /// Optional provider-specific set ID.
    pub set: Option<String>,
    /// Collector number, which requires a set ID.
    pub number: Option<String>,
    /// One-based page, with at most 20 candidates per page.
    pub page: u32,
}

impl Default for Identification {
    fn default() -> Self {
        Self {
            name: None,
            set: None,
            number: None,
            page: 1,
        }
    }
}

impl Identification {
    /// Maximum candidates returned on one search page.
    pub const PAGE_SIZE: usize = 20;

    /// Validate query fields and pagination bounds.
    ///
    /// # Errors
    /// Returns an error for blank fields, unsupported page numbers, or ambiguous number-only queries.
    pub fn validate(&self) -> Result<()> {
        ensure!(
            self.page > 0 && self.page <= 10_000,
            "Page must be between 1 and 10000"
        );
        for value in [&self.name, &self.set, &self.number].into_iter().flatten() {
            ensure!(!value.trim().is_empty(), "Search fields cannot be blank");
        }
        ensure!(
            self.name.is_some() || (self.set.is_some() && self.number.is_some()),
            "Supply a name or both --set and --number"
        );
        ensure!(
            self.number.is_none() || self.set.is_some(),
            "Collector number requires --set"
        );
        Ok(())
    }

    /// Match a candidate against the query fields, independently of pagination.
    #[must_use]
    pub fn matches(&self, candidate: &Candidate) -> bool {
        self.name.as_ref().is_none_or(|name| {
            candidate
                .name
                .to_lowercase()
                .contains(&name.trim().to_lowercase())
        }) && self.set.as_ref().is_none_or(|set| set == &candidate.set_id)
            && self.number.as_ref().is_none_or(|number| {
                normalize_number(number) == normalize_number(&candidate.number)
            })
    }
}

/// Normalize ordinary numeric collector numbers, retaining promo prefixes.
#[must_use]
pub fn normalize_number(number: &str) -> &str {
    let number = number.split('/').next().unwrap_or_default().trim();
    if !number.is_empty() && number.bytes().all(|b| b.is_ascii_digit()) {
        let normalized = number.trim_start_matches('0');
        if normalized.is_empty() {
            "0"
        } else {
            normalized
        }
    } else {
        number
    }
}

/// A lightweight search match that must be resolved before adding a copy.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Candidate {
    /// Provider-specific full card ID.
    pub id: String,
    /// Localized card name.
    pub name: String,
    /// Provider-specific set ID.
    pub set_id: String,
    /// Collector number.
    pub number: String,
}

impl From<Card> for Candidate {
    fn from(card: Card) -> Self {
        Self {
            id: card.id,
            name: card.name,
            set_id: card.set_id,
            number: card.number,
        }
    }
}

/// Offline identification searches only full records already cached locally.
///
/// # Errors
/// Returns an error for invalid queries or catalog/storage failures.
pub fn identify(
    catalog: &impl Catalog,
    store: &impl CollectionStore,
    language: &str,
    query: &Identification,
    offline: bool,
) -> Result<Vec<Candidate>> {
    query.validate()?;
    if !offline {
        return catalog.find(language, query);
    }
    let candidates = store
        .cached_cards(catalog.provider(), language)?
        .into_iter()
        .map(Candidate::from)
        .filter(|card| query.matches(card));
    Ok(candidates
        .skip((query.page as usize - 1) * Identification::PAGE_SIZE)
        .take(Identification::PAGE_SIZE)
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn number_requires_set_and_promo_prefixes_survive() {
        assert!(
            Identification {
                number: Some("1".into()),
                page: 1,
                ..Default::default()
            }
            .validate()
            .is_err()
        );
        assert_eq!(normalize_number("001/189"), "1");
        assert_eq!(normalize_number("TG01/TG30"), "TG01");
        assert!(
            Identification {
                name: Some(" ".into()),
                page: 1,
                ..Default::default()
            }
            .validate()
            .is_err()
        );
    }
    #[test]
    fn set_disambiguates_reused_collector_numbers() {
        let query = Identification {
            set: Some("swsh3".into()),
            number: Some("0136/189".into()),
            page: 1,
            ..Default::default()
        };
        let mut candidate = Candidate {
            id: "swsh3-136".into(),
            name: "Furret".into(),
            set_id: "swsh3".into(),
            number: "136".into(),
        };
        assert!(query.matches(&candidate));
        candidate.set_id = "other".into();
        assert!(!query.matches(&candidate));
    }
}
