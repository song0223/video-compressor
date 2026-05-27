use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
pub enum ResolutionPreset {
    #[serde(rename = "480p")]
    P480,
    #[serde(rename = "720p")]
    P720,
    #[serde(rename = "1080p")]
    P1080,
    #[serde(rename = "2k")]
    TwoK,
    #[serde(rename = "4k")]
    FourK,
    #[serde(rename = "original")]
    Original,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
pub enum QualityPreset {
    #[serde(rename = "small")]
    Small,
    #[serde(rename = "balanced")]
    Balanced,
    #[serde(rename = "high")]
    High,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
pub struct ExportPreset {
    pub resolution: ResolutionPreset,
    pub quality: QualityPreset,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoMetadata {
    pub width: u32,
    pub height: u32,
    pub duration_seconds: f64,
    pub codec: String,
    pub size_bytes: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressSnapshot {
    pub percent: f64,
    pub output_size_bytes: Option<u64>,
    pub speed_text: Option<String>,
    pub eta_seconds: Option<f64>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequest {
    pub id: String,
    pub source_path: String,
    pub output_directory: String,
    pub preset: ExportPreset,
    pub duration_seconds: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportProgressEvent {
    pub id: String,
    pub percent: f64,
    pub output_size_bytes: Option<u64>,
    pub speed_text: Option<String>,
    pub eta_seconds: Option<f64>,
}
