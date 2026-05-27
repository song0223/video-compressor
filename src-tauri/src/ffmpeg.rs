use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Deserialize;

use crate::models::{ExportPreset, ProgressSnapshot, QualityPreset, ResolutionPreset, VideoMetadata};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct QualitySettings {
    pub crf: u8,
    pub encoder_preset: &'static str,
    pub max_threads: u8,
}

pub fn scale_filter(resolution: &ResolutionPreset) -> Option<String> {
    let height = match resolution {
        ResolutionPreset::P480 => 480,
        ResolutionPreset::P720 => 720,
        ResolutionPreset::P1080 => 1080,
        ResolutionPreset::TwoK => 1440,
        ResolutionPreset::FourK => 2160,
        ResolutionPreset::Original => return None,
    };

    Some(format!("scale=-2:{height}"))
}

pub fn quality_settings(quality: &QualityPreset) -> QualitySettings {
    match quality {
        QualityPreset::Small => QualitySettings {
            crf: 26,
            encoder_preset: "veryfast",
            max_threads: 4,
        },
        QualityPreset::Balanced => QualitySettings {
            crf: 22,
            encoder_preset: "veryfast",
            max_threads: 4,
        },
        QualityPreset::High => QualitySettings {
            crf: 18,
            encoder_preset: "veryfast",
            max_threads: 4,
        },
    }
}

pub fn build_ffmpeg_args(input_path: &Path, output_path: &Path, preset: &ExportPreset) -> Vec<String> {
    let quality = quality_settings(&preset.quality);
    let mut args = vec![
        "-hide_banner".to_string(),
        "-y".to_string(),
        "-i".to_string(),
        input_path.to_string_lossy().to_string(),
    ];

    if let Some(filter) = scale_filter(&preset.resolution) {
        args.push("-vf".to_string());
        args.push(filter);
    }

    args.extend([
        "-c:v".to_string(),
        "libx264".to_string(),
        "-preset".to_string(),
        quality.encoder_preset.to_string(),
        "-crf".to_string(),
        quality.crf.to_string(),
        "-threads".to_string(),
        quality.max_threads.to_string(),
        "-c:a".to_string(),
        "copy".to_string(),
        "-movflags".to_string(),
        "+faststart".to_string(),
        output_path.to_string_lossy().to_string(),
    ]);

    args
}

fn command_from_path_or_name(name: &str) -> PathBuf {
    if let Some(path) = bundled_binary_path(name) {
        return path;
    }

    PathBuf::from(name)
}

fn bundled_binary_path(name: &str) -> Option<PathBuf> {
    let platform = if cfg!(windows) { "windows" } else { "macos" };
    let file_name = if cfg!(windows) && !name.ends_with(".exe") {
        format!("{name}.exe")
    } else {
        name.to_string()
    };

    let mut candidates = Vec::new();
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        candidates.push(PathBuf::from(manifest_dir).join("binaries").join(platform).join(&file_name));
    }
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("../Resources/binaries").join(platform).join(&file_name));
            candidates.push(exe_dir.join("resources/binaries").join(platform).join(&file_name));
            candidates.push(exe_dir.join("binaries").join(platform).join(&file_name));
        }
    }

    candidates.into_iter().find(|path| path.exists())
}

pub fn ffprobe_path() -> PathBuf {
    command_from_path_or_name(if cfg!(windows) { "ffprobe.exe" } else { "ffprobe" })
}

pub fn ffmpeg_path() -> PathBuf {
    command_from_path_or_name(if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" })
}

pub fn parse_progress_update(progress_text: &str, duration_seconds: f64) -> ProgressSnapshot {
    let mut out_time_ms = None;
    let mut output_size_bytes = None;
    let mut speed_text = None;
    let mut speed_multiplier = None;

    for line in progress_text.lines() {
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };

        match key {
            "out_time_ms" => out_time_ms = value.parse::<f64>().ok(),
            "total_size" => output_size_bytes = value.parse::<u64>().ok(),
            "speed" => {
                if value != "N/A" {
                    speed_text = Some(value.to_string());
                    speed_multiplier = value.trim_end_matches('x').parse::<f64>().ok();
                }
            }
            _ => {}
        }
    }

    let encoded_seconds = out_time_ms.map(|value| value / 1_000_000.0);
    let percent = out_time_ms
        .filter(|_| duration_seconds > 0.0)
        .map(|value| (value / 1_000_000.0 / duration_seconds).clamp(0.0, 1.0))
        .unwrap_or(0.0);
    let eta_seconds = encoded_seconds
        .zip(speed_multiplier)
        .filter(|(_, speed)| duration_seconds > 0.0 && *speed > 0.0)
        .map(|(encoded, speed)| (duration_seconds - encoded).max(0.0) / speed);

    ProgressSnapshot {
        percent,
        output_size_bytes,
        speed_text,
        eta_seconds,
    }
}

#[derive(Deserialize)]
struct FfprobeOutput {
    streams: Vec<FfprobeStream>,
    format: Option<FfprobeFormat>,
}

#[derive(Deserialize)]
struct FfprobeStream {
    codec_name: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    duration: Option<String>,
}

#[derive(Deserialize)]
struct FfprobeFormat {
    duration: Option<String>,
}

pub fn read_video_metadata(path: &Path) -> Result<VideoMetadata, String> {
    let output = Command::new(ffprobe_path())
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=codec_name,width,height,duration:format=duration",
            "-of",
            "json",
        ])
        .arg(path)
        .output()
        .map_err(|error| format!("无法运行 ffprobe: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe 读取失败: {stderr}"));
    }

    let parsed: FfprobeOutput = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("ffprobe 输出解析失败: {error}"))?;
    let stream = parsed
        .streams
        .first()
        .ok_or_else(|| "没有找到视频流".to_string())?;
    let metadata = fs::metadata(path).map_err(|error| format!("无法读取文件大小: {error}"))?;
    let duration_seconds = stream
        .duration
        .as_ref()
        .or(parsed.format.as_ref().and_then(|format| format.duration.as_ref()))
        .and_then(|duration| duration.parse::<f64>().ok())
        .unwrap_or(0.0);

    Ok(VideoMetadata {
        width: stream.width.unwrap_or(0),
        height: stream.height.unwrap_or(0),
        duration_seconds,
        codec: stream.codec_name.clone().unwrap_or_else(|| "unknown".to_string()),
        size_bytes: metadata.len(),
    })
}

#[tauri::command]
pub async fn get_video_metadata(path: String) -> Result<VideoMetadata, String> {
    tauri::async_runtime::spawn_blocking(move || read_video_metadata(Path::new(&path)))
        .await
        .map_err(|error| format!("读取视频信息任务异常结束: {error}"))?
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use crate::ffmpeg::{build_ffmpeg_args, quality_settings, scale_filter};
    use crate::models::{ExportPreset, QualityPreset, ResolutionPreset};

    #[test]
    fn p720_uses_height_720_scale_filter() {
        assert_eq!(scale_filter(&ResolutionPreset::P720), Some("scale=-2:720".to_string()));
    }

    #[test]
    fn two_k_uses_height_1440_scale_filter() {
        assert_eq!(scale_filter(&ResolutionPreset::TwoK), Some("scale=-2:1440".to_string()));
    }

    #[test]
    fn original_size_omits_scale_filter() {
        assert_eq!(scale_filter(&ResolutionPreset::Original), None);
    }

    #[test]
    fn small_size_uses_higher_crf_than_balanced() {
        assert!(quality_settings(&QualityPreset::Small).crf > quality_settings(&QualityPreset::Balanced).crf);
    }

    #[test]
    fn high_quality_uses_lower_crf_than_balanced() {
        assert!(quality_settings(&QualityPreset::High).crf < quality_settings(&QualityPreset::Balanced).crf);
    }

    #[test]
    fn command_builder_keeps_paths_as_separate_arguments() {
        let args = build_ffmpeg_args(
            Path::new("/tmp/source video.mov"),
            Path::new("/tmp/output video.mp4"),
            &ExportPreset {
                resolution: ResolutionPreset::P720,
                quality: QualityPreset::Balanced,
            },
        );

        assert!(args.contains(&"/tmp/source video.mov".to_string()));
        assert!(args.contains(&"/tmp/output video.mp4".to_string()));
        assert!(args.contains(&"scale=-2:720".to_string()));
    }

    #[test]
    fn command_builder_limits_encoder_threads() {
        let args = build_ffmpeg_args(
            Path::new("/tmp/source.mov"),
            Path::new("/tmp/output.mp4"),
            &ExportPreset {
                resolution: ResolutionPreset::P720,
                quality: QualityPreset::Balanced,
            },
        );

        let threads_index = args.iter().position(|arg| arg == "-threads").unwrap();
        assert_eq!(args.get(threads_index + 1), Some(&"4".to_string()));
    }

    #[test]
    fn progress_parser_reads_out_time_ms_against_duration() {
        let snapshot = crate::ffmpeg::parse_progress_update(
            "out_time_ms=5000000\ntotal_size=1048576\nspeed=2x\nprogress=continue",
            10.0,
        );

        assert_eq!(snapshot.percent, 0.5);
        assert_eq!(snapshot.output_size_bytes, Some(1_048_576));
        assert_eq!(snapshot.speed_text, Some("2x".to_string()));
        assert_eq!(snapshot.eta_seconds, Some(2.5));
    }

    #[test]
    fn progress_parser_clamps_percent_to_one() {
        let snapshot = crate::ffmpeg::parse_progress_update("out_time_ms=15000000", 10.0);

        assert_eq!(snapshot.percent, 1.0);
    }

    #[test]
    fn progress_parser_ignores_malformed_lines() {
        let snapshot = crate::ffmpeg::parse_progress_update("not-progress\nout_time_ms=nope", 10.0);

        assert_eq!(snapshot.percent, 0.0);
        assert_eq!(snapshot.output_size_bytes, None);
        assert_eq!(snapshot.speed_text, None);
        assert_eq!(snapshot.eta_seconds, None);
    }
}
