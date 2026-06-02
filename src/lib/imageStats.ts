import type { ImageMetadata, ImagePreset } from "../types/image";
import { formatBytes } from "./format";
import { clampImageQualityPercent } from "./imagePresets";

export const imageExtensions = ["jpg", "jpeg", "png", "webp"];

const formatFactors: Record<ImagePreset["format"], number> = {
  original: 1,
  jpeg: 0.78,
  png: 1.08,
  webp: 0.68,
};

function qualitySizeFactor(qualityPercent: number): number {
  const percent = clampImageQualityPercent(qualityPercent);
  return 0.14 + (percent / 99) * 0.68;
}

function maxLongEdgeForPercent(qualityPercent: number): number | undefined {
  const percent = clampImageQualityPercent(qualityPercent);
  if (percent <= 10) return 1280;
  if (percent <= 40) return 1920;
  if (percent <= 60) return 2560;
  if (percent <= 80) return 3200;
  return undefined;
}

function dimensionSizeFactor(metadata: ImageMetadata, qualityPercent: number): number {
  const maxLongEdge = maxLongEdgeForPercent(qualityPercent);
  if (maxLongEdge === undefined) return 1;
  const longEdge = Math.max(metadata.width, metadata.height);
  if (longEdge <= maxLongEdge || longEdge <= 0) return 1;
  const ratio = maxLongEdge / longEdge;
  return ratio * ratio;
}

export function isSupportedImage(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension ? imageExtensions.includes(extension) : false;
}

export function estimateImageOutputSizeBytes(metadata: ImageMetadata, preset: ImagePreset): number {
  const inputFormat = metadata.format.toLowerCase();
  const qualityPercent = clampImageQualityPercent(preset.qualityPercent);
  const targetFormat =
    qualityPercent <= 10 && preset.format === "original"
      ? "webp"
      : preset.format === "original"
        ? inputFormat
        : preset.format;
  const formatFactor = formatFactors[targetFormat as ImagePreset["format"]] ?? 0.8;
  const estimated =
    metadata.sizeBytes *
    qualitySizeFactor(qualityPercent) *
    formatFactor *
    dimensionSizeFactor(metadata, qualityPercent);
  return Math.max(Math.round(estimated), 16 * 1024);
}

export function compressionSavedPercent(originalBytes: number, outputBytes: number): number {
  if (originalBytes <= 0 || outputBytes < 0) return 0;
  return Math.max(0, Math.round((1 - outputBytes / originalBytes) * 100));
}

export function formatImageCompressionSummary(originalBytes: number, outputBytes: number): string {
  return `${formatBytes(originalBytes)} -> ${formatBytes(outputBytes)}，节省 ${compressionSavedPercent(
    originalBytes,
    outputBytes,
  )}%`;
}
