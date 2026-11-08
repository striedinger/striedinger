use rusqlite::{params, Connection};
use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, uniffi::Record)]
pub struct HistoryItem {
    pub id: i64,
    pub timestamp: i64,
    pub app: Option<String>,
    pub mode: String,
    pub raw: String,
    pub output: String,
}

pub struct History {
    conn: Mutex<Connection>,
}

impl History {
    pub fn open(path: &Path) -> anyhow::Result<Self> {
        let conn = Connection::open(path)?;
        // WAL + NORMAL sync: an insert no longer waits on a full fsync, which keeps the
        // history write off the dictation's critical path.
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts INTEGER NOT NULL,
                app TEXT,
                mode TEXT NOT NULL,
                raw TEXT NOT NULL,
                output TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS history_ts ON history(ts DESC);",
        )?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn add(
        &self,
        app: Option<&str>,
        mode: &str,
        raw: &str,
        output: &str,
    ) -> anyhow::Result<()> {
        let ts = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;
        self.conn.lock().unwrap().execute(
            "INSERT INTO history (ts, app, mode, raw, output) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![ts, app, mode, raw, output],
        )?;
        Ok(())
    }

    pub fn recent(&self, limit: u32) -> anyhow::Result<Vec<HistoryItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, ts, app, mode, raw, output FROM history ORDER BY ts DESC, id DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map([limit], |r| {
            Ok(HistoryItem {
                id: r.get(0)?,
                timestamp: r.get(1)?,
                app: r.get(2)?,
                mode: r.get(3)?,
                raw: r.get(4)?,
                output: r.get(5)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recent_returns_newest_first_up_to_the_limit() {
        let dir = std::env::temp_dir().join(format!("murmur-history-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let history = History::open(&dir.join("history.sqlite")).unwrap();
        for text in ["first", "second", "third"] {
            history
                .add(Some("com.example.app"), "clean", text, text)
                .unwrap();
        }

        let recent = history.recent(2).unwrap();
        let outputs: Vec<&str> = recent.iter().map(|item| item.output.as_str()).collect();
        assert_eq!(outputs, ["third", "second"]);
        std::fs::remove_dir_all(dir).ok();
    }
}
