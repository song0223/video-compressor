use std::path::Path;

use crate::models::{ExportPreset, QualityPreset, ResolutionPreset};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct QualitySettings {
    pub crf: u8,
    pub encoder_preset: &'static str,
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
        },
        QualityPreset::Balanced => QualitySettings {
            crf: 22,
            encoder_preset: "veryfast",
        },
        QualityPreset::High => QualitySettings {
            crf: 18,
            encoder_preset: "faster",
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
        "-c:a".to_string(),
        "copy".to_string(),
        "-movflags".to_string(),
        "+faststart".to_string(),
        output_path.to_string_lossy().to_string(),
    ]);

    args
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
}
