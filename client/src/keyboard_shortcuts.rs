use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Emitter, Listener, Manager, Window};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

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
    app_handle
        .global_shortcut()
        .on_shortcut(shortcut.clone(), move |_app, _window, _shortcut| {
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

#[tauri::command]
pub async fn register_shortcut(window: Window, shortcut_str: String) -> Result<(), String> {
    let app = window.app_handle();

    let mods = if shortcut_str.contains("Alt") {
        Some(Modifiers::ALT)
    } else if shortcut_str.contains("Ctrl") || shortcut_str.contains("Command") {
        Some(Modifiers::CONTROL)
    } else if shortcut_str.contains("Shift") {
        Some(Modifiers::SHIFT)
    } else {
        None
    };

    let key = match shortcut_str.chars().last() {
        Some('T') => Code::KeyT,
        Some('S') => Code::KeyS,
        Some('C') => Code::KeyC,
        _ => return Err("Unsupported key".to_string()),
    };

    let shortcut = Shortcut::new(mods, key);

    app.global_shortcut()
        .register(shortcut)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn unregister_shortcut(window: Window, shortcut_str: String) -> Result<(), String> {
    let app = window.app_handle();

    let mods = if shortcut_str.contains("Alt") {
        Some(Modifiers::ALT)
    } else if shortcut_str.contains("Ctrl") || shortcut_str.contains("Command") {
        Some(Modifiers::CONTROL)
    } else if shortcut_str.contains("Shift") {
        Some(Modifiers::SHIFT)
    } else {
        None
    };

    let key = match shortcut_str.chars().last() {
        Some('T') => Code::KeyT,
        Some('S') => Code::KeyS,
        Some('C') => Code::KeyC,
        _ => return Err("Unsupported key".to_string()),
    };

    let shortcut = Shortcut::new(mods, key);

    app.global_shortcut()
        .unregister(shortcut)
        .map_err(|e| e.to_string())?;

    Ok(())
}
