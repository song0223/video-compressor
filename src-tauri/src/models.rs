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
