use pkmn_tcg_dex_core::{OwnedCopy, grouping::Group};
use std::io::{Result, Write};

fn cell(text: &str) -> String {
    text.chars()
        .map(|c| if c.is_control() { ' ' } else { c })
        .collect()
}

pub fn copies(copies: &[OwnedCopy], output: &mut impl Write) -> Result<()> {
    writeln!(
        output,
        "{:<36}  {:<24}  {:<12}  {:<8}  {:<5}  {:<12}  {:<12}  FOLDER",
        "COPY ID", "NAME", "SET", "NUMBER", "LANG", "VARIANT", "CONDITION"
    )?;
    for copy in copies {
        writeln!(
            output,
            "{:<36}  {:<24}  {:<12}  {:<8}  {:<5}  {:<12}  {:<12}  {}",
            copy.id,
            cell(&copy.card.name),
            cell(&copy.card.set_id),
            cell(&copy.card.number),
            cell(&copy.card.language),
            cell(&copy.variant),
            cell(&copy.condition),
            cell(copy.folder.as_deref().unwrap_or("unfiled"))
        )?;
    }
    Ok(())
}

pub fn groups(groups: &[Group], output: &mut impl Write) -> Result<()> {
    writeln!(
        output,
        "{:<5}  {:<24}  {:<12}  {:<8}  {:<5}  {:<12}  {:<12}  FOLDER",
        "QTY", "NAME", "SET", "NUMBER", "LANG", "VARIANT", "CONDITION"
    )?;
    for group in groups {
        writeln!(
            output,
            "{:<5}  {:<24}  {:<12}  {:<8}  {:<5}  {:<12}  {:<12}  {}",
            group.quantity,
            cell(&group.card.name),
            cell(&group.card.set_id),
            cell(&group.card.number),
            cell(&group.card.language),
            cell(&group.variant),
            cell(&group.condition),
            cell(group.folder.as_deref().unwrap_or("unfiled"))
        )?;
    }
    Ok(())
}
