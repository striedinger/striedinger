use anyhow::{Result, ensure};
use pkmn_tcg_dex_core::OwnedCopy;
use serde::de::{DeserializeSeed, IgnoredAny, SeqAccess, Visitor};
use std::{
    fmt,
    io::{BufReader, Read},
};

pub const MAX_BYTES: usize = 64 * 1024 * 1024;
pub const MAX_COPIES: usize = 100_000;

pub fn read_import(
    reader: impl Read,
    max_bytes: usize,
    max_copies: usize,
) -> Result<Vec<OwnedCopy>> {
    // Bound even a growing file or a reader without size metadata.
    let mut bytes = Vec::new();
    BufReader::new(reader)
        .take(max_bytes as u64 + 1)
        .read_to_end(&mut bytes)?;
    ensure!(bytes.len() <= max_bytes, "Import exceeds {max_bytes} bytes");
    let mut deserializer = serde_json::Deserializer::from_slice(&bytes);
    let copies = LimitedCopies(max_copies).deserialize(&mut deserializer)?;
    deserializer.end()?;
    Ok(copies)
}

struct LimitedCopies(usize);

impl<'de> DeserializeSeed<'de> for LimitedCopies {
    type Value = Vec<OwnedCopy>;
    fn deserialize<D: serde::Deserializer<'de>>(
        self,
        deserializer: D,
    ) -> Result<Self::Value, D::Error> {
        deserializer.deserialize_seq(self)
    }
}

impl<'de> Visitor<'de> for LimitedCopies {
    type Value = Vec<OwnedCopy>;
    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        write!(formatter, "an array of at most {} owned copies", self.0)
    }
    fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Self::Value, A::Error> {
        let mut copies = Vec::new();
        while copies.len() < self.0 {
            match seq.next_element()? {
                Some(copy) => copies.push(copy),
                None => return Ok(copies),
            }
        }
        if seq.next_element::<IgnoredAny>()?.is_some() {
            return Err(serde::de::Error::custom(format!(
                "Import exceeds {} copies",
                self.0
            )));
        }
        Ok(copies)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bounds_input_bytes_and_rejects_trailing_json() {
        assert!(
            read_import(&b"[]   "[..], 4, 2)
                .unwrap_err()
                .to_string()
                .contains("bytes")
        );
        assert!(read_import(&b"[] []"[..], 100, 2).is_err());
        assert_eq!(
            read_import(&b"[]"[..], 2, 0).unwrap(),
            [] as [pkmn_tcg_dex_core::OwnedCopy; 0]
        );
    }
    #[test]
    fn enforces_record_limit_during_parsing() {
        let raw = serde_json::from_str(include_str!(
            "../../pkmn-tcg-dex-core/tests/fixtures/furret.json"
        ))
        .unwrap();
        let card = pkmn_tcg_dex_core::normalize_tcgdex("en", &raw).unwrap();
        let copy =
            OwnedCopy::new(card, "normal".into(), "unknown".into(), None, String::new()).unwrap();
        let bytes = serde_json::to_vec(&vec![copy.clone(), copy]).unwrap();
        assert!(
            read_import(bytes.as_slice(), bytes.len(), 1)
                .unwrap_err()
                .to_string()
                .contains("exceeds 1 copies")
        );
        assert_eq!(
            read_import(bytes.as_slice(), bytes.len(), 2).unwrap().len(),
            2
        );
    }
}
