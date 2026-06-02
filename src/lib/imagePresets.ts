import type { ImageFormatPresetId, ImagePreset } from "../types/image";

export const imageFormatPresets: Array<{ id: ImageFormatPresetId; label: string }> = [
  { id: "original", label: "保持原格式" },
  { id: "jpeg", label: "JPG" },
  { id: "png", label: "PNG" },
  { id: "webp", label: "WebP" },
];

export const imageQualityPresets: Array<{ percent: number; label: string }> = [
  { percent: 80, label: "80%" },
  { percent: 60, label: "60%" },
  { percent: 40, label: "40%" },
  { percent: 10, label: "10%" },
];

export function clampImageQualityPercent(value: number): number {
  if (!Number.isFinite(value)) return 60;
  return Math.min(99, Math.max(1, Math.round(value)));
}

export function getDefaultImagePreset(): ImagePreset {
  return { format: "original", qualityPercent: 60 };
}
