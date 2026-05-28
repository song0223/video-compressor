import type { VideoMetadata, VideoPreset } from "../types/video";
import { resolutionPresets } from "./presets";
import { formatBytes } from "./format";

const qualitySizeFactors: Record<VideoPreset["quality"], number> = {
  small: 0.42,
  balanced: 0.62,
  high: 0.82,
};

const qualitySpeedFactors: Record<VideoPreset["quality"], number> = {
  small: 1.15,
  balanced: 1,
  high: 0.68,
};

const resolutionSpeedMultipliers: Record<VideoPreset["resolution"], number> = {
  "480p": 42,
  "720p": 32,
  "1080p": 20,
  "2k": 10,
  "4k": 4,
  original: 12,
};

function resolutionSizeFactor(metadata: VideoMetadata, preset: VideoPreset): number {
  const resolution = resolutionPresets.find((item) => item.id === preset.resolution);
  if (!resolution?.height || metadata.height <= 0) return 1;

  const heightRatio = Math.min(resolution.height / metadata.height, 1);
  return Math.max(heightRatio * heightRatio, 0.04);
}

export function estimateOutputSizeBytes(metadata: VideoMetadata, preset: VideoPreset): number {
  const estimated = metadata.sizeBytes * resolutionSizeFactor(metadata, preset) * qualitySizeFactors[preset.quality];
  return Math.max(Math.round(estimated), 1024 * 1024);
}

export function estimateExportDurationSeconds(metadata: VideoMetadata, preset: VideoPreset): number {
  if (metadata.durationSeconds <= 0) return 0;

  const speedMultiplier =
    resolutionSpeedMultipliers[preset.resolution] * qualitySpeedFactors[preset.quality];

  return Math.max(8, Math.round(metadata.durationSeconds / speedMultiplier));
}

export function compressionSavedPercent(originalBytes: number, outputBytes: number): number {
  if (originalBytes <= 0 || outputBytes < 0) return 0;
  return Math.max(0, Math.round((1 - outputBytes / originalBytes) * 100));
}

export function formatCompressionSummary(originalBytes: number, outputBytes: number): string {
  return `${formatBytes(originalBytes)} -> ${formatBytes(outputBytes)}，节省 ${compressionSavedPercent(
    originalBytes,
    outputBytes,
  )}%`;
}
