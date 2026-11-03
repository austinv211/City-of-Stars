/// How this copy was installed, for picking an update path. The updater can
/// replace an AppImage (Tauri sets `APPIMAGE` when running one) but not a
/// .deb, which the package manager owns, so the frontend links those to the
/// new release instead.
#[tauri::command]
fn install_kind() -> &'static str {
    if cfg!(target_os = "linux") {
        if std::env::var_os("APPIMAGE").is_some() {
            "appimage"
        } else {
            "deb"
        }
    } else {
        "native"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            #[cfg(desktop)]
            {
                _app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                _app.handle().plugin(tauri_plugin_process::init())?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![install_kind])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
