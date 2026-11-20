// Em release, esconde o console preto do Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ias_nexus_lib::run();
}
