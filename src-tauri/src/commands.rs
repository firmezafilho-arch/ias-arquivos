//! Comandos que a interface pode chamar (`invoke("nome", {...})`).
//! Cada um é pequeno, valida a entrada e devolve erro legível.

use crate::diagnostics::{self, Diagnostics};
use crate::error::{AppError, AppResult};
use crate::settings::AppSettings;
use crate::state::AppState;
use crate::vault::{self, VaultEntry};
use tauri::{AppHandle, State, WebviewWindow};
use tauri_plugin_autostart::ManagerExt;

/// A interface avisa que terminou de desenhar a primeira tela.
/// Só então a janela aparece: nada de tela branca piscando.
#[tauri::command]
pub fn app_ready(window: WebviewWindow, state: State<'_, AppState>) -> AppResult<u64> {
    let ms = state.mark_ready();
    let launched_by_autostart = std::env::args().any(|a| a == "--minimized");
    let start_hidden = launched_by_autostart && state.settings().start_minimized;
    if !start_hidden {
        window.show()?;
        window.set_focus()?;
    }
    tracing::info!(startup_ms = ms, start_hidden, "interface pronta");
    Ok(ms)
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppSettings {
    state.settings()
}

#[tauri::command]
pub fn save_settings(app: AppHandle, state: State<'_, AppState>, settings: AppSettings) -> AppResult<AppSettings> {
    settings.validate()?;
    let previous = state.settings();

    if previous.start_with_windows != settings.start_with_windows {
        let autolaunch = app.autolaunch();
        let result = if settings.start_with_windows { autolaunch.enable() } else { autolaunch.disable() };
        result.map_err(|e| AppError::Invalid(format!("Não consegui alterar o início com o Windows: {e}")))?;
    }

    settings.save(&state.db)?;
    state.set_settings(settings.clone());
    tracing::info!("configurações salvas");
    Ok(settings)
}

#[tauri::command]
pub fn vault_list(state: State<'_, AppState>) -> AppResult<Vec<VaultEntry>> {
    vault::list(&state.db)
}

#[tauri::command]
pub fn vault_add(state: State<'_, AppState>, key: String, label: String) -> AppResult<VaultEntry> {
    vault::add(&state.db, &key, &label)
}

#[tauri::command]
pub fn vault_remove(state: State<'_, AppState>, id: String) -> AppResult<()> {
    vault::remove(&state.db, &id)
}

#[tauri::command]
pub fn vault_detect(key: String) -> Option<&'static str> {
    vault::detect_provider(&key)
}

/// Roda fora da thread principal: medir memória nunca congela a janela.
#[tauri::command]
pub async fn get_diagnostics(state: State<'_, AppState>) -> AppResult<Diagnostics> {
    let (memory_mb, process_count) = tauri::async_runtime::spawn_blocking(diagnostics::memory_tree_mb)
        .await
        .map_err(|e| AppError::Invalid(e.to_string()))?;
    Ok(Diagnostics {
        version: env!("CARGO_PKG_VERSION").into(),
        startup_ms: state.startup_ms(),
        memory_mb,
        process_count,
        cpu_cores: std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1),
        os: diagnostics::os_label(),
        data_dir: state.data_dir.display().to_string(),
        log_dir: state.log_dir.display().to_string(),
        db_schema: state.db.schema_version()?,
        uptime_s: state.uptime_s(),
    })
}

/// Registra no arquivo de log erros que aconteceram na interface.
#[tauri::command]
pub fn log_from_ui(level: String, message: String) {
    let message: String = message.chars().take(2000).collect();
    match level.as_str() {
        "error" => tracing::error!(target: "ui", "{message}"),
        "warn" => tracing::warn!(target: "ui", "{message}"),
        _ => tracing::info!(target: "ui", "{message}"),
    }
}

/// Abre a pasta de dados ou de logs no Explorador de Arquivos.
#[tauri::command]
pub fn open_folder(state: State<'_, AppState>, which: String) -> AppResult<()> {
    let path = match which.as_str() {
        "data" => &state.data_dir,
        "logs" => &state.log_dir,
        _ => return Err(AppError::Invalid("Pasta desconhecida".into())),
    };
    #[cfg(windows)]
    let program = "explorer";
    #[cfg(target_os = "macos")]
    let program = "open";
    #[cfg(all(unix, not(target_os = "macos")))]
    let program = "xdg-open";
    std::process::Command::new(program).arg(path).spawn()?;
    Ok(())
}
