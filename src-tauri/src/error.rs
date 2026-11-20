//! Tipo de erro único do app.
//!
//! Todo comando chamado pela interface devolve `Result<T, AppError>`.
//! O erro é serializado como texto legível, então a interface sempre
//! recebe uma mensagem clara em vez de travar.

use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Erro no banco de dados: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("Erro ao ler/gravar dados: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Erro no cofre de chaves: {0}")]
    Vault(#[from] keyring::Error),

    #[error("Erro de sistema: {0}")]
    Io(#[from] std::io::Error),

    #[error("Erro do Tauri: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("{0}")]
    Invalid(String),
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
