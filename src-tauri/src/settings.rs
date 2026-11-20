//! Configurações do app, com tipos fortes e valores padrão.
//!
//! Ficam salvas como um único JSON na tabela `kv`. Graças ao
//! `#[serde(default)]`, quando uma etapa futura adicionar um campo novo,
//! as configurações antigas continuam abrindo sem erro.

use crate::db::Database;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

const KEY: &str = "app_settings";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    /// "system" | "dark" | "light"
    pub theme: String,
    /// "violet" | "blue" | "green" | "orange"
    pub accent: String,
    /// Fechar a janela só esconde o app na bandeja (perto do relógio).
    pub minimize_to_tray: bool,
    /// Abrir junto com o Windows.
    pub start_with_windows: bool,
    /// Quando abrir com o Windows, começar escondido na bandeja.
    pub start_minimized: bool,
    /// Animações da interface (desligar deixa ainda mais leve).
    pub animations: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            accent: "violet".into(),
            minimize_to_tray: true,
            start_with_windows: false,
            start_minimized: true,
            animations: true,
        }
    }
}

impl AppSettings {
    pub fn validate(&self) -> AppResult<()> {
        if !["system", "dark", "light"].contains(&self.theme.as_str()) {
            return Err(AppError::Invalid(format!("Tema inválido: {}", self.theme)));
        }
        if !["violet", "blue", "green", "orange"].contains(&self.accent.as_str()) {
            return Err(AppError::Invalid(format!("Cor de destaque inválida: {}", self.accent)));
        }
        Ok(())
    }

    pub fn load(db: &Database) -> AppResult<Self> {
        match db.kv_get(KEY)? {
            Some(json) => match serde_json::from_str::<Self>(&json) {
                Ok(s) => Ok(s),
                Err(e) => {
                    // Arquivo corrompido não pode impedir o app de abrir.
                    tracing::warn!(error = %e, "configurações ilegíveis; usando padrão");
                    Ok(Self::default())
                }
            },
            None => Ok(Self::default()),
        }
    }

    pub fn save(&self, db: &Database) -> AppResult<()> {
        self.validate()?;
        db.kv_set(KEY, &serde_json::to_string(self)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn padrao_quando_vazio() {
        let db = Database::open_in_memory().unwrap();
        assert_eq!(AppSettings::load(&db).unwrap(), AppSettings::default());
    }

    #[test]
    fn salva_e_carrega() {
        let db = Database::open_in_memory().unwrap();
        let s = AppSettings { theme: "light".into(), animations: false, ..Default::default() };
        s.save(&db).unwrap();
        assert_eq!(AppSettings::load(&db).unwrap(), s);
    }

    #[test]
    fn campos_novos_nao_quebram_config_antiga() {
        let db = Database::open_in_memory().unwrap();
        db.kv_set(KEY, r#"{"theme":"dark"}"#).unwrap();
        let s = AppSettings::load(&db).unwrap();
        assert_eq!(s.theme, "dark");
        assert!(s.minimize_to_tray);
    }

    #[test]
    fn rejeita_tema_invalido() {
        let db = Database::open_in_memory().unwrap();
        let s = AppSettings { theme: "roxo".into(), ..Default::default() };
        assert!(s.save(&db).is_err());
    }

    #[test]
    fn json_corrompido_volta_ao_padrao() {
        let db = Database::open_in_memory().unwrap();
        db.kv_set(KEY, "{{{").unwrap();
        assert_eq!(AppSettings::load(&db).unwrap(), AppSettings::default());
    }
}
