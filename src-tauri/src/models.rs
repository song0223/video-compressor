use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
pub enum ResolutionPreset {
    P480,
    P720,
    P1080,
    TwoK,
    FourK,
    Original,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
pub enum QualityPreset {
    Small,
    Balanced,
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
}
