//! Local collection CLI with explicit preview and confirmation before additions.
mod backup;
mod browse;
mod selection;

use anyhow::{Context, Result, ensure};
use clap::{Args, Parser, Subcommand};
use pkmn_tcg_dex_core::identification::{Identification, identify};
use pkmn_tcg_dex_core::{CollectionStore, OwnedCopy, Query, preview, refresh, search};
use pkmn_tcg_dex_sqlite::SqliteStore;
use pkmn_tcg_dex_tcgdex::Tcgdex;
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
    /// Find candidate printings by name or by set and collector number.
    Find {
        #[command(flatten)]
        query: FindArgs,
    },
    /// Preview a card, then confirm adding one physical copy.
    Add(AddArgs),
    /// Search names, descriptions, moves, and notes in owned cards.
    List {
        #[arg(default_value = "")]
        query: String,
        #[arg(long)]
        set: Option<String>,
        #[arg(long)]
        folder: Option<String>,
        #[arg(long = "card-language")]
        card_language: Option<String>,
        #[arg(long)]
        variant: Option<String>,
        #[arg(long)]
        condition: Option<String>,
        /// Group identical printings by condition and folder, with quantities.
        #[arg(long)]
        group: bool,
        /// Render a readable table instead of JSON.
        #[arg(long)]
        table: bool,
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

#[derive(Args)]
struct AddArgs {
    id: Option<String>,
    #[command(flatten)]
    query: FindArgs,
    #[arg(long)]
    variant: Option<String>,
    #[arg(long, default_value = "unknown")]
    condition: String,
    #[arg(long)]
    folder: Option<String>,
    #[arg(long, default_value = "")]
    notes: String,
    /// Confirm without prompting, for scripts.
    #[arg(long)]
    yes: bool,
}

#[derive(Args, Default)]
struct FindArgs {
    #[arg(long)]
    name: Option<String>,
    #[arg(long)]
    set: Option<String>,
    #[arg(long)]
    number: Option<String>,
    #[arg(long, default_value_t = 1)]
    page: u32,
}

impl From<&FindArgs> for Identification {
    fn from(args: &FindArgs) -> Self {
        Self {
            name: args.name.clone(),
            set: args.set.clone(),
            number: args.number.clone(),
            page: args.page,
        }
    }
}

impl Cli {
    fn validate(&self) -> Result<()> {
        ensure!(
            !(self.offline && matches!(self.command, Command::Lookup { refresh: true, .. })),
            "--refresh cannot be combined with --offline"
        );
        match &self.command {
            Command::Find { query } => Identification::from(query).validate()?,
            Command::Add(AddArgs { id, query, yes, .. }) => {
                if id.is_some() {
                    ensure!(
                        query.name.is_none()
                            && query.set.is_none()
                            && query.number.is_none()
                            && query.page == 1,
                        "Use a card ID or search fields, not both"
                    );
                } else {
                    Identification::from(query).validate()?;
                    ensure!(
                        !yes || query.page == 1,
                        "--yes requires the first search page or an exact card ID; later pages cannot establish an unambiguous match"
                    );
                }
            }
            _ => {}
        }
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

fn resolve_id(
    args: &AddArgs,
    catalog: &impl pkmn_tcg_dex_core::Catalog,
    store: &impl CollectionStore,
    language: &str,
    offline: bool,
) -> Result<Option<String>> {
    if let Some(id) = &args.id {
        Ok(Some(id.clone()))
    } else {
        let candidates = identify(
            catalog,
            store,
            language,
            &Identification::from(&args.query),
            offline,
        )?;
        ensure!(
            !candidates.is_empty(),
            "No matching cards{}",
            if offline { " in the local cache" } else { "" }
        );
        if candidates.len() == Identification::PAGE_SIZE {
            eprintln!(
                "More matches may be available; use --page {}.",
                args.query.page + 1
            );
        }
        let index = if candidates.len() == 1 {
            0
        } else {
            ensure!(
                !args.yes,
                "Multiple cards match; use find and pass an exact card ID for --yes"
            );
            let labels = candidates
                .iter()
                .map(|c| format!("{} | {} | #{} | {}", c.name, c.set_id, c.number, c.id))
                .collect::<Vec<_>>();
            let Some(index) =
                selection::choose(&labels, &mut io::stdin().lock(), &mut io::stderr())?
            else {
                return Ok(None);
            };
            index
        };
        Ok(Some(candidates[index].id.clone()))
    }
}

fn add_card(args: AddArgs, language: &str, offline: bool, store: &mut SqliteStore) -> Result<()> {
    let catalog = Tcgdex::new()?;
    let exact_id = args.id.is_some();
    let Some(id) = resolve_id(&args, &catalog, store, language, offline)? else {
        eprintln!("Cancelled; no copy added.");
        return Ok(());
    };
    let card = preview(&catalog, store, language, &id, offline)?;
    eprintln!("{}", serde_json::to_string_pretty(&card)?);
    let variant = if let Some(variant) = args.variant {
        variant
    } else if (exact_id || args.yes) && card.variants.iter().any(|v| v == "normal") {
        "normal".into()
    } else {
        ensure!(
            !args.yes,
            "Supply --variant for a card without a normal printing"
        );
        ensure!(
            !card.variants.is_empty(),
            "Catalog has no variant information; this card cannot be added yet"
        );
        eprintln!("Select the printing variant:");
        let Some(index) =
            selection::choose(&card.variants, &mut io::stdin().lock(), &mut io::stderr())?
        else {
            eprintln!("Cancelled; no copy added.");
            return Ok(());
        };
        card.variants[index].clone()
    };
    let copy = OwnedCopy::new(card, variant, args.condition, args.folder, args.notes)?;
    eprintln!(
        "Variant: {} | Condition: {} | Folder: {}",
        copy.variant,
        copy.condition,
        copy.folder.as_deref().unwrap_or("unfiled")
    );
    if args.yes || confirm("Add this copy to your collection?")? {
        store.add(&copy)?;
        println!("{}", copy.id);
    } else {
        eprintln!("Cancelled; no copy added.");
    }
    Ok(())
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
        Command::Find { query } => {
            let candidates = identify(
                &Tcgdex::new()?,
                &store,
                &cli.language,
                &Identification::from(&query),
                cli.offline,
            )?;
            println!("{}", serde_json::to_string_pretty(&candidates)?);
            if candidates.len() == Identification::PAGE_SIZE {
                eprintln!(
                    "More matches may be available; use --page {}.",
                    query.page + 1
                );
            }
            if cli.offline {
                eprintln!("Searching cached card records only.");
            }
        }
        Command::Add(args) => add_card(args, &cli.language, cli.offline, &mut store)?,
        Command::List {
            query,
            set,
            folder,
            card_language,
            variant,
            condition,
            group,
            table,
            descending,
        } => {
            let copies = search(
                store.copies()?,
                &Query {
                    text: query,
                    set,
                    folder,
                    language: card_language,
                    variant,
                    condition,
                    descending,
                },
            );
            if group {
                let groups = pkmn_tcg_dex_core::grouping::group_copies(copies);
                if table {
                    browse::groups(&groups, &mut io::stdout().lock())?;
                } else {
                    println!("{}", serde_json::to_string_pretty(&groups)?);
                }
            } else if table {
                browse::copies(&copies, &mut io::stdout().lock())?;
            } else {
                println!("{}", serde_json::to_string_pretty(&copies)?);
            }
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

    #[test]
    fn identification_rejects_missing_or_mixed_inputs() {
        for args in [
            vec!["pkmn-tcg-dex", "add"],
            vec!["pkmn-tcg-dex", "find", "--number", "136"],
            vec!["pkmn-tcg-dex", "find", "--name", "Furret", "--page", "0"],
            vec!["pkmn-tcg-dex", "add", "swsh3-136", "--name", "Furret"],
        ] {
            assert!(Cli::try_parse_from(args).unwrap().validate().is_err());
        }
        assert!(
            Cli::try_parse_from([
                "pkmn-tcg-dex",
                "add",
                "--set",
                "swsh3",
                "--number",
                "136/189"
            ])
            .unwrap()
            .validate()
            .is_ok()
        );
    }
}
