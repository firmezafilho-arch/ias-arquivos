//! Logs em arquivo, um por dia, guardando os últimos 7.
//! Gravação em segundo plano (não bloqueante): logar nunca deixa o app lento.
//! Para mais detalhes, rode com a variável de ambiente `IAS_LOG=debug`.

use std::path::Path;
use std::sync::OnceLock;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

static GUARD: OnceLock<WorkerGuard> = OnceLock::new();

pub fn init(log_dir: &Path) {
    let _ = std::fs::create_dir_all(log_dir);
    let appender = tracing_appender::rolling::Builder::new()
        .rotation(tracing_appender::rolling::Rotation::DAILY)
        .filename_prefix("nexus")
        .filename_suffix("log")
        .max_log_files(7)
        .build(log_dir);

    let filter = EnvFilter::try_from_env("IAS_LOG").unwrap_or_else(|_| EnvFilter::new("info"));

    match appender {
        Ok(appender) => {
            let (writer, guard) = tracing_appender::non_blocking(appender);
            let _ = GUARD.set(guard);
            let _ = tracing_subscriber::registry()
                .with(filter)
                .with(fmt::layer().with_writer(writer).with_ansi(false).with_target(false))
                .try_init();
        }
        Err(_) => {
            // Sem permissão de escrita? Loga só no console, mas o app abre.
            let _ = tracing_subscriber::registry().with(filter).with(fmt::layer()).try_init();
        }
    }
}
