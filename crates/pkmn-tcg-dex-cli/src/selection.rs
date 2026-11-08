use anyhow::{Result, ensure};
use std::io::{BufRead, Write};

/// Blank input and EOF cancel. Invalid choices re-prompt without selecting a card.
pub fn choose(
    labels: &[String],
    input: &mut impl BufRead,
    output: &mut impl Write,
) -> Result<Option<usize>> {
    ensure!(!labels.is_empty(), "No choices available");
    for (index, label) in labels.iter().enumerate() {
        writeln!(
            output,
            "{}) {}",
            index + 1,
            label
                .chars()
                .map(|c| if c.is_control() { ' ' } else { c })
                .collect::<String>()
        )?;
    }
    loop {
        write!(output, "Choose 1–{} (Enter to cancel): ", labels.len())?;
        output.flush()?;
        let mut line = String::new();
        input.read_line(&mut line)?;
        if line.trim().is_empty() {
            return Ok(None);
        }
        if let Ok(number) = line.trim().parse::<usize>()
            && (1..=labels.len()).contains(&number)
        {
            return Ok(Some(number - 1));
        }
        writeln!(output, "Enter one of the listed numbers.")?;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn invalid_input_never_silently_selects_and_eof_cancels() {
        let labels = vec!["First".into(), "Second".into()];
        let mut input = &b"0\n999\nno\n2\n"[..];
        assert_eq!(
            choose(&labels, &mut input, &mut Vec::new()).unwrap(),
            Some(1)
        );
        assert_eq!(
            choose(&labels, &mut &b""[..], &mut Vec::new()).unwrap(),
            None
        );
    }
}
