export type ImageFormatPresetId = "original" | "jpeg" | "png" | "webp";

export interface ImagePreset {
  format: ImageFormatPresetId;
  qualityPercent: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}

export type ImageQueueStatus = "waiting" | "running" | "completed" | "failed";

export interface ImageQueueProgress {
  percent: number;
  outputSizeBytes?: number;
}

export interface ImageQueueItem {
  id: string;
  sourcePath: string;
  fileName: string;
  metadata?: ImageMetadata;
  preset: ImagePreset;
  status: ImageQueueStatus;
  progress: ImageQueueProgress;
  outputPath?: string;
  errorMessage?: string;
}
