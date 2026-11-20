//! IAS Nexus — núcleo do aplicativo (Etapa 0: fundação).
//!
//! Ordem de inicialização:
//! 1. Plugins (instância única, iniciar com o Windows)
//! 2. Pastas, logs e banco de dados
//! 3. Estado global + ícone na bandeja
//! 4. Janela fica invisível até a interface chamar `app_ready`

mod commands;
mod db;
mod diagnostics;
mod error;
mod logging;
mod settings;
mod state;
mod tray;
mod vault;

use std::time::Instant;
use tauri::{Manager, WindowEvent};

pub fn run() {
    let started = Instant::now();

    tauri::Builder::default()
        // Se o usuário abrir o app de novo, só traz a janela existente para frente.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(move |app| {
            let data_dir = app.path().app_data_dir()?;
            let log_dir = app.path().app_log_dir()?;
            logging::init(&log_dir);
            tracing::info!(version = env!("CARGO_PKG_VERSION"), "IAS Nexus iniciando");

            let db = db::Database::open(&data_dir.join("nexus.db"))?;
            app.manage(state::AppState::new(db, data_dir, log_dir, started));

            tray::setup(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let to_tray = window.state::<state::AppState>().settings().minimize_to_tray;
                if to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_ready,
            commands::get_settings,
            commands::save_settings,
            commands::vault_list,
            commands::vault_add,
            commands::vault_remove,
            commands::vault_detect,
            commands::get_diagnostics,
            commands::log_from_ui,
            commands::open_folder,
        ])
        .run(tauri::generate_context!())
        .expect("falha ao iniciar o IAS Nexus");
}
