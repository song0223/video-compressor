export type ResolutionPresetId = "480p" | "720p" | "1080p" | "2k" | "4k" | "original";
export type QualityPresetId = "small" | "balanced" | "high";
export type VideoFormatPresetId = "mp4" | "mov" | "mkv" | "webm";

export interface VideoPreset {
  resolution: ResolutionPresetId;
  quality: QualityPresetId;
  format: VideoFormatPresetId;
}

export interface VideoMetadata {
  width: number;
  height: number;
  durationSeconds: number;
  codec: string;
  sizeBytes: number;
}

export type QueueStatus = "waiting" | "running" | "paused" | "completed" | "failed" | "canceled";

export interface QueueProgress {
  percent: number;
  speedText?: string;
  etaSeconds?: number;
  outputSizeBytes?: number;
}

export interface QueueItem {
  id: string;
  sourcePath: string;
  fileName: string;
  metadata?: VideoMetadata;
  preset: VideoPreset;
  status: QueueStatus;
  progress: QueueProgress;
  outputPath?: string;
  errorMessage?: string;
}
