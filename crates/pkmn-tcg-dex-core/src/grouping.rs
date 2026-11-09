//! Group owned copies by printing, condition, and folder without losing copy IDs.
use crate::{Card, OwnedCopy};
use serde::Serialize;
use std::collections::HashMap;
use uuid::Uuid;

/// Copies sharing printing identity, variant, condition, and folder.
#[derive(Debug, Serialize)]
pub struct Group {
    /// Metadata snapshot of the first copy in this group.
    pub card: Card,
    /// Shared printing variant.
    pub variant: String,
    /// Shared condition label.
    pub condition: String,
    /// Shared optional folder name.
    pub folder: Option<String>,
    /// Number of physical copies in this group.
    pub quantity: usize,
    /// Physical-copy IDs; individual notes remain available on the copies.
    pub copy_ids: Vec<Uuid>,
}

/// Group copies while retaining input group order and every physical-copy ID.
#[must_use]
pub fn group_copies(copies: Vec<OwnedCopy>) -> Vec<Group> {
    let mut groups: Vec<Group> = Vec::new();
    let mut positions = HashMap::new();
    for copy in copies {
        let key = (
            copy.card.provider.clone(),
            copy.card.language.clone(),
            copy.card.id.clone(),
            copy.variant.clone(),
            copy.condition.clone(),
            copy.folder.clone(),
        );
        let index = *positions.entry(key).or_insert_with(|| {
            groups.push(Group {
                card: copy.card.clone(),
                variant: copy.variant.clone(),
                condition: copy.condition.clone(),
                folder: copy.folder.clone(),
                quantity: 0,
                copy_ids: vec![],
            });
            groups.len() - 1
        });
        groups[index].quantity += 1;
        groups[index].copy_ids.push(copy.id);
    }
    groups
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn quantities_keep_variants_and_physical_copy_ids_separate() {
        let card = crate::normalize_tcgdex(
            "en",
            &serde_json::from_str(include_str!("../tests/fixtures/furret.json")).unwrap(),
        )
        .unwrap();
        let first = OwnedCopy::new(
            card.clone(),
            "normal".into(),
            "unknown".into(),
            None,
            String::new(),
        )
        .unwrap();
        let second = OwnedCopy::new(
            card.clone(),
            "normal".into(),
            "unknown".into(),
            None,
            "Different notes".into(),
        )
        .unwrap();
        let reverse = OwnedCopy::new(
            card,
            "reverse".into(),
            "unknown".into(),
            None,
            String::new(),
        )
        .unwrap();
        let ids = vec![first.id, second.id];
        let grouped = group_copies(vec![first, second, reverse]);
        assert_eq!(grouped.len(), 2);
        assert_eq!(grouped[0].quantity, 2);
        assert_eq!(grouped[0].copy_ids, ids);
        assert_eq!(grouped[1].variant, "reverse");
    }
}
