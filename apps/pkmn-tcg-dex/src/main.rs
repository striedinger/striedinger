mod backup;

use anyhow::{Context, Result, ensure};
use clap::{Parser, Subcommand};
use pkmn_tcg_dex_core::{CollectionStore, OwnedCopy, Query, Tcgdex, preview, refresh, search};
use pkmn_tcg_dex_sqlite::SqliteStore;
use std::{
    io::{self, Write},
    path::PathBuf,
};

#[derive(Parser)]
#[command(version, about = "A local Pokémon card collection")]
struct Cli {
    #[arg(long, global = true, default_value = "pkmn-tcg-dex.sqlite")]
    db: PathBuf,
    #[arg(long, global = true, default_value = "en")]
    language: String,
    #[arg(long, global = true)]
    offline: bool,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Preview a full catalog ID such as swsh3-136. Does not add a copy.
    Lookup {
        id: String,
        /// Fetch current metadata even when cached.
        #[arg(long)]
        refresh: bool,
    },
    /// Preview a card, then confirm adding one physical copy.
    Add {
        id: String,
        #[arg(long, default_value = "normal")]
        variant: String,
        #[arg(long, default_value = "unknown")]
        condition: String,
        #[arg(long)]
        folder: Option<String>,
        #[arg(long, default_value = "")]
        notes: String,
        /// Confirm without prompting, for scripts.
        #[arg(long)]
        yes: bool,
    },
    /// Search names, descriptions, moves, and notes in owned cards.
    List {
        #[arg(default_value = "")]
        query: String,
        #[arg(long)]
        set: Option<String>,
        #[arg(long)]
        folder: Option<String>,
        #[arg(long = "card-language")]
        language: Option<String>,
        /// Reverse alphabetical order (default: name, set, collector number).
        #[arg(long)]
        descending: bool,
    },
    /// Assign a copy to a folder; omit --folder to unfile it.
    Move {
        copy_id: String,
        #[arg(long)]
        folder: Option<String>,
    },
    Remove {
        copy_id: String,
        #[arg(long)]
        yes: bool,
    },
    /// Export JSON to stdout, suitable for redirection to a file.
    Export,
    /// Merge a JSON export, preserving copy IDs and rejecting conflicts.
    Import { file: PathBuf },
}

impl Cli {
    fn validate(&self) -> Result<()> {
        ensure!(
            !(self.offline && matches!(self.command, Command::Lookup { refresh: true, .. })),
            "--refresh cannot be combined with --offline"
        );
        Ok(())
    }
}

fn confirm(message: &str) -> Result<bool> {
    eprint!("{message} [y/N] ");
    io::stderr().flush()?;
    let mut answer = String::new();
    io::stdin().read_line(&mut answer)?;
    Ok(matches!(
        answer.trim().to_ascii_lowercase().as_str(),
        "y" | "yes"
    ))
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    cli.validate()?;
    let mut store =
        SqliteStore::open(&cli.db).with_context(|| format!("Cannot open {}", cli.db.display()))?;
    match cli.command {
        Command::Lookup {
            id,
            refresh: force_refresh,
        } => {
            let catalog = Tcgdex::new()?;
            let card = if force_refresh {
                refresh(&catalog, &mut store, &cli.language, &id)?
            } else {
                preview(&catalog, &mut store, &cli.language, &id, cli.offline)?
            };
            println!("{}", serde_json::to_string_pretty(&card)?);
        }
        Command::Add {
            id,
            variant,
            condition,
            folder,
            notes,
            yes,
        } => {
            let card = preview(&Tcgdex::new()?, &mut store, &cli.language, &id, cli.offline)?;
            let copy = OwnedCopy::new(card, variant, condition, folder, notes)?;
            eprintln!("{}", serde_json::to_string_pretty(&copy)?);
            if yes || confirm("Add this copy to your collection?")? {
                store.add(&copy)?;
                println!("{}", copy.id);
            } else {
                eprintln!("Cancelled; no copy added.");
            }
        }
        Command::List {
            query,
            set,
            folder,
            language,
            descending,
        } => {
            let copies = search(
                store.copies()?,
                &Query {
                    text: query,
                    set,
                    folder,
                    language,
                    descending,
                },
            );
            println!("{}", serde_json::to_string_pretty(&copies)?);
        }
        Command::Move { copy_id, folder } => store.move_copy(&copy_id, folder.as_deref())?,
        Command::Remove { copy_id, yes } => {
            if yes || confirm(&format!("Remove copy {copy_id}?"))? {
                store.remove(&copy_id)?;
            }
        }
        Command::Export => println!("{}", serde_json::to_string_pretty(&store.copies()?)?),
        Command::Import { file } => {
            let copies = backup::read_import(
                std::fs::File::open(file)?,
                backup::MAX_BYTES,
                backup::MAX_COPIES,
            )?;
            store.import(&copies)?;
            eprintln!("Import complete ({} records processed).", copies.len());
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refresh_requires_online_mode() {
        let online =
            Cli::try_parse_from(["pkmn-tcg-dex", "lookup", "swsh3-136", "--refresh"]).unwrap();
        assert!(online.validate().is_ok());
        for args in [
            [
                "pkmn-tcg-dex",
                "--offline",
                "lookup",
                "swsh3-136",
                "--refresh",
            ],
            [
                "pkmn-tcg-dex",
                "lookup",
                "swsh3-136",
                "--refresh",
                "--offline",
            ],
        ] {
            assert!(Cli::try_parse_from(args).unwrap().validate().is_err());
        }
    }
}
