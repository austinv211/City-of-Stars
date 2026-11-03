#[cfg(desktop)]
use tauri::Manager;

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
    let builder = tauri::Builder::default();

    // A cityofstars:// link opened while the app runs goes to that window,
    // not a second copy. Must be the first plugin registered; its deep-link
    // feature hands the URL on to the deep-link plugin.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }));

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            #[cfg(desktop)]
            {
                _app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                _app.handle().plugin(tauri_plugin_process::init())?;
            }
            // Installers register the scheme on Windows and for the .deb; an
            // AppImage (and a dev build) has no installer, so register at run.
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                _app.deep_link().register_all()?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![install_kind])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
