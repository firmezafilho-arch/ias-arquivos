//! Banco de dados local (SQLite, arquivo `nexus.db` na pasta de dados do app).
//!
//! - WAL ligado: leituras não bloqueiam escritas → interface nunca espera o disco.
//! - Migrações versionadas por `PRAGMA user_version`: cada etapa futura
//!   (histórico de chat, dispositivos do Home Lab...) só adiciona uma migração.

use crate::error::AppResult;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;
use std::sync::Mutex;

/// Lista de migrações. Índice 0 = versão 1, e assim por diante.
/// NUNCA edite uma migração já publicada: adicione uma nova no final.
const MIGRATIONS: &[&str] = &[
    // v1 — Etapa 0: configurações e índice do cofre de chaves
    r#"
    CREATE TABLE IF NOT EXISTS kv (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS vault_index (
        id         TEXT PRIMARY KEY,
        provider   TEXT NOT NULL,
        label      TEXT NOT NULL,
        hint       TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    "#,
];

/// (id, provedor, apelido, dica, criado_em)
pub type VaultRow = (String, String, String, String, i64);

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn open(path: &Path) -> AppResult<Self> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        let conn = Connection::open(path)?;
        Self::init(conn)
    }

    #[cfg(test)]
    pub fn open_in_memory() -> AppResult<Self> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(conn: Connection) -> AppResult<Self> {
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;
             PRAGMA busy_timeout = 3000;",
        )?;
        let db = Self { conn: Mutex::new(conn) };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> AppResult<()> {
        let mut conn = self.conn.lock().expect("db lock");
        let current: usize = conn.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0))? as usize;
        for (i, sql) in MIGRATIONS.iter().enumerate().skip(current) {
            let tx = conn.transaction()?;
            tx.execute_batch(sql)?;
            tx.pragma_update(None, "user_version", (i + 1) as i64)?;
            tx.commit()?;
            tracing::info!(version = i + 1, "migração aplicada");
        }
        Ok(())
    }

    pub fn schema_version(&self) -> AppResult<i64> {
        let conn = self.conn.lock().expect("db lock");
        Ok(conn.query_row("PRAGMA user_version", [], |r| r.get(0))?)
    }

    // ---------- chave/valor ----------

    pub fn kv_get(&self, key: &str) -> AppResult<Option<String>> {
        let conn = self.conn.lock().expect("db lock");
        Ok(conn
            .query_row("SELECT value FROM kv WHERE key = ?1", params![key], |r| r.get(0))
            .optional()?)
    }

    pub fn kv_set(&self, key: &str, value: &str) -> AppResult<()> {
        let conn = self.conn.lock().expect("db lock");
        conn.execute(
            "INSERT INTO kv (key, value, updated_at) VALUES (?1, ?2, unixepoch())
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, value],
        )?;
        Ok(())
    }

    // ---------- índice do cofre (só metadados, NUNCA a chave) ----------

    pub fn vault_index_upsert(&self, id: &str, provider: &str, label: &str, hint: &str) -> AppResult<()> {
        let conn = self.conn.lock().expect("db lock");
        conn.execute(
            "INSERT INTO vault_index (id, provider, label, hint) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET provider = excluded.provider, label = excluded.label, hint = excluded.hint",
            params![id, provider, label, hint],
        )?;
        Ok(())
    }

    pub fn vault_index_remove(&self, id: &str) -> AppResult<()> {
        let conn = self.conn.lock().expect("db lock");
        conn.execute("DELETE FROM vault_index WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn vault_index_list(&self) -> AppResult<Vec<VaultRow>> {
        let conn = self.conn.lock().expect("db lock");
        let mut stmt = conn.prepare(
            "SELECT id, provider, label, hint, created_at FROM vault_index ORDER BY created_at, id",
        )?;
        let rows = stmt
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migra_e_guarda_valores() {
        let db = Database::open_in_memory().unwrap();
        assert_eq!(db.schema_version().unwrap(), MIGRATIONS.len() as i64);
        assert_eq!(db.kv_get("x").unwrap(), None);
        db.kv_set("x", "1").unwrap();
        db.kv_set("x", "2").unwrap();
        assert_eq!(db.kv_get("x").unwrap().as_deref(), Some("2"));
    }

    #[test]
    fn migracao_e_idempotente_em_arquivo() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("t.db");
        {
            let db = Database::open(&path).unwrap();
            db.kv_set("a", "b").unwrap();
        }
        let db = Database::open(&path).unwrap();
        assert_eq!(db.kv_get("a").unwrap().as_deref(), Some("b"));
        assert_eq!(db.schema_version().unwrap(), MIGRATIONS.len() as i64);
    }

    #[test]
    fn indice_do_cofre() {
        let db = Database::open_in_memory().unwrap();
        db.vault_index_upsert("k1", "anthropic", "Pessoal", "sk-a…9xYz").unwrap();
        db.vault_index_upsert("k1", "anthropic", "Trabalho", "sk-a…9xYz").unwrap();
        let list = db.vault_index_list().unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].2, "Trabalho");
        db.vault_index_remove("k1").unwrap();
        assert!(db.vault_index_list().unwrap().is_empty());
    }
}
