//! The seeded random number generator battles draw every roll from.

use serde::{Deserialize, Serialize};

/// The 64-bit linear congruential generator the main series has used for battles since
/// Generation 5.
///
/// The whole generator is a single `u64`, so a battle can be cloned, serialized, and replayed
/// exactly from any point.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Prng {
    state: u64,
}

impl Prng {
    const MULTIPLIER: u64 = 0x5D58_8B65_6C07_8965;
    const INCREMENT: u64 = 0x0026_9EC3;

    /// Creates a generator from a seed.
    #[must_use]
    pub fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    fn next_u32(&mut self) -> u32 {
        self.state = self
            .state
            .wrapping_mul(Self::MULTIPLIER)
            .wrapping_add(Self::INCREMENT);
        let [high @ .., _, _, _, _] = self.state.to_be_bytes();
        u32::from_be_bytes(high)
    }

    /// Returns a uniformly distributed integer in `0..bound`.
    ///
    /// # Panics
    ///
    /// Panics if `bound` is zero.
    pub fn below(&mut self, bound: u32) -> u32 {
        assert!(bound > 0, "the bound of a random roll must be positive");
        let scaled = u64::from(self.next_u32()) * u64::from(bound);
        let [high @ .., _, _, _, _] = scaled.to_be_bytes();
        u32::from_be_bytes(high)
    }

    /// Returns a uniformly distributed integer in `min..max_exclusive`.
    ///
    /// # Panics
    ///
    /// Panics if the range is empty.
    pub fn range(&mut self, min: u32, max_exclusive: u32) -> u32 {
        assert!(min < max_exclusive, "a random range must not be empty");
        min + self.below(max_exclusive - min)
    }

    /// Returns `true` with probability `numerator / denominator`.
    pub fn chance(&mut self, numerator: u32, denominator: u32) -> bool {
        self.below(denominator) < numerator
    }
}

#[cfg(test)]
mod tests {
    use super::Prng;

    #[test]
    fn identical_seeds_produce_identical_sequences() {
        let mut first = Prng::new(42);
        let mut second = Prng::new(42);
        let first_rolls: Vec<u32> = (0..32).map(|_| first.below(1000)).collect();
        let second_rolls: Vec<u32> = (0..32).map(|_| second.below(1000)).collect();
        assert_eq!(first_rolls, second_rolls);
    }

    #[test]
    fn rolls_stay_within_their_bounds() {
        let mut prng = Prng::new(7);
        for _ in 0..10_000 {
            assert!(prng.below(16) < 16);
            assert!((2..6).contains(&prng.range(2, 6)));
        }
    }
}
