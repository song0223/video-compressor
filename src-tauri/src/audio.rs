use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::ffmpeg::{ffmpeg_path, ffprobe_path};

#[derive(Clone, Default)]
pub struct AudioJobState {
    inner: Arc<AudioJobStateInner>,
}

#[derive(Default)]
struct AudioJobStateInner {
    canceled: AtomicBool,
}

impl AudioJobState {
    pub fn mark_canceled(&self) {
        self.inner.canceled.store(true, Ordering::SeqCst);
    }

    pub fn is_canceled(&self) -> bool {
        self.inner.canceled.load(Ordering::SeqCst)
    }

    pub fn reset(&self) {
        self.inner.canceled.store(false, Ordering::SeqCst);
    }
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
pub enum AudioExportFormat {
    #[serde(rename = "mp3")]
    Mp3,
    #[serde(rename = "aac")]
    Aac,
    #[serde(rename = "flac")]
    Flac,
    #[serde(rename = "wav")]
    Wav,
    #[serde(rename = "ogg")]
    Ogg,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioPreset {
    pub format: AudioExportFormat,
    pub bitrate_kbps: u32,
    pub sample_rate: u32,
    pub normalize: bool,
    pub trim_start_ms: Option<u64>,
    pub trim_end_ms: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioMetadata {
    pub duration_seconds: f64,
    pub codec: String,
    pub bitrate_kbps: u32,
    pub sample_rate: u32,
    pub channels: u32,
    pub size_bytes: u64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioExportRequest {
    pub id: String,
    pub source_path: String,
    pub output_directory: String,
    pub preset: AudioPreset,
    #[serde(default)]
    pub custom_name: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioExportResult {
    pub output_path: String,
    pub output_size_bytes: u64,
}

#[derive(Deserialize)]
struct FfprobeAudioOutput {
    streams: Vec<FfprobeAudioStream>,
    format: Option<FfprobeAudioFormat>,
}

#[derive(Deserialize)]
struct FfprobeAudioStream {
    codec_name: Option<String>,
    sample_rate: Option<String>,
    channels: Option<u32>,
    bit_rate: Option<String>,
    duration: Option<String>,
}

#[derive(Deserialize)]
struct FfprobeAudioFormat {
    duration: Option<String>,
    #[allow(dead_code)]
    size: Option<String>,
}

pub fn read_audio_metadata(path: &Path) -> Result<AudioMetadata, String> {
    let output = Command::new(ffprobe_path())
        .args([
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=codec_name,sample_rate,channels,bit_rate:format=duration,size",
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

    let parsed: FfprobeAudioOutput = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("ffprobe 输出解析失败: {error}"))?;

    let stream = parsed
        .streams
        .first()
        .ok_or_else(|| "没有找到音频流".to_string())?;

    let metadata = fs::metadata(path).map_err(|error| format!("无法读取文件大小: {error}"))?;

    let duration_seconds = stream
        .duration
        .as_ref()
        .or(parsed.format.as_ref().and_then(|format| format.duration.as_ref()))
        .and_then(|duration| duration.parse::<f64>().ok())
        .unwrap_or(0.0);

    let bitrate_kbps = stream
        .bit_rate
        .as_ref()
        .and_then(|br| br.parse::<u64>().ok())
        .map(|br| (br / 1000) as u32)
        .unwrap_or(0);

    let sample_rate = stream
        .sample_rate
        .as_ref()
        .and_then(|sr| sr.parse::<u32>().ok())
        .unwrap_or(0);

    Ok(AudioMetadata {
        duration_seconds,
        codec: stream
            .codec_name
            .clone()
            .unwrap_or_else(|| "unknown".to_string()),
        bitrate_kbps,
        sample_rate,
        channels: stream.channels.unwrap_or(0),
        size_bytes: metadata.len(),
    })
}

fn format_extension(format: AudioExportFormat) -> &'static str {
    match format {
        AudioExportFormat::Mp3 => "mp3",
        AudioExportFormat::Aac => "aac",
        AudioExportFormat::Flac => "flac",
        AudioExportFormat::Wav => "wav",
        AudioExportFormat::Ogg => "ogg",
    }
}

pub fn generate_audio_output_path(
    input_path: &Path,
    output_directory: &Path,
    preset: &AudioPreset,
    custom_name: Option<&str>,
) -> PathBuf {
    let base_name = if let Some(name) = custom_name {
        if !name.is_empty() {
            name.to_string()
        } else {
            input_path
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("audio")
                .to_string()
        }
    } else {
        input_path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("audio")
            .to_string()
    };

    let extension = format_extension(preset.format);
    let mut candidate = output_directory.join(format!("{base_name}.{extension}"));
    let mut index = 1;

    while candidate.exists() {
        candidate = output_directory.join(format!("{base_name}-{index}.{extension}"));
        index += 1;
    }

    candidate
}

fn build_audio_ffmpeg_args(
    input_path: &Path,
    output_path: &Path,
    preset: &AudioPreset,
) -> Vec<String> {
    let mut args = vec![
        "-hide_banner".to_string(),
        "-y".to_string(),
        "-i".to_string(),
        input_path.to_string_lossy().to_string(),
    ];

    if let Some(start_ms) = preset.trim_start_ms {
        args.push("-ss".to_string());
        args.push(format!("{}", start_ms as f64 / 1000.0));
    }

    if let Some(end_ms) = preset.trim_end_ms {
        args.push("-to".to_string());
        args.push(format!("{}", end_ms as f64 / 1000.0));
    }

    if preset.normalize {
        args.push("-af".to_string());
        args.push("loudnorm=I=-16:TP=-1.5:LRA=11".to_string());
    }

    match preset.format {
        AudioExportFormat::Mp3 => {
            args.extend(["-c:a".to_string(), "libmp3lame".to_string()]);
            args.extend(["-b:a".to_string(), format!("{}k", preset.bitrate_kbps)]);
        }
        AudioExportFormat::Aac => {
            args.extend(["-c:a".to_string(), "aac".to_string()]);
            args.extend(["-b:a".to_string(), format!("{}k", preset.bitrate_kbps)]);
        }
        AudioExportFormat::Flac => {
            args.extend(["-c:a".to_string(), "flac".to_string()]);
        }
        AudioExportFormat::Wav => {
            args.extend(["-c:a".to_string(), "pcm_s16le".to_string()]);
        }
        AudioExportFormat::Ogg => {
            args.extend(["-c:a".to_string(), "libvorbis".to_string()]);
            args.extend(["-b:a".to_string(), format!("{}k", preset.bitrate_kbps)]);
        }
    }

    args.extend(["-ar".to_string(), preset.sample_rate.to_string()]);

    args.push(output_path.to_string_lossy().to_string());
    args
}

fn export_audio_blocking(
    request: AudioExportRequest,
    state: AudioJobState,
) -> Result<AudioExportResult, String> {
    state.reset();
    let input_path = PathBuf::from(&request.source_path);
    let _metadata = read_audio_metadata(&input_path)?;
    let output_directory = PathBuf::from(&request.output_directory);
    fs::create_dir_all(&output_directory).map_err(|error| format!("无法创建输出目录: {error}"))?;
    let output_path = generate_audio_output_path(
        &input_path,
        &output_directory,
        &request.preset,
        request.custom_name.as_deref(),
    );

    if state.is_canceled() {
        return Err("导出已取消".to_string());
    }

    let args = build_audio_ffmpeg_args(&input_path, &output_path, &request.preset);
    let output = Command::new(ffmpeg_path())
        .args(&args)
        .output()
        .map_err(|error| format!("无法启动 ffmpeg: {error}"))?;

    if state.is_canceled() {
        return Err("导出已取消".to_string());
    }

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("音频导出失败: {stderr}"));
    }

    let output_size_bytes = fs::metadata(&output_path)
        .map_err(|error| format!("无法读取输出文件大小: {error}"))?
        .len();

    Ok(AudioExportResult {
        output_path: output_path.to_string_lossy().to_string(),
        output_size_bytes,
    })
}

#[tauri::command]
pub async fn get_audio_metadata(path: String) -> Result<AudioMetadata, String> {
    tauri::async_runtime::spawn_blocking(move || read_audio_metadata(Path::new(&path)))
        .await
        .map_err(|error| format!("读取音频信息任务异常结束: {error}"))?
}

#[tauri::command]
pub async fn export_audio(
    request: AudioExportRequest,
    state: State<'_, AudioJobState>,
) -> Result<AudioExportResult, String> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || export_audio_blocking(request, state))
        .await
        .map_err(|error| format!("音频导出任务异常结束: {error}"))?
}

#[tauri::command]
pub fn cancel_current_audio_export(state: State<'_, AudioJobState>) -> Result<(), String> {
    state.mark_canceled();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn audio_output_path_uses_correct_extension() {
        let path = generate_audio_output_path(
            Path::new("/tmp/song.mp3"),
            Path::new("/tmp"),
            &AudioPreset {
                format: AudioExportFormat::Mp3,
                bitrate_kbps: 192,
                sample_rate: 44100,
                normalize: false,
                trim_start_ms: None,
                trim_end_ms: None,
            },
            None,
        );
        assert_eq!(path.extension().unwrap(), "mp3");
    }

    #[test]
    fn audio_output_path_uses_custom_name() {
        let path = generate_audio_output_path(
            Path::new("/tmp/song.mp3"),
            Path::new("/tmp"),
            &AudioPreset {
                format: AudioExportFormat::Flac,
                bitrate_kbps: 320,
                sample_rate: 44100,
                normalize: false,
                trim_start_ms: None,
                trim_end_ms: None,
            },
            Some("my_song"),
        );
        assert_eq!(path.file_name().unwrap(), "my_song.flac");
    }

    #[test]
    fn audio_output_path_aac_format() {
        let path = generate_audio_output_path(
            Path::new("/tmp/track.wav"),
            Path::new("/tmp"),
            &AudioPreset {
                format: AudioExportFormat::Aac,
                bitrate_kbps: 256,
                sample_rate: 48000,
                normalize: true,
                trim_start_ms: None,
                trim_end_ms: None,
            },
            None,
        );
        assert_eq!(path.file_name().unwrap(), "track.aac");
    }

    #[test]
    fn audio_output_path_ogg_format() {
        let path = generate_audio_output_path(
            Path::new("/tmp/podcast.mp3"),
            Path::new("/tmp"),
            &AudioPreset {
                format: AudioExportFormat::Ogg,
                bitrate_kbps: 128,
                sample_rate: 44100,
                normalize: false,
                trim_start_ms: None,
                trim_end_ms: None,
            },
            None,
        );
        assert_eq!(path.file_name().unwrap(), "podcast.ogg");
    }

    #[test]
    fn audio_output_path_wav_format() {
        let path = generate_audio_output_path(
            Path::new("/tmp/recording.flac"),
            Path::new("/tmp"),
            &AudioPreset {
                format: AudioExportFormat::Wav,
                bitrate_kbps: 320,
                sample_rate: 44100,
                normalize: false,
                trim_start_ms: None,
                trim_end_ms: None,
            },
            None,
        );
        assert_eq!(path.file_name().unwrap(), "recording.wav");
    }

    #[test]
    fn build_ffmpeg_args_for_mp3_with_bitrate() {
        let args = build_audio_ffmpeg_args(
            Path::new("/tmp/input.mp3"),
            Path::new("/tmp/output.mp3"),
            &AudioPreset {
                format: AudioExportFormat::Mp3,
                bitrate_kbps: 192,
                sample_rate: 44100,
                normalize: false,
                trim_start_ms: None,
                trim_end_ms: None,
            },
        );

        assert!(args.contains(&"-c:a".to_string()));
        assert!(args.contains(&"libmp3lame".to_string()));
        assert!(args.contains(&"192k".to_string()));
        assert!(args.contains(&"-ar".to_string()));
        assert!(args.contains(&"44100".to_string()));
    }

    #[test]
    fn build_ffmpeg_args_for_flac_no_bitrate() {
        let args = build_audio_ffmpeg_args(
            Path::new("/tmp/input.wav"),
            Path::new("/tmp/output.flac"),
            &AudioPreset {
                format: AudioExportFormat::Flac,
                bitrate_kbps: 320,
                sample_rate: 48000,
                normalize: false,
                trim_start_ms: None,
                trim_end_ms: None,
            },
        );

        assert!(args.contains(&"-c:a".to_string()));
        assert!(args.contains(&"flac".to_string()));
        assert!(!args.contains(&"320k".to_string()));
    }

    #[test]
    fn build_ffmpeg_args_with_normalize() {
        let args = build_audio_ffmpeg_args(
            Path::new("/tmp/input.mp3"),
            Path::new("/tmp/output.mp3"),
            &AudioPreset {
                format: AudioExportFormat::Mp3,
                bitrate_kbps: 192,
                sample_rate: 44100,
                normalize: true,
                trim_start_ms: None,
                trim_end_ms: None,
            },
        );

        assert!(args.contains(&"-af".to_string()));
        assert!(args.contains(&"loudnorm=I=-16:TP=-1.5:LRA=11".to_string()));
    }

    #[test]
    fn build_ffmpeg_args_with_trim() {
        let args = build_audio_ffmpeg_args(
            Path::new("/tmp/input.mp3"),
            Path::new("/tmp/output.mp3"),
            &AudioPreset {
                format: AudioExportFormat::Mp3,
                bitrate_kbps: 192,
                sample_rate: 44100,
                normalize: false,
                trim_start_ms: Some(1000),
                trim_end_ms: Some(5000),
            },
        );

        assert!(args.contains(&"-ss".to_string()));
        assert!(args.contains(&"1".to_string()));
        assert!(args.contains(&"-to".to_string()));
        assert!(args.contains(&"5".to_string()));
    }
}
