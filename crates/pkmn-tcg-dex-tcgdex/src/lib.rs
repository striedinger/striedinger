//! Blocking `TCGdex` HTTP adapter for the portable collection engine.
use anyhow::{Context, Result, bail, ensure};
use pkmn_tcg_dex_core::identification::{Candidate, Identification};
use pkmn_tcg_dex_core::{Card, Catalog, normalize_tcgdex};

/// Reusable, timeout-bounded HTTP client for the public `TCGdex` catalog.
pub struct Tcgdex {
    client: reqwest::blocking::Client,
}

impl Tcgdex {
    /// Construct a client with native TLS roots and a 20-second request timeout.
    ///
    /// # Errors
    /// Returns an error if the HTTP client cannot be initialized.
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
    fn provider(&self) -> &'static str {
        "tcgdex"
    }
    fn find(&self, language: &str, query: &Identification) -> Result<Vec<Candidate>> {
        query.validate()?;
        for part in std::iter::once(language).chain(query.set.as_deref()) {
            ensure!(
                !part.is_empty() && part.chars().all(|c| c.is_ascii_alphanumeric() || c == '-'),
                "Invalid language or set ID"
            );
        }
        if let Some(set) = &query.set {
            let raw: serde_json::Value = self
                .client
                .get(format!("https://api.tcgdex.net/v2/{language}/sets/{set}"))
                .send()?
                .error_for_status()?
                .json()?;
            let candidates = normalize_candidates(&raw["cards"])?;
            Ok(candidates
                .into_iter()
                .filter(|card| query.matches(card))
                .skip((query.page as usize - 1) * Identification::PAGE_SIZE)
                .take(Identification::PAGE_SIZE)
                .collect())
        } else {
            let raw: serde_json::Value = self
                .client
                .get(format!("https://api.tcgdex.net/v2/{language}/cards"))
                .query(&[
                    (
                        "name",
                        query.name.as_deref().unwrap_or_default().trim().to_owned(),
                    ),
                    ("pagination:page", query.page.to_string()),
                    (
                        "pagination:itemsPerPage",
                        Identification::PAGE_SIZE.to_string(),
                    ),
                ])
                .send()?
                .error_for_status()?
                .json()?;
            Ok(normalize_candidates(&raw)?
                .into_iter()
                .take(Identification::PAGE_SIZE)
                .collect())
        }
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

fn normalize_candidates(raw: &serde_json::Value) -> Result<Vec<Candidate>> {
    raw.as_array()
        .context("Invalid candidate list")?
        .iter()
        .map(|raw| {
            let id = raw["id"].as_str().context("Missing card ID")?;
            let set_id = id.rsplit_once('-').context("Invalid card ID")?.0;
            Ok(Candidate {
                id: id.into(),
                name: raw["name"].as_str().context("Missing card name")?.into(),
                set_id: set_id.into(),
                number: raw["localId"]
                    .as_str()
                    .context("Missing collector number")?
                    .into(),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn normalizes_candidates_and_filters_set_numbers() {
        let raw = serde_json::json!([{"id":"swsh3-136","localId":"136","name":"Furret"}, {"id":"swsh3-137","localId":"137","name":"Other"}]);
        let candidates = normalize_candidates(&raw).unwrap();
        let query = Identification {
            set: Some("swsh3".into()),
            number: Some("0136/189".into()),
            page: 1,
            ..Default::default()
        };
        assert_eq!(
            candidates.into_iter().filter(|c| query.matches(c)).count(),
            1
        );
        assert!(normalize_candidates(&serde_json::json!([{"id":"invalid"}])).is_err());
    }
}
