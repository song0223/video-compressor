use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::ImageReader;
use serde::{Deserialize, Serialize};
use tauri::State;
use webp::Encoder as WebpEncoder;

#[derive(Clone, Default)]
pub struct ImageJobState {
    inner: Arc<ImageJobStateInner>,
}

#[derive(Default)]
struct ImageJobStateInner {
    canceled: AtomicBool,
}

impl ImageJobState {
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
pub enum ImageExportFormat {
    #[serde(rename = "original")]
    Original,
    #[serde(rename = "jpeg")]
    Jpeg,
    #[serde(rename = "png")]
    Png,
    #[serde(rename = "webp")]
    Webp,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagePreset {
    pub format: ImageExportFormat,
    pub quality_percent: u8,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageMetadata {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub size_bytes: u64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageExportRequest {
    pub id: String,
    pub source_path: String,
    pub output_directory: String,
    pub preset: ImagePreset,
    #[serde(default)]
    pub custom_name: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageExportResult {
    pub output_path: String,
    pub output_size_bytes: u64,
}

fn image_format_label(format: Option<image::ImageFormat>) -> String {
    match format {
        Some(image::ImageFormat::Jpeg) => "jpeg",
        Some(image::ImageFormat::Png) => "png",
        Some(image::ImageFormat::WebP) => "webp",
        _ => "unknown",
    }
    .to_string()
}

fn clamp_quality_percent(quality_percent: u8) -> u8 {
    quality_percent.clamp(1, 99)
}

fn quality_suffix(quality_percent: u8) -> String {
    format!("q{}", clamp_quality_percent(quality_percent))
}

fn format_suffix(format: ImageExportFormat) -> &'static str {
    match format {
        ImageExportFormat::Original => "original",
        ImageExportFormat::Jpeg => "jpg",
        ImageExportFormat::Png => "png",
        ImageExportFormat::Webp => "webp",
    }
}

fn target_extension(format: ImageExportFormat, source_format: &str) -> &'static str {
    match format {
        ImageExportFormat::Original => match source_format {
            "jpeg" | "jpg" => "jpg",
            "png" => "png",
            "webp" => "webp",
            _ => "png",
        },
        ImageExportFormat::Jpeg => "jpg",
        ImageExportFormat::Png => "png",
        ImageExportFormat::Webp => "webp",
    }
}

fn effective_export_format(preset: &ImagePreset) -> ImageExportFormat {
    if clamp_quality_percent(preset.quality_percent) <= 10
        && preset.format == ImageExportFormat::Original
    {
        ImageExportFormat::Webp
    } else {
        preset.format
    }
}

fn jpeg_quality(quality_percent: u8) -> u8 {
    clamp_quality_percent(quality_percent)
}

fn webp_quality(quality_percent: u8) -> f32 {
    f32::from(clamp_quality_percent(quality_percent))
}

fn max_long_edge_for_quality(quality_percent: u8) -> Option<u32> {
    match clamp_quality_percent(quality_percent) {
        1..=10 => Some(1280),
        11..=40 => Some(1920),
        41..=60 => Some(2560),
        61..=80 => Some(3200),
        _ => None,
    }
}

fn prepare_image_for_quality(
    image: image::DynamicImage,
    quality_percent: u8,
) -> image::DynamicImage {
    let Some(max_long_edge) = max_long_edge_for_quality(quality_percent) else {
        return image;
    };
    let long_edge = image.width().max(image.height());
    if long_edge <= max_long_edge {
        return image;
    }

    image.resize(max_long_edge, max_long_edge, FilterType::Lanczos3)
}

fn encode_jpeg(
    image: &image::DynamicImage,
    output_path: &Path,
    quality_percent: u8,
) -> Result<(), String> {
    let file = fs::File::create(output_path).map_err(|error| format!("无法创建输出文件: {error}"))?;
    let rgb = image.to_rgb8();
    let mut encoder = JpegEncoder::new_with_quality(file, jpeg_quality(quality_percent));
    encoder
        .encode(
            &rgb,
            rgb.width(),
            rgb.height(),
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|error| format!("JPG 导出失败: {error}"))
}

fn encode_webp(
    image: &image::DynamicImage,
    output_path: &Path,
    quality_percent: u8,
) -> Result<(), String> {
    let rgba = image.to_rgba8();
    let encoder = WebpEncoder::from_rgba(&rgba, rgba.width(), rgba.height());
    let encoded = encoder.encode(webp_quality(quality_percent));
    fs::write(output_path, &*encoded).map_err(|error| format!("WebP 导出失败: {error}"))
}

pub fn generate_image_output_path(
    input_path: &Path,
    output_directory: &Path,
    preset: &ImagePreset,
    source_format: &str,
    custom_name: Option<&str>,
) -> PathBuf {
    let output_format = effective_export_format(preset);
    let base_name = if let Some(name) = custom_name {
        if !name.is_empty() {
            name.to_string()
        } else {
            let stem = input_path
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("image");
            format!(
                "{}_{}_{}",
                stem,
                format_suffix(output_format),
                quality_suffix(preset.quality_percent)
            )
        }
    } else {
        let stem = input_path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("image");
        format!(
            "{}_{}_{}",
            stem,
            format_suffix(output_format),
            quality_suffix(preset.quality_percent)
        )
    };
    let extension = target_extension(output_format, source_format);
    let mut candidate = output_directory.join(format!("{base_name}.{extension}"));
    let mut index = 1;

    while candidate.exists() {
        candidate = output_directory.join(format!("{base_name}-{index}.{extension}"));
        index += 1;
    }

    candidate
}

pub fn read_image_metadata(path: &Path) -> Result<ImageMetadata, String> {
    let reader = ImageReader::open(path)
        .map_err(|error| format!("无法打开图片: {error}"))?
        .with_guessed_format()
        .map_err(|error| format!("无法识别图片格式: {error}"))?;
    let format = image_format_label(reader.format());
    let image = reader
        .decode()
        .map_err(|error| format!("无法读取图片内容: {error}"))?;
    let metadata = fs::metadata(path).map_err(|error| format!("无法读取文件大小: {error}"))?;

    Ok(ImageMetadata {
        width: image.width(),
        height: image.height(),
        format,
        size_bytes: metadata.len(),
    })
}

fn export_image_blocking(request: ImageExportRequest, state: ImageJobState) -> Result<ImageExportResult, String> {
    state.reset();
    let input_path = PathBuf::from(&request.source_path);
    let metadata = read_image_metadata(&input_path)?;
    let output_directory = PathBuf::from(&request.output_directory);
    fs::create_dir_all(&output_directory).map_err(|error| format!("无法创建输出目录: {error}"))?;
    let output_path = generate_image_output_path(
        &input_path,
        &output_directory,
        &request.preset,
        &metadata.format,
        request.custom_name.as_deref(),
    );

    if state.is_canceled() {
        return Err("导出已取消".to_string());
    }

    let image = image::open(&input_path).map_err(|error| format!("无法打开图片: {error}"))?;
    let image = prepare_image_for_quality(image, request.preset.quality_percent);

    if state.is_canceled() {
        return Err("导出已取消".to_string());
    }

    match effective_export_format(&request.preset) {
        ImageExportFormat::Jpeg => {
            encode_jpeg(&image, &output_path, request.preset.quality_percent)?
        }
        ImageExportFormat::Png => image
            .save_with_format(&output_path, image::ImageFormat::Png)
            .map_err(|error| format!("PNG 导出失败: {error}"))?,
        ImageExportFormat::Webp => {
            encode_webp(&image, &output_path, request.preset.quality_percent)?
        }
        ImageExportFormat::Original => match metadata.format.as_str() {
            "jpeg" | "jpg" => encode_jpeg(&image, &output_path, request.preset.quality_percent)?,
            "webp" => encode_webp(&image, &output_path, request.preset.quality_percent)?,
            _ => image
                .save_with_format(&output_path, image::ImageFormat::Png)
                .map_err(|error| format!("PNG 导出失败: {error}"))?,
        },
    }

    let output_size_bytes = fs::metadata(&output_path)
        .map_err(|error| format!("无法读取输出文件大小: {error}"))?
        .len();

    Ok(ImageExportResult {
        output_path: output_path.to_string_lossy().to_string(),
        output_size_bytes,
    })
}

#[tauri::command]
pub async fn get_image_metadata(path: String) -> Result<ImageMetadata, String> {
    tauri::async_runtime::spawn_blocking(move || read_image_metadata(Path::new(&path)))
        .await
        .map_err(|error| format!("读取图片信息任务异常结束: {error}"))?
}

#[tauri::command]
pub async fn export_image(
    request: ImageExportRequest,
    state: State<'_, ImageJobState>,
) -> Result<ImageExportResult, String> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || export_image_blocking(request, state))
        .await
        .map_err(|error| format!("图片导出任务异常结束: {error}"))?
}

#[tauri::command]
pub fn cancel_current_image_export(state: State<'_, ImageJobState>) -> Result<(), String> {
    state.mark_canceled();
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;

    use image::codecs::jpeg::JpegEncoder;
    use image::{ImageBuffer, Rgb};

    use super::{
        export_image_blocking, generate_image_output_path, ImageExportFormat, ImageExportRequest,
        ImageJobState, ImagePreset,
    };

    #[test]
    fn output_path_uses_image_suffix_and_requested_extension() {
        let path = generate_image_output_path(
            Path::new("/tmp/photo.jpg"),
            Path::new("/tmp"),
            &ImagePreset {
                format: ImageExportFormat::Webp,
                quality_percent: 60,
            },
            "jpeg",
            None,
        );

        assert_eq!(path.file_name().unwrap(), "photo_webp_q60.webp");
    }

    #[test]
    fn original_format_keeps_source_extension() {
        let path = generate_image_output_path(
            Path::new("/tmp/photo.png"),
            Path::new("/tmp"),
            &ImagePreset {
                format: ImageExportFormat::Original,
                quality_percent: 80,
            },
            "png",
            None,
        );

        assert_eq!(path.file_name().unwrap(), "photo_original_q80.png");
    }

    #[test]
    fn output_path_uses_extreme_quality_suffix() {
        let path = generate_image_output_path(
            Path::new("/tmp/photo.jpg"),
            Path::new("/tmp"),
            &ImagePreset {
                format: ImageExportFormat::Webp,
                quality_percent: 10,
            },
            "jpeg",
            None,
        );

        assert_eq!(path.file_name().unwrap(), "photo_webp_q10.webp");
    }

    #[test]
    fn original_format_uses_webp_when_quality_is_extreme() {
        let path = generate_image_output_path(
            Path::new("/tmp/photo.png"),
            Path::new("/tmp"),
            &ImagePreset {
                format: ImageExportFormat::Original,
                quality_percent: 10,
            },
            "png",
            None,
        );

        assert_eq!(path.file_name().unwrap(), "photo_webp_q10.webp");
    }

    #[test]
    fn webp_small_export_does_not_expand_a_small_jpeg_photo() {
        let temp_dir = std::env::temp_dir().join(format!(
            "video-compressor-image-webp-test-{}",
            std::process::id()
        ));
        fs::create_dir_all(&temp_dir).unwrap();
        let input_path = temp_dir.join("photo.jpg");
        let image = ImageBuffer::from_fn(320, 240, |x, y| {
            Rgb([
                ((x * 3 + y) % 255) as u8,
                ((x + y * 2) % 255) as u8,
                ((x * 2 + y * 3) % 255) as u8,
            ])
        });
        let file = fs::File::create(&input_path).unwrap();
        let mut encoder = JpegEncoder::new_with_quality(file, 82);
        encoder
            .encode(&image, image.width(), image.height(), image::ExtendedColorType::Rgb8)
            .unwrap();
        let input_size = fs::metadata(&input_path).unwrap().len();

        let result = export_image_blocking(ImageExportRequest {
            id: "image-1".to_string(),
            source_path: input_path.to_string_lossy().to_string(),
            output_directory: temp_dir.to_string_lossy().to_string(),
            preset: ImagePreset {
                format: ImageExportFormat::Webp,
                quality_percent: 40,
            },
            custom_name: None,
        }, ImageJobState::default())
        .unwrap();

        fs::remove_dir_all(&temp_dir).unwrap();
        assert!(result.output_size_bytes < input_size);
    }

    #[test]
    fn small_webp_export_limits_large_images_and_cuts_size() {
        let temp_dir = std::env::temp_dir().join(format!(
            "video-compressor-image-small-resize-test-{}",
            std::process::id()
        ));
        fs::create_dir_all(&temp_dir).unwrap();
        let input_path = temp_dir.join("large-photo.jpg");
        let image = ImageBuffer::from_fn(3200, 2200, |x, y| {
            Rgb([
                ((x * 3 + y) % 255) as u8,
                ((x + y * 2) % 255) as u8,
                ((x * 2 + y * 3) % 255) as u8,
            ])
        });
        let file = fs::File::create(&input_path).unwrap();
        let mut encoder = JpegEncoder::new_with_quality(file, 92);
        encoder
            .encode(&image, image.width(), image.height(), image::ExtendedColorType::Rgb8)
            .unwrap();
        let input_size = fs::metadata(&input_path).unwrap().len();

        let result = export_image_blocking(ImageExportRequest {
            id: "image-1".to_string(),
            source_path: input_path.to_string_lossy().to_string(),
            output_directory: temp_dir.to_string_lossy().to_string(),
            preset: ImagePreset {
                format: ImageExportFormat::Webp,
                quality_percent: 40,
            },
            custom_name: None,
        }, ImageJobState::default())
        .unwrap();
        let output = image::open(&result.output_path).unwrap();

        fs::remove_dir_all(&temp_dir).unwrap();
        assert_eq!(output.width().max(output.height()), 1920);
        assert!(result.output_size_bytes < input_size / 2);
    }

    #[test]
    fn extreme_webp_export_limits_the_long_edge_for_large_images() {
        let temp_dir = std::env::temp_dir().join(format!(
            "video-compressor-image-extreme-resize-test-{}",
            std::process::id()
        ));
        fs::create_dir_all(&temp_dir).unwrap();
        let input_path = temp_dir.join("large-photo.jpg");
        let image = ImageBuffer::from_fn(2400, 1600, |x, y| {
            Rgb([
                ((x * 3 + y) % 255) as u8,
                ((x + y * 2) % 255) as u8,
                ((x * 2 + y * 3) % 255) as u8,
            ])
        });
        let file = fs::File::create(&input_path).unwrap();
        let mut encoder = JpegEncoder::new_with_quality(file, 90);
        encoder
            .encode(&image, image.width(), image.height(), image::ExtendedColorType::Rgb8)
            .unwrap();
        let input_size = fs::metadata(&input_path).unwrap().len();

        let result = export_image_blocking(ImageExportRequest {
            id: "image-1".to_string(),
            source_path: input_path.to_string_lossy().to_string(),
            output_directory: temp_dir.to_string_lossy().to_string(),
            preset: ImagePreset {
                format: ImageExportFormat::Webp,
                quality_percent: 10,
            },
            custom_name: None,
        }, ImageJobState::default())
        .unwrap();
        let output = image::open(&result.output_path).unwrap();

        fs::remove_dir_all(&temp_dir).unwrap();
        assert_eq!(output.width().max(output.height()), 1280);
        assert!(result.output_size_bytes < input_size);
        assert!(result.output_size_bytes < 700 * 1024);
    }

    #[test]
    fn output_path_uses_custom_quality_percent_suffix() {
        let path = generate_image_output_path(
            Path::new("/tmp/photo.jpg"),
            Path::new("/tmp"),
            &ImagePreset {
                format: ImageExportFormat::Webp,
                quality_percent: 37,
            },
            "jpeg",
            None,
        );

        assert_eq!(path.file_name().unwrap(), "photo_webp_q37.webp");
    }

    #[test]
    fn output_path_uses_custom_name_when_provided() {
        let path = generate_image_output_path(
            Path::new("/tmp/photo.jpg"),
            Path::new("/tmp"),
            &ImagePreset {
                format: ImageExportFormat::Webp,
                quality_percent: 60,
            },
            "jpeg",
            Some("my_photo"),
        );

        assert_eq!(path.file_name().unwrap(), "my_photo.webp");
    }
}
