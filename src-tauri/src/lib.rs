pub mod ffmpeg;
pub mod images;
pub mod jobs;
pub mod models;
pub mod presets;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(jobs::JobState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            ffmpeg::get_video_metadata,
            images::get_image_metadata,
            images::export_image,
            jobs::export_video,
            jobs::cancel_current_export
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
