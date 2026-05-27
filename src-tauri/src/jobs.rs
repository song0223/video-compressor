use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::io::BufRead;

use tauri::{AppHandle, Emitter, State};

use crate::ffmpeg::{build_ffmpeg_args, ffmpeg_path, parse_progress_update};
use crate::models::{
    ExportPreset, ExportProgressEvent, ExportRequest, QualityPreset, ResolutionPreset,
};

#[derive(Default)]
pub struct JobState {
    current_pid: Mutex<Option<u32>>,
    canceled: AtomicBool,
}

impl JobState {
    pub fn set_current_pid(&self, pid: u32) {
        *self.current_pid.lock().expect("job pid mutex poisoned") = Some(pid);
        self.canceled.store(false, Ordering::SeqCst);
    }

    pub fn clear_current_pid(&self) {
        *self.current_pid.lock().expect("job pid mutex poisoned") = None;
    }

    pub fn current_pid(&self) -> Option<u32> {
        *self.current_pid.lock().expect("job pid mutex poisoned")
    }

    pub fn mark_canceled(&self) {
        self.canceled.store(true, Ordering::SeqCst);
    }

    pub fn is_canceled(&self) -> bool {
        self.canceled.load(Ordering::SeqCst)
    }
}

fn resolution_suffix(resolution: ResolutionPreset) -> &'static str {
    match resolution {
        ResolutionPreset::P480 => "480p",
        ResolutionPreset::P720 => "720p",
        ResolutionPreset::P1080 => "1080p",
        ResolutionPreset::TwoK => "2k",
        ResolutionPreset::FourK => "4k",
        ResolutionPreset::Original => "original",
    }
}

fn quality_suffix(quality: QualityPreset) -> &'static str {
    match quality {
        QualityPreset::Small => "small",
        QualityPreset::Balanced => "balanced",
        QualityPreset::High => "high",
    }
}

pub fn generate_output_path(input_path: &Path, output_directory: &Path, preset: &ExportPreset) -> PathBuf {
    let stem = input_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("video");
    let base_name = format!(
        "{}_{}_{}",
        stem,
        resolution_suffix(preset.resolution),
        quality_suffix(preset.quality)
    );
    let mut candidate = output_directory.join(format!("{base_name}.mp4"));
    let mut index = 1;

    while candidate.exists() {
        candidate = output_directory.join(format!("{base_name}-{index}.mp4"));
        index += 1;
    }

    candidate
}

fn ffmpeg_progress_args(input_path: &Path, output_path: &Path, preset: &ExportPreset) -> Vec<String> {
    let mut args = build_ffmpeg_args(input_path, output_path, preset);
    let output = args.pop().expect("ffmpeg args must include output path");
    args.push("-progress".to_string());
    args.push("pipe:1".to_string());
    args.push("-nostats".to_string());
    args.push(output);
    args
}

#[tauri::command]
pub fn export_video(
    app: AppHandle,
    state: State<'_, JobState>,
    request: ExportRequest,
) -> Result<String, String> {
    let input_path = PathBuf::from(&request.source_path);
    let output_path = generate_output_path(
        &input_path,
        Path::new(&request.output_directory),
        &request.preset,
    );
    let mut child = Command::new(ffmpeg_path())
        .args(ffmpeg_progress_args(&input_path, &output_path, &request.preset))
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("无法启动 ffmpeg: {error}"))?;

    state.set_current_pid(child.id());
    let stdout = child.stdout.take().ok_or_else(|| "无法读取 ffmpeg 进度".to_string())?;
    let reader = std::io::BufReader::new(stdout);

    for line in reader.lines() {
        let line = line.map_err(|error| format!("读取 ffmpeg 进度失败: {error}"))?;
        let snapshot = parse_progress_update(&line, request.duration_seconds);
        if snapshot.percent > 0.0 || snapshot.output_size_bytes.is_some() {
            let _ = app.emit(
                "export-progress",
                ExportProgressEvent {
                    id: request.id.clone(),
                    percent: snapshot.percent,
                    output_size_bytes: snapshot.output_size_bytes,
                },
            );
        }
    }

    let status = child
        .wait()
        .map_err(|error| format!("等待 ffmpeg 结束失败: {error}"))?;
    state.clear_current_pid();

    if state.is_canceled() {
        return Err("导出已取消".to_string());
    }

    if !status.success() {
        return Err(format!("ffmpeg 导出失败，退出码: {status}"));
    }

    Ok(output_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn cancel_current_export(state: State<'_, JobState>) -> Result<(), String> {
    state.mark_canceled();

    if let Some(pid) = state.current_pid() {
        #[cfg(windows)]
        let result = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .status();

        #[cfg(not(windows))]
        let result = Command::new("kill").arg("-TERM").arg(pid.to_string()).status();

        result.map_err(|error| format!("取消导出失败: {error}"))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;

    use crate::jobs::{generate_output_path, JobState};
    use crate::models::{ExportPreset, QualityPreset, ResolutionPreset};

    #[test]
    fn output_path_uses_preset_suffix_and_mp4_extension() {
        let path = generate_output_path(
            Path::new("/tmp/source.mov"),
            Path::new("/tmp"),
            &ExportPreset {
                resolution: ResolutionPreset::P720,
                quality: QualityPreset::Balanced,
            },
        );

        assert_eq!(path.file_name().unwrap(), "source_720p_balanced.mp4");
    }

    #[test]
    fn output_path_avoids_existing_files() {
        let temp_dir = std::env::temp_dir().join(format!("video-compressor-test-{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();
        fs::write(temp_dir.join("source_720p_balanced.mp4"), b"existing").unwrap();

        let path = generate_output_path(
            Path::new("/tmp/source.mov"),
            &temp_dir,
            &ExportPreset {
                resolution: ResolutionPreset::P720,
                quality: QualityPreset::Balanced,
            },
        );

        fs::remove_dir_all(&temp_dir).unwrap();
        assert_eq!(path.file_name().unwrap(), "source_720p_balanced-1.mp4");
    }

    #[test]
    fn cancel_state_marks_job_canceled() {
        let state = JobState::default();
        state.set_current_pid(1234);
        state.mark_canceled();

        assert!(state.is_canceled());
        assert_eq!(state.current_pid(), Some(1234));
    }
}
