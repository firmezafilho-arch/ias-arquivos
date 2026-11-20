//! Estado global do app, compartilhado entre todos os comandos.

use crate::db::Database;
use crate::settings::AppSettings;
use std::path::PathBuf;
use std::sync::{Mutex, RwLock};
use std::time::Instant;

pub struct AppState {
    pub db: Database,
    pub data_dir: PathBuf,
    pub log_dir: PathBuf,
    started: Instant,
    startup_ms: Mutex<Option<u64>>,
    /// Cópia em memória das configurações: lidas a todo momento
    /// (ex.: ao fechar a janela) sem tocar no disco.
    settings: RwLock<AppSettings>,
}

impl AppState {
    pub fn new(db: Database, data_dir: PathBuf, log_dir: PathBuf, started: Instant) -> Self {
        let settings = AppSettings::load(&db).unwrap_or_default();
        Self {
            db,
            data_dir,
            log_dir,
            started,
            startup_ms: Mutex::new(None),
            settings: RwLock::new(settings),
        }
    }

    pub fn settings(&self) -> AppSettings {
        self.settings.read().expect("settings lock").clone()
    }

    pub fn set_settings(&self, s: AppSettings) {
        *self.settings.write().expect("settings lock") = s;
    }

    /// Guarda o tempo de abertura só na primeira vez.
    pub fn mark_ready(&self) -> u64 {
        let mut slot = self.startup_ms.lock().expect("startup lock");
        *slot.get_or_insert_with(|| self.started.elapsed().as_millis() as u64)
    }

    pub fn startup_ms(&self) -> Option<u64> {
        *self.startup_ms.lock().expect("startup lock")
    }

    pub fn uptime_s(&self) -> u64 {
        self.started.elapsed().as_secs()
    }
}
