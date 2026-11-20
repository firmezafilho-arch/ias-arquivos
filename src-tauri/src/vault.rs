//! Cofre de API keys.
//!
//! A chave em si vai para o **Gerenciador de Credenciais do Windows**
//! (o mesmo cofre que o Windows usa para senhas de rede), criptografado
//! pela sua conta do Windows. No banco SQLite fica só um índice com
//! apelido, provedor e uma dica mascarada (ex.: `sk-a…9xYz`).
//!
//! A interface NUNCA recebe a chave completa de volta: só o backend lê
//! a chave, na hora de chamar a IA (Etapa 1).

use crate::db::Database;
use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

const SERVICE: &str = "IAS Nexus";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultEntry {
    pub id: String,
    pub provider: String,
    pub label: String,
    pub hint: String,
    pub created_at: i64,
}

/// Reconhece o provedor só pelo formato da chave.
/// A confirmação definitiva (chave válida ou não) acontece na Etapa 1,
/// com uma chamada de teste à API.
pub fn detect_provider(key: &str) -> Option<&'static str> {
    let k = key.trim();
    // A ordem importa: prefixos mais específicos primeiro.
    let rules: &[(&str, &str)] = &[
        ("sk-ant-", "anthropic"),
        ("sk-or-", "openrouter"),
        ("sk-proj-", "openai"),
        ("xai-", "xai"),
        ("gsk_", "groq"),
        ("pplx-", "perplexity"),
        ("AIza", "google"),
        ("sk-", "openai"), // DeepSeek também usa "sk-": a Etapa 1 desempata testando a API
    ];
    rules.iter().find(|(p, _)| k.starts_with(p)).map(|(_, name)| *name)
}

/// Mostra só o começo e o fim da chave.
pub fn mask(key: &str) -> String {
    let chars: Vec<char> = key.trim().chars().collect();
    if chars.len() <= 10 {
        return "•".repeat(chars.len().max(4));
    }
    let start: String = chars[..4].iter().collect();
    let end: String = chars[chars.len() - 4..].iter().collect();
    format!("{start}…{end}")
}

fn entry(id: &str) -> AppResult<keyring::Entry> {
    Ok(keyring::Entry::new(SERVICE, id)?)
}

pub fn add(db: &Database, key: &str, label: &str) -> AppResult<VaultEntry> {
    let key = key.trim();
    if key.len() < 12 || key.contains(char::is_whitespace) {
        return Err(AppError::Invalid("Essa API key parece incompleta ou tem espaços.".into()));
    }
    let provider = detect_provider(key).unwrap_or("desconhecido");
    let label = if label.trim().is_empty() { provider } else { label.trim() };
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    let id = format!("{provider}-{nanos}");
    let hint = mask(key);

    entry(&id)?.set_password(key)?;
    if let Err(e) = db.vault_index_upsert(&id, provider, label, &hint) {
        // Mantém cofre e índice consistentes.
        let _ = entry(&id).and_then(|en| Ok(en.delete_credential()?));
        return Err(e);
    }
    tracing::info!(%id, %provider, "API key adicionada ao cofre");
    list(db)?
        .into_iter()
        .find(|e| e.id == id)
        .ok_or_else(|| AppError::Invalid("Falha ao registrar a chave.".into()))
}

pub fn remove(db: &Database, id: &str) -> AppResult<()> {
    match entry(id)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => {}
        Err(e) => return Err(e.into()),
    }
    db.vault_index_remove(id)?;
    tracing::info!(%id, "API key removida do cofre");
    Ok(())
}

pub fn list(db: &Database) -> AppResult<Vec<VaultEntry>> {
    Ok(db
        .vault_index_list()?
        .into_iter()
        .map(|(id, provider, label, hint, created_at)| VaultEntry { id, provider, label, hint, created_at })
        .collect())
}

/// Uso interno do backend (Etapa 1 em diante). Não é exposto à interface.
#[allow(dead_code)]
pub fn read_secret(id: &str) -> AppResult<String> {
    Ok(entry(id)?.get_password()?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reconhece_provedores() {
        assert_eq!(detect_provider("sk-ant-api03-abc"), Some("anthropic"));
        assert_eq!(detect_provider("sk-or-v1-abc"), Some("openrouter"));
        assert_eq!(detect_provider("sk-proj-abc"), Some("openai"));
        assert_eq!(detect_provider("sk-abc"), Some("openai"));
        assert_eq!(detect_provider("AIzaSyAbc"), Some("google"));
        assert_eq!(detect_provider("xai-abc"), Some("xai"));
        assert_eq!(detect_provider("gsk_abc"), Some("groq"));
        assert_eq!(detect_provider("  sk-ant-x  "), Some("anthropic"));
        assert_eq!(detect_provider("qualquercoisa"), None);
    }

    #[test]
    fn mascara_nao_vaza_a_chave() {
        let m = mask("sk-ant-api03-SEGREDO-9xYz");
        assert_eq!(m, "sk-a…9xYz");
        assert!(!m.contains("SEGREDO"));
        assert_eq!(mask("curta"), "•••••");
    }
}
