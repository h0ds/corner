use tauri::{Manager, Emitter, Window, Listener};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, Modifiers, Code};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

fn send_test_sequence() -> Result<(), ()> {
    // Small delay to ensure key events are processed correctly
    std::thread::sleep(Duration::from_millis(20));
    // Simulate key sequence using Tauri's API
    // NOTE: Tauri does not provide a direct way to simulate key events.
    // You might need to use a different approach or a third-party library.
    Ok(())
}

pub fn init_shortcuts(app_handle: &tauri::AppHandle) {
    let running = Arc::new(AtomicBool::new(true));
    let app = app_handle.clone();

    // Register global shortcuts using Tauri's plugin API
    let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyT);
    if let Err(err) = app_handle.global_shortcut().register(shortcut.clone()) {
        eprintln!("Failed to register shortcut: {:?}", err);
        let _ = app.emit("keyboard-permission-needed", ());
        return;
    }

    // Set up the shortcut handler
    let app_clone = app.clone();
    app_handle.global_shortcut().on_shortcut(shortcut.clone(), move |_app, _window, _shortcut| {
        if let Err(emit_err) = app_clone.emit("shortcut-triggered", ()) {
            eprintln!("Failed to emit shortcut event: {:?}", emit_err);
        }
        // Simulate key sequence
        if let Err(e) = send_test_sequence() {
            eprintln!("Failed to simulate key sequence: {:?}", e);
        }
    });

    // Clean up when the app is shutting down
    let app_handle_clone = app_handle.clone();
    let running_clone = running.clone();
    
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.listen("tauri://close-requested", move |_event| {
            running_clone.store(false, Ordering::SeqCst);
            let _ = app_handle_clone.global_shortcut().unregister_all();
        });
    }
}
