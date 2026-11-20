//! Painel de diagnóstico: mostra se o app está cumprindo as metas
//! de desempenho (abrir rápido, gastar pouca memória).

use serde::Serialize;
use sysinfo::{Pid, ProcessesToUpdate, System};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostics {
    pub version: String,
    pub startup_ms: Option<u64>,
    /// Memória do núcleo + janela (WebView2) somadas, em MB.
    pub memory_mb: f64,
    pub process_count: usize,
    pub cpu_cores: usize,
    pub os: String,
    pub data_dir: String,
    pub log_dir: String,
    pub db_schema: i64,
    pub uptime_s: u64,
}

/// Soma a memória do processo do app e de todos os processos filhos
/// (no Windows, a janela roda em processos `msedgewebview2.exe` filhos).
pub fn memory_tree_mb() -> (f64, usize) {
    let me = Pid::from_u32(std::process::id());
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let mut total: u64 = 0;
    let mut count = 0usize;
    let mut stack = vec![me];
    let mut seen = std::collections::HashSet::new();
    while let Some(pid) = stack.pop() {
        if !seen.insert(pid) {
            continue;
        }
        if let Some(p) = sys.process(pid) {
            total += p.memory();
            count += 1;
        }
        for (child_pid, child) in sys.processes() {
            if child.parent() == Some(pid) {
                stack.push(*child_pid);
            }
        }
    }
    ((total as f64) / 1024.0 / 1024.0, count)
}

pub fn os_label() -> String {
    let name = System::name().unwrap_or_else(|| std::env::consts::OS.into());
    let ver = System::os_version().unwrap_or_default();
    format!("{name} {ver}").trim().to_string()
}

#[cfg(test)]
mod tests {
    #[test]
    fn mede_a_propria_memoria() {
        let (mb, n) = super::memory_tree_mb();
        assert!(n >= 1);
        assert!(mb > 0.0);
    }
}
